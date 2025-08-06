import * as XLSX from 'xlsx';
import type { ParsedExcelData } from '@/types/od';

/**
 * Generates a downloadable OD report Excel file with two sheets:
 * 1. Metadata (event details)
 * 2. Students & missed lectures (multiple rows per student if needed)
 * Filename: OD Report – [Event Name] ([Event Date]).xlsx
 * Handles special characters and edge cases.
 */
export function exportODReport(data: ParsedExcelData): { success: boolean; error?: string } {
  if (!data || !data.metadata || !data.students || data.students.length === 0) {
    return { success: false, error: 'No students or event data available for report.' };
  }

  // Sheet 1: Metadata
  const metaRows = [
    ['Event Name', data.metadata.eventName || ''],
    ['Coordinator', data.metadata.coordinator || ''],
    ['Event Date', data.metadata.eventDate || ''],
    ['Day', data.metadata.day || ''],
    ['Place', data.metadata.place || ''],
    ['Event Time', data.metadata.eventTime || ''],
  ];
  const metaSheet = XLSX.utils.aoa_to_sheet(metaRows);

  // Sheet 2: Students & Missed Lectures
  type MissedLecture = {
    subject?: string;
    subject_name?: string;
    faculty?: string;
    time?: string;
    room?: string;
  };
  type StudentWithMissedLectures = {
    name: string;
    program: string;
    section: string;
    semester: string;
    missedLectures?: MissedLecture[];
  };
  const studentRows: (string[])[] = [
    ['Name', 'Program', 'Section', 'Semester', 'Missed Subject', 'Faculty', 'Time', 'Room'],
  ];
  (data.students as StudentWithMissedLectures[]).forEach((student) => {
    if (Array.isArray(student.missedLectures) && student.missedLectures.length > 0) {
      student.missedLectures.forEach((lecture) => {
        studentRows.push([
          student.name,
          student.program,
          student.section,
          student.semester,
          lecture.subject || lecture.subject_name || '',
          lecture.faculty || '',
          lecture.time || '',
          lecture.room || '',
        ]);
      });
    } else {
      studentRows.push([
        student.name,
        student.program,
        student.section,
        student.semester,
        '', '', '', ''
      ]);
    }
  });
  const studentSheet = XLSX.utils.aoa_to_sheet(studentRows);

  // Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Event Metadata');
  XLSX.utils.book_append_sheet(wb, studentSheet, 'Students & Missed Lectures');

  // Filename
  const sanitize = (s: string) => (s || '').replace(/[^a-zA-Z0-9 _()-]/g, '').replace(/\s+/g, ' ').trim();
  const eventName = sanitize(data.metadata.eventName || 'OD Report');
  const eventDate = sanitize(data.metadata.eventDate || '');
  const fileName = `OD Report – ${eventName}${eventDate ? ' (' + eventDate + ')' : ''}.xlsx`;

  try {
    XLSX.writeFile(wb, fileName);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to generate Excel file.' };
  }
}
