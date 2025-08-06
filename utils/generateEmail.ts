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
  const eventName = metadata.eventName || 'Event';
  const eventDate = formatDateForSubject(metadata.eventDate);
  
  return `OD Request – ${eventName} (${eventDate})`;
}

/**
 * Generates email body content
 * @param metadata - Event metadata
 * @param groupedData - Students grouped by program-section
 * @returns Email body string
 */
function generateEmailBody(
  metadata: EventMetadata,
  groupedData: GroupedStudentData[]
): string {
  console.log('📝 Generating email body...');
  
  const lines: string[] = [];
  
  // Email greeting
  lines.push('Respected Sir/Ma\'am,');
  lines.push('');
  
  // Introduction
  lines.push('I hope this email finds you in good health and spirits.');
  lines.push('');
  
  // Event details
  lines.push('I am writing to request an Official Duty (OD) for the following event:');
  lines.push('');
  lines.push(`Event Name: ${metadata.eventName || 'N/A'}`);
  lines.push(`Date: ${metadata.eventDate || 'N/A'}`);
  lines.push(`Time: ${metadata.eventTime || 'N/A'}`);
  lines.push(`Venue: ${metadata.eventVenue || 'N/A'}`);
  
  if (metadata.organizingDepartment) {
    lines.push(`Organizing Department: ${metadata.organizingDepartment}`);
  }
  
  if (metadata.facultyIncharge) {
    lines.push(`Faculty In-charge: ${metadata.facultyIncharge}`);
  }
  
  if (metadata.contactDetails) {
    lines.push(`Contact Details: ${metadata.contactDetails}`);
  }
  
  lines.push('');
  
  // Students and missed lectures
  lines.push('The following students will be participating in this event and will miss the mentioned lectures:');
  lines.push('');
  
  // Group students by program-section
  groupedData.forEach((group, groupIndex) => {
    if (groupIndex > 0) lines.push(''); // Add spacing between groups
    
    lines.push(`${group.groupKey}:`);
    
    group.students.forEach((student, studentIndex) => {
      const studentNumber = studentIndex + 1;
      lines.push(`${studentNumber}. ${student.name}`);
      
      if (student.missedLectures.length > 0) {
        lines.push('   Missed Lectures:');
        student.missedLectures.forEach(lecture => {
          lines.push(`   - ${lecture.subject_name} (${lecture.faculty}) - ${lecture.time} - ${lecture.room}`);
        });
      } else {
        lines.push('   No missed lectures for this student.');
      }
      
      if (studentIndex < group.students.length - 1) {
        lines.push(''); // Add spacing between students
      }
    });
  });
  
  lines.push('');
  
  // Request statement
  lines.push('We kindly request you to grant Official Duty (OD) for the above-mentioned students so that they can participate in this event without any academic penalty.');
  lines.push('');
  
  // Closing
  lines.push('Thank you for your time and consideration. We look forward to your positive response.');
  lines.push('');
  lines.push('Regards,');
  lines.push('[Your Name]');
  lines.push('[Your Designation]');
  lines.push('[Department]');
  
  const body = lines.join('\n');
  console.log(`📄 Generated email body with ${lines.length} lines`);
  
  return body;
}

/**
 * Generates mailto URL with encoded subject and body
 * @param subject - Email subject
 * @param body - Email body
 * @returns Mailto URL string
 */
function generateMailtoUrl(subject: string, body: string): string {
  console.log('🔗 Generating mailto URL...');
  
  // Get recipient email from environment variable or use default
  const recipient = process.env.OD_RECIPIENT_EMAIL || 'amiarchive.in@gmail.com';
  
  // Encode subject and body for URL
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  
  // Check if body is too long for mailto (some email clients have limits)
  const maxBodyLength = 2000;
  let finalBody = encodedBody;
  let warning = '';
  
  if (body.length > maxBodyLength) {
    console.warn(`⚠️ Email body is ${body.length} characters, which may be too long for some email clients`);
    warning = 'Note: Email body is quite long. If the mailto link doesn\'t work properly, please copy the content manually.';
    
    // Truncate body for mailto URL
    const truncatedBody = body.substring(0, maxBodyLength - 100) + '\n\n[Content truncated - please see the full report for complete details]';
    finalBody = encodeURIComponent(truncatedBody);
  }
  
  const mailtoUrl = `mailto:${recipient}?subject=${encodedSubject}&body=${finalBody}`;
  
  console.log(`📧 Mailto URL generated for recipient: ${recipient}`);
  console.log(`📏 Final URL length: ${mailtoUrl.length} characters`);
  
  if (warning) {
    console.warn(`⚠️ ${warning}`);
  }
  
  return mailtoUrl;
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
