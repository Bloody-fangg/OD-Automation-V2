"use server"

import * as XLSX from "xlsx"
import type { 
  ProcessResult, 
  EventMetadata, 
  Student, 
  ProcessingError,
  TimetableData 
} from '@/lib/types'
import { normalizeStudent, validateEventMetadata, validateStudent } from '@/lib/utils/normalize'
import { processStudentsWithMissedLectures, groupStudentsByProgramSection, sortGroups, calculateTotals } from '@/lib/utils/groupUtils'
import { generateEmailData } from '@/lib/utils/mailGenerator'
import { TIMETABLE_DATA } from '@/lib/excel-utils'
import { createServerAction } from '@/lib/utils/serialization'

/**
 * Main server action for processing OD requests
 * Parses Excel file, matches with timetable, and generates email data
 */
// Helper function to ensure all data is serializable
function ensureSerializable<T>(obj: T): T {
  const replacer = (key: string, value: any) => {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }
    // Handle Map, Set, and other non-serializable objects
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    if (value instanceof Set) {
      return Array.from(value);
    }
    // Handle undefined values (convert to null)
    if (value === undefined) {
      return null;
    }
    // Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString();
    }
    // Handle errors
    if (value instanceof Error) {
      return { 
        message: value.message,
        name: value.name,
        stack: value.stack 
      };
    }
    // Handle functions (ignore them)
    if (typeof value === 'function') {
      return undefined;
    }
    return value;
  };

  // First convert to JSON and back to handle circular references and non-serializable data
  const jsonString = JSON.stringify(obj, replacer);
  return JSON.parse(jsonString);
}

// Define the internal implementation
async function _processOdRequest(file: File): Promise<ProcessResult> {
  const startTime = Date.now()
  
  try {
    console.log('Starting OD processing for file:', file.name)
    
    // Step 1: Parse Excel file
    const { metadata, students } = await parseExcelFile(file)
    console.log('Excel parsed successfully:', { 
      eventName: metadata.eventName, 
      studentCount: students.length 
    })
    
    // Step 2: Validate metadata
    const metadataErrors = validateEventMetadata(metadata)
    if (metadataErrors.length > 0) {
      throw new Error(`Metadata validation failed: ${metadataErrors.map(e => e.message).join(', ')}`)
    }
    
    // Step 3: Process students and find missed lectures
    const { studentsWithMissed, unmatched } = processStudentsWithMissedLectures(
      students,
      metadata.day,
      metadata.eventTime,
      TIMETABLE_DATA
    )
    console.log('Students processed:', { 
      total: studentsWithMissed.length, 
      unmatched: unmatched.length 
    })
    
    // Step 4: Group students by program and section
    const grouped = groupStudentsByProgramSection(studentsWithMissed)
    const sortedGroups = sortGroups(grouped)
    console.log('Students grouped into', sortedGroups.length, 'groups')
    
    // Step 5: Generate email data
    const email = generateEmailData(metadata, sortedGroups)
    console.log('Email generated:', { 
      subjectLength: email.subject.length, 
      bodyLength: email.bodyLength 
    })
    
    // Step 6: Calculate totals
    const totals = calculateTotals(studentsWithMissed)
    
    const processingTime = Date.now() - startTime
    
    // Create the result object
    const result: ProcessResult = {
      metadata,
      studentsWithMissed,
      grouped: sortedGroups,
      email,
      unmatched,
      totalStudents: totals.totalStudents,
      totalMissedLectures: totals.totalMissedLectures,
      processingTime
    };
    
    console.log('OD processing completed successfully in', processingTime, 'ms')
    return result
    
  } catch (error) {
    console.error('OD processing failed:', error)
    // Log the full error object for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        // Include any additional properties from custom errors
        ...(error as any).details && { details: (error as any).details }
      });
    }
    
    // Create a properly serialized error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during processing';
    const serializedError = new Error(`Failed to process OD request: ${errorMessage}`);
    
    // Add a timestamp and error code for better debugging
    (serializedError as any).timestamp = new Date().toISOString();
    (serializedError as any).code = 'OD_PROCESSING_ERROR';
    
    // For non-production environments, include more details
    if (process.env.NODE_ENV !== 'production') {
      (serializedError as any).originalError = 
        error instanceof Error 
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error);
    }
    
    throw serializedError;
  }
}

// Export the server action with automatic serialization
export const processOdRequest = createServerAction(_processOdRequest);

/**
 * Parses Excel file and extracts metadata and student data
 */
async function parseExcelFile(file: File): Promise<{ metadata: EventMetadata; students: Student[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        console.log('Reading Excel file...')
        
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        if (jsonData.length < 10) {
          throw new Error("Excel file must contain event details (rows 2-8) and student data (row 10+)")
        }

        // Parse event metadata from rows 2-7 (1-indexed, so 1-6 in array)
        // Format: Column C contains labels, Column D contains values (based on the Excel image)
        const metadata: EventMetadata = {
          eventName: jsonData[1]?.[3] || "Unknown Event", // Row 2, Column D
          coordinator: jsonData[2]?.[3] || "Unknown Coordinator", // Row 3, Column D
          date: jsonData[3]?.[3] || new Date().toLocaleDateString(), // Row 4, Column D
          day: jsonData[4]?.[3] || "Monday", // Row 5, Column D
          place: jsonData[5]?.[3] || "Unknown Venue", // Row 6, Column D
          eventTime: jsonData[6]?.[3] || "9:00 AM" // Row 7, Column D
        }

        console.log('Event metadata parsed:', metadata)

        // Find student data starting from row 10 (index 9)
        const studentStartRow = 9 // Row 10 in Excel (0-indexed)
        if (!jsonData[studentStartRow]) {
          throw new Error("Could not find student data starting from row 10")
        }

        // Headers are in row 10 (index 9) - based on Excel image: C=Student Name, D=Program, E=Section, F=Semester
        const headers = jsonData[studentStartRow].map((h) => h?.toString().toLowerCase() || "")
        const nameIndex = headers.findIndex((h) => h.includes("student name") || h.includes("name"))
        const programIndex = headers.findIndex((h) => h.includes("program"))
        const sectionIndex = headers.findIndex((h) => h.includes("section"))
        const semesterIndex = headers.findIndex((h) => h.includes("semester"))

        // Fallback to column positions if headers not found (C=2, D=3, E=4, F=5)
        const finalNameIndex = nameIndex !== -1 ? nameIndex : 2
        const finalProgramIndex = programIndex !== -1 ? programIndex : 3
        const finalSectionIndex = sectionIndex !== -1 ? sectionIndex : 4
        const finalSemesterIndex = semesterIndex !== -1 ? semesterIndex : 5

        console.log('Column indices:', { finalNameIndex, finalProgramIndex, finalSectionIndex, finalSemesterIndex })

        const students: Student[] = []

                 // Parse students from row 11 onwards (index 10+)
         for (let i = studentStartRow + 1; i < jsonData.length; i++) {
           const row = jsonData[i]
           if (!row || !row[finalNameIndex] || !row[finalNameIndex].toString().trim()) continue

          const student = normalizeStudent(
            row[finalNameIndex]?.toString().trim() || "",
            row[finalProgramIndex]?.toString() || "",
            row[finalSectionIndex]?.toString() || "",
            row[finalSemesterIndex]?.toString() || ""
          )

          if (student.name && student.name.trim()) {
            // Validate student data
            const studentErrors = validateStudent(student)
            if (studentErrors.length > 0) {
              console.warn(`Student validation warnings for ${student.name}:`, studentErrors.map(e => e.message))
            }
            
            students.push(student)
          }
        }

        if (students.length === 0) {
          throw new Error("No valid student data found")
        }

        console.log('Students parsed:', students.length)
        resolve({ metadata, students })
        
             } catch (error) {
         const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while parsing Excel file"
         console.error('Excel parsing error:', error)
         reject(new Error(`Failed to parse Excel file: ${errorMessage}`))
       }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}

 