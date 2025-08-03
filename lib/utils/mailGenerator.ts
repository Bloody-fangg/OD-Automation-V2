import { GroupedStudents, StudentWithMissed } from '@/lib/types';

interface EmailData {
  subject: string;
  html: string;
  text: string;
}

/**
 * Generates email data for OD requests
 */
export function generateEmailData(
  groupedStudents: GroupedStudents[],
  eventDetails: {
    eventName: string;
    date: string;
    day: string;
    time: string;
    place: string;
    coordinator: string;
  }
): EmailData {
  const { eventName, date, day, time, place, coordinator } = eventDetails;
  
  // Generate email subject
  const subject = `OD Request for ${eventName} on ${date}`;
  
  // Generate email HTML content
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .section { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; }
        .footer { margin-top: 20px; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>On Duty Request</h2>
        <p>${eventName} - ${date} (${day}) at ${time}</p>
        <p>Venue: ${place}</p>
      </div>
      
      <div class="content">
        <div class="section">
          <p>Dear Faculty,</p>
          <p>Kindly grant On-Duty to the following students who will be participating in the above-mentioned event:</p>
        </div>
  `;

  // Add student details by group
  for (const group of groupedStudents) {
    if (group.students.length === 0) continue;
    
    html += `
      <div class="section">
        <h3>${group.groupName} (${group.students.length} students, ${group.totalMissedLectures} total missed lectures)</h3>
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Program</th>
              <th>Section</th>
              <th>Missed Lectures</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const student of group.students) {
      const missedSubjects = student.missedLectures
        .map(lec => `${lec.subject_code} (${lec.type}${lec.group ? ` - ${lec.group}` : ''})`)
        .join(', ');
      
      html += `
        <tr>
          <td>${student.name}</td>
          <td>${student.program}</td>
          <td>${student.section}</td>
          <td>${missedSubjects || 'None'}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Add footer
  html += `
        <div class="section">
          <p>Thank you for your cooperation.</p>
          <p>Best regards,<br>${coordinator}</p>
        </div>
      </div>
      
      <div class="footer">
        <p>This is an auto-generated email. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;

  // Generate plain text version
  let text = `On Duty Request\n`;
  text += `================\n\n`;
  text += `Event: ${eventName}\n`;
  text += `Date: ${date} (${day}) at ${time}\n`;
  text += `Venue: ${place}\n\n`;
  text += `Dear Faculty,\n\n`;
  text += `Kindly grant On-Duty to the following students who will be participating in the above-mentioned event:\n\n`;

  for (const group of groupedStudents) {
    if (group.students.length === 0) continue;
    
    text += `${group.groupName} (${group.students.length} students, ${group.totalMissedLectures} total missed lectures):\n`;
    text += `----------------------------------------------------------------\n`;
    
    for (const student of group.students) {
      const missedSubjects = student.missedLectures
        .map(lec => `${lec.subject_code} (${lec.type}${lec.group ? ` - ${lec.group}` : ''})`)
        .join(', ');
      
      text += `- ${student.name} (${student.program}, Section ${student.section}): ${missedSubjects || 'No missed lectures'}\n`;
    }
    
    text += '\n';
  }

  text += `\nThank you for your cooperation.\n\n`;
  text += `Best regards,\n${coordinator}\n\n`;
  text += `This is an auto-generated email. Please do not reply to this email.`;

  return {
    subject,
    html,
    text
  };
}
