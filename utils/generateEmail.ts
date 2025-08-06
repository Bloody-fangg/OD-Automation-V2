import { EventMetadata, GroupedStudentData, StudentWithMissedLectures } from '@/types/od';

/**
 * Generates email subject, body, and mailto URL for OD request
 * @param metadata - Event metadata
 * @param groupedData - Students grouped by program-section
 * @returns Email object with subject, body, and mailto URL
 */
export function generateEmail(
  metadata: EventMetadata,
  groupedData: GroupedStudentData[]
): { subject: string; body: string; mailtoUrl: string } {
  console.log('📧 Generating email for OD request...');
  
  const subject = generateEmailSubject(metadata);
  const body = generateEmailBody(metadata, groupedData);
  const mailtoUrl = generateMailtoUrl(subject, body);
  
  console.log('✅ Email generation complete');
  console.log(`📋 Subject: ${subject}`);
  console.log(`📄 Body length: ${body.length} characters`);
  
  return { subject, body, mailtoUrl };
}

/**
 * Generates email subject line
 * @param metadata - Event metadata
 * @returns Email subject string
 */
function generateEmailSubject(metadata: EventMetadata): string {
  return `OD Request – ${metadata.eventName} (${metadata.eventDate})`;
}

/**
 * Generates email body with proper formatting and grouping
 * @param metadata - Event metadata
 * @param groupedData - Students grouped by program-section
 * @returns Email body string
 */
function generateEmailBody(metadata: EventMetadata, groupedData: GroupedStudentData[]): string {
  let body = `Dear Faculty,\n\n`;
  body += `I hope this email finds you well.\n\n`;
  body += `Please grant On Duty (OD) approval for the following students who participated in the event:\n\n`;
  
  // Event details
  body += `Event Name: ${metadata.eventName}\n`;
  body += `Coordinator: ${metadata.coordinator}\n`;
  body += `Date: ${metadata.eventDate}\n`;
  body += `Day: ${metadata.day}\n`;
  body += `Venue: ${metadata.eventVenue || metadata.place}\n`;
  body += `Time: ${metadata.eventTime}\n\n`;
  
  // Group students by program-section and list participants
  body += `Participants:\n`;
  groupedData.forEach(group => {
    body += `\n${group.programSection}:\n`;
    group.students.forEach(student => {
      body += `• ${student.name} (${student.program} ${student.section} - Sem ${student.semester})\n`;
    });
  });
  
  body += `\n`;
  
  // Missed lectures section - group by section and then by subject
  const groupsWithMissedLectures = groupedData.filter(group => 
    group.students.some(student => student.missedLectures.length > 0)
  );
  
  if (groupsWithMissedLectures.length > 0) {
    body += `Missed Lectures:\n\n`;
    
    groupsWithMissedLectures.forEach(group => {
      body += `${group.programSection}:\n`;
      
      // Group missed lectures by subject (combining courses and labs)
      const missedLecturesBySubject = new Map<string, {
        subject_code: string;
        subject_name: string;
        faculty: string;
        faculty_code: string;
        time: string;
        students: string[];
      }>();
      
      group.students.forEach(student => {
        student.missedLectures.forEach(lecture => {
          // Create unique key for each subject/faculty/time combination (ignore group for mail)
          const key = `${lecture.subject_code}-${lecture.subject_name}-${lecture.faculty}-${lecture.time}`;
          
          if (!missedLecturesBySubject.has(key)) {
            missedLecturesBySubject.set(key, {
              subject_code: lecture.subject_code,
              subject_name: lecture.subject_name,
              faculty: lecture.faculty,
              faculty_code: lecture.faculty_code,
              time: lecture.time,
              students: []
            });
          }
          
          const entry = missedLecturesBySubject.get(key)!;
          if (!entry.students.includes(student.name)) {
            entry.students.push(student.name);
          }
        });
      });
      
      // Format each missed lecture with proper spacing and formatting
      missedLecturesBySubject.forEach(lecture => {
        body += `\n**${lecture.subject_name}**\n`;
        body += `Faculty: ${lecture.faculty} [${lecture.faculty_code}]\n`;
        body += `Time: ${lecture.time}\n`;
        body += `Students:\n`;
        lecture.students.forEach(studentName => {
          body += `• ${studentName}\n`;
        });
      });
      
      body += `\n`;
    });
  }
  
  body += `The students have actively participated in this educational event which contributes to their overall development and learning experience.\n\n`;
  body += `Please consider granting OD approval for the mentioned students.\n\n`;
  body += `Thank you for your consideration.\n\n`;
  body += `Best regards,\n`;
  body += `${metadata.coordinator}`;
  
  return body;
}

/**
 * Generates mailto URL with encoded subject and body
 * @param subject - Email subject
 * @param body - Email body
 * @returns Mailto URL
 */
function generateMailtoUrl(subject: string, body: string): string {
  const recipient = 'amiarchive.in@gmail.com';
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  
  return `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Formats date string for email subject
 * @param dateStr - Raw date string
 * @returns Formatted date string (DD-MM-YYYY)
 */
function formatDateForSubject(dateStr: string): string {
  if (!dateStr) return 'TBD';
  
  try {
    // Try to parse various date formats
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      // If parsing fails, return original string
      return dateStr;
    }
    
    // Format as DD-MM-YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
    
  } catch (error) {
    console.warn(`⚠️ Could not format date "${dateStr}":`, error);
    return dateStr;
  }
}

/**
 * Validates email content before generation
 * @param metadata - Event metadata
 * @param groupedData - Students grouped by program-section
 * @returns Validation result with any warnings
 */
export function validateEmailContent(
  metadata: EventMetadata,
  groupedData: GroupedStudentData[]
): { isValid: boolean; warnings: string[] } {
  console.log('🔍 Validating email content...');
  
  const warnings: string[] = [];
  
  // Check required metadata
  if (!metadata.eventName) {
    warnings.push('Event name is missing - email subject may be generic');
  }
  
  if (!metadata.eventDate) {
    warnings.push('Event date is missing - email subject will show "TBD"');
  }
  
  if (!metadata.eventTime) {
    warnings.push('Event time is missing - email body will show "N/A"');
  }
  
  if (!metadata.eventVenue) {
    warnings.push('Event venue is missing - email body will show "N/A"');
  }
  
  // Check student data
  if (groupedData.length === 0) {
    warnings.push('No students found - email will have empty student list');
  }
  
  const totalStudents = groupedData.reduce((sum, group) => sum + group.students.length, 0);
  if (totalStudents === 0) {
    warnings.push('No students in any group - email will have empty student list');
  }
  
  // Check for students with no missed lectures
  const studentsWithNoMissedLectures = groupedData.reduce((count, group) => {
    return count + group.students.filter(student => student.missedLectures.length === 0).length;
  }, 0);
  
  if (studentsWithNoMissedLectures > 0) {
    warnings.push(`${studentsWithNoMissedLectures} students have no missed lectures`);
  }
  
  const isValid = warnings.length === 0;
  
  console.log(`✅ Email validation complete: ${isValid ? 'Valid' : 'Has warnings'}`);
  if (warnings.length > 0) {
    console.log('⚠️ Warnings:', warnings);
  }
  
  return { isValid, warnings };
}

/**
 * Generates a summary of the email content for preview
 * @param metadata - Event metadata
 * @param groupedData - Students grouped by program-section
 * @returns Email summary object
 */
export function generateEmailSummary(
  metadata: EventMetadata,
  groupedData: GroupedStudentData[]
): {
  totalStudents: number;
  totalGroups: number;
  totalMissedLectures: number;
  eventName: string;
  eventDate: string;
} {
  const totalStudents = groupedData.reduce((sum, group) => sum + group.students.length, 0);
  const totalGroups = groupedData.length;
  const totalMissedLectures = groupedData.reduce((sum, group) => {
    return sum + group.students.reduce((lectureSum, student) => {
      return lectureSum + student.missedLectures.length;
    }, 0);
  }, 0);
  
  return {
    totalStudents,
    totalGroups,
    totalMissedLectures,
    eventName: metadata.eventName || 'N/A',
    eventDate: metadata.eventDate || 'N/A'
  };
}
