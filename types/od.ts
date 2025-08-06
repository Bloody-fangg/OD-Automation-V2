// TypeScript interfaces for OD Automation Backend

export interface Student {
  name: string;
  program: string;
  section: string;
  semester: string;
  group?: string; // Group field for lab matching
  normalizedProgram: string;
  originalData: Record<string, any>;
}

export interface MissedLecture {
  subject_code: string;
  subject_name: string;
  faculty: string;
  faculty_code: string; // Empty for now, ready for future expansion
  time: string;
  group?: string; // For labs
  day: string;
}

export interface StudentWithMissedLectures extends Student {
  missedLectures: MissedLecture[];
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface Course {
  subject_code: string;
  subject_name: string;
  faculty: string;
  faculty_code: string;
  day: string;
  time: string;
}

export interface Lab {
  subject_code: string;
  subject_name: string;
  faculty: string;
  faculty_code: string;
  day: string;
  time: string;
  group: string; // Group 1, Group 2, etc.
}

export interface Section {
  Courses: Course[];
  Labs: Lab[];
}

export interface Program {
  Semester: string;
  Sections: Record<string, Section>;
}

export interface Timetable {
  Programs: Record<string, Program>;
}

export interface EventMetadata {
  eventName: string;
  coordinator: string;
  eventDate: string;
  day: string;
  eventVenue?: string;
  place?: string;
  eventTime: string;
}

export interface ParsedExcelData {
  metadata: EventMetadata;
  students: Student[];
}

export interface GroupedStudentData {
  programSection: string;
  students: StudentWithMissedLectures[];
}

export interface ProcessOdResponse {
  success: boolean;
  message: string;
  data?: {
    metadata: EventMetadata;
    studentsWithMissed: StudentWithMissedLectures[];
    groupedStudents: GroupedStudentData[];
    report: {
      base64: string;
      filename: string;
      isValid: boolean;
      warnings: string[];
    };
  };
  error?: string;
}
