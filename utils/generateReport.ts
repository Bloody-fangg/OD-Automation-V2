import * as XLSX from 'xlsx';
import { EventMetadata, GroupedStudentData, StudentWithMissedLectures } from '@/types/od';

/**
 * Generates Excel report with metadata and student data
 * @param metadata - Event metadata
 * @param groupedData - Students grouped by program-section
 * @returns Base64 encoded Excel file
 */
export function generateReport(
  metadata: EventMetadata,
  groupedData: GroupedStudentData[]
): string {
  console.log('📊 Generating Excel report...');
  
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Create metadata sheet
  const metadataSheet = createMetadataSheet(metadata);
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Event Details');
  
  // Create student data sheet
  const dataSheet = createStudentDataSheet(groupedData);
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Students & Missed Lectures');
  
  // Generate Excel file as base64
  const excelBuffer = XLSX.write(workbook, { 
    type: 'array', 
    bookType: 'xlsx',
    compression: true 
  });
  
  const base64 = Buffer.from(excelBuffer).toString('base64');
  
  console.log('✅ Excel report generated successfully');
  console.log(`📏 Report size: ${Math.round(base64.length / 1024)} KB`);
  
  return base64;
}

/**
 * Creates metadata sheet with event details
 * @param metadata - Event metadata
 * @returns Excel worksheet
 */
function createMetadataSheet(metadata: EventMetadata): XLSX.WorkSheet {
  const data = [
    ['Event Name', metadata.eventName],
    ['Coordinator', metadata.coordinator],
    ['Event Date', metadata.eventDate],
    ['Day', metadata.day],
    ['Venue', metadata.eventVenue || metadata.place],
    ['Time', metadata.eventTime],
    ['Organizing Department', metadata.organizingDepartment],
    ['Faculty In-charge', metadata.facultyIncharge],
    ['Contact Details', metadata.contactDetails],
    [''],
    ['Report Generated On', new Date().toLocaleDateString()],
    ['Report Generated At', new Date().toLocaleTimeString()]
  ];
  
  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Creates student data sheet with missed lectures
 * @param groupedData - Students grouped by program-section
 * @returns Excel worksheet
 */
function createStudentDataSheet(groupedData: GroupedStudentData[]): XLSX.WorkSheet {
  const headers = [
    'Student Name',
    'Program', 
    'Section',
    'Semester',
    'Group',
    'Subject Code',
    'Subject Name',
    'Faculty Name',
    'Faculty Code',
    'Timing',
    'Day'
  ];
  
  const data = [headers];
  
  // Add student data - one row per missed lecture per student
  groupedData.forEach(group => {
    group.students.forEach(student => {
      if (student.missedLectures.length > 0) {
        student.missedLectures.forEach(lecture => {
          data.push([
            student.name,
            student.program,
            student.section,
            student.semester,
            student.group || '',
            lecture.subject_code,
            lecture.subject_name,
            lecture.faculty,
            lecture.faculty_code, // Empty for now
            lecture.time,
            lecture.day
          ]);
        });
      } else {
        // Add row for students with no missed lectures
        data.push([
          student.name,
          student.program,
          student.section,
          student.semester,
          student.group || '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);
      }
    });
  });
  
  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Generates dynamic filename for the report
 * @param metadata - Event metadata
 * @returns Filename string
 */
export function generateReportFilename(metadata: EventMetadata): string {
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
  
  const eventName = sanitize(metadata.eventName || 'OD Report');
  const eventDate = sanitize(metadata.eventDate || '');
  
  return `OD Report – ${eventName}${eventDate ? ` (${eventDate})` : ''}.xlsx`;
}

/**
 * Validates report data and returns warnings
 * @param metadata - Event metadata
 * @param groupedData - Students grouped by program-section
 * @returns Validation result with warnings
 */
export function validateReportData(
  metadata: EventMetadata,
  groupedData: GroupedStudentData[]
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check for missing metadata
  if (!metadata.eventName) warnings.push('Event name is missing');
  if (!metadata.eventDate) warnings.push('Event date is missing');
  if (!metadata.coordinator) warnings.push('Coordinator is missing');
  
  // Check for students with missed lectures
  const totalStudents = groupedData.reduce((sum, group) => sum + group.students.length, 0);
  const studentsWithMissedLectures = groupedData.reduce((sum, group) => 
    sum + group.students.filter(s => s.missedLectures.length > 0).length, 0
  );
  
  if (studentsWithMissedLectures === 0 && totalStudents > 0) {
    warnings.push('No students have missed lectures - this may indicate a timetable matching issue');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}
