'use server';

import * as XLSX from 'xlsx';
import { parseExcel } from '@/utils/parseExcel';
import { normalizeProgram, normalizeSection, normalizeSemester, groupStudentsByProgramSection } from '@/utils/normalizeData';
import { calculateMissedLectures, loadTimetable } from '@/utils/calculateOverlaps';
import { generateEmail } from '@/utils/generateEmail';
import { generateReport, generateReportFilename, validateReportData } from '@/utils/generateReport';
import { 
  EventMetadata, 
  Student, 
  StudentWithMissedLectures, 
  GroupedStudentData, 
  ProcessOdResponse,
  Timetable
} from '@/types/od';

// Configuration
const CONFIG = {
  // Default recipient email (hardcoded for now as requested)
  DEFAULT_RECIPIENT_EMAIL: 'amiarchive.in@gmail.com',
  
  // Maximum file size (5MB)
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  // Allowed file types
  ALLOWED_FILE_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/octet-stream' // Fallback
  ]
};

/**
 * Main server action for processing OD requests
 * @param formData - Form data containing the Excel file
 * @returns ProcessOdResponse with results or error
 */
export async function processOd(formData: FormData): Promise<ProcessOdResponse> {
  console.log('🚀 Starting OD processing...');
  
  try {
    // 1. Validate and get the uploaded file
    const file = await validateAndGetFile(formData);
    
    // 2. Parse the Excel file
    console.log('📊 Parsing Excel file...');
    const { metadata, students } = await parseExcel(file);
    
    // 3. Normalize student data
    console.log('🔄 Normalizing student data...');
    const normalizedStudents = students.map(student => ({
      ...student,
      section: normalizeSection(student.section),
      semester: normalizeSemester(student.semester),
      normalizedProgram: normalizeProgram(student.program)
    }));
    
    // 4. Load timetable data
    console.log('📚 Loading timetable data...');
    const timetable = await loadTimetable();
    
    // 5. Calculate missed lectures for each student
    console.log('⏳ Calculating missed lectures...');
    const studentsWithMissed = calculateMissedLectures(
      normalizedStudents,
      metadata.eventTime || '',
      metadata.eventDay || '',
      timetable
    );
    
    // 6. Group students by program-section
    console.log('👥 Grouping students...');
    const groupedStudents = groupStudents(studentsWithMissed);
    
    // 7. Generate email content
    console.log('📧 Generating email...');
    const email = generateEmail(metadata, groupedStudents);
    
    // 8. Generate report
    console.log('📊 Generating report...');
    const reportBase64 = generateReport(metadata, groupedStudents);
    const reportFilename = generateReportFilename(metadata);
    
    // 9. Validate report data
    const { isValid: isReportValid, warnings: reportWarnings } = validateReportData(metadata, groupedStudents);
    
    // 10. Prepare response
    const response: ProcessOdResponse = {
      success: true,
      metadata,
      studentsWithMissed,
      groupedStudents,
      email: {
        subject: email.subject,
        body: email.body,
        mailtoUrl: email.mailtoUrl
      },
      report: {
        base64: reportBase64,
        filename: reportFilename
      },
      warnings: reportWarnings.length > 0 ? reportWarnings : undefined,
      message: 'OD request processed successfully.'
    };
    
    console.log('✅ OD processing completed successfully');
    return response;
    
  } catch (error) {
    console.error('❌ Error processing OD request:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred while processing the OD request.',
      errors: [
        {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      ]
    };
  }
}

/**
 * Validates and extracts the uploaded file from form data
 * @param formData - Form data from the request
 * @returns The uploaded file
 * @throws Error if file is invalid
 */
async function validateAndGetFile(formData: FormData): Promise<File> {
  console.log('🔍 Validating uploaded file...');
  
  const file = formData.get('file') as File | null;
  
  if (!file) {
    throw new Error('No file was uploaded.');
  }
  
  // Validate file type
  if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload an Excel file (.xlsx or .xls).');
  }
  
  // Validate file size
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    throw new Error(`File is too large. Maximum size is ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }
  
  // Validate file name
  if (!file.name || !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    throw new Error('Invalid file name. File must have .xlsx or .xls extension.');
  }
  
  console.log(`✅ File validated: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  return file;
}

/**
 * Groups students by program and section
 * @param students - Array of students with missed lectures
 * @returns Array of grouped student data
 */
function groupStudents(students: StudentWithMissedLectures[]): GroupedStudentData[] {
  console.log('👥 Grouping students by program and section...');
  
  // Create a map to group students by program and section
  const groups = new Map<string, StudentWithMissedLectures[]>();
  
  students.forEach(student => {
    const groupKey = `${student.normalizedProgram} - ${student.section}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    
    groups.get(groupKey)?.push(student);
  });
  
  // Convert map to array of GroupedStudentData
  const result: GroupedStudentData[] = [];
  
  groups.forEach((students, groupKey) => {
    result.push({
      groupKey,
      students: [...students] // Create a new array to avoid reference issues
    });
  });
  
  // Sort groups by program and section
  result.sort((a, b) => {
    // First sort by program
    const programCompare = a.groupKey.localeCompare(b.groupKey);
    
    if (programCompare !== 0) {
      return programCompare;
    }
    
    // If same program, sort by section
    const sectionA = a.groupKey.match(/Section\s*(\w+)/i)?.[1] || '';
    const sectionB = b.groupKey.match(/Section\s*(\w+)/i)?.[1] || '';
    
    return sectionA.localeCompare(sectionB);
  });
  
  console.log(`📊 Grouped ${students.length} students into ${result.length} groups`);
  return result;
}

/**
 * Helper function to get the recipient email from environment variables
 * @returns The recipient email address
 */
function getRecipientEmail(): string {
  return process.env.OD_RECIPIENT_EMAIL || CONFIG.DEFAULT_RECIPIENT_EMAIL;
}

// Export types for better type safety
export type { ProcessOdResponse };

/**
 * Validates if the server action is being called in a server environment
 * This is a safety check to prevent client-side execution of server code
 * @throws Error if called on the client side
 */
function ensureServerSide() {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server side.');
  }
}
