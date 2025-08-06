// TypeScript interfaces for OD Automation Backend

export interface Student {
  name: string;
  program: string;
  section: string;
  semester: string;
  normalizedProgram: string; // Normalized version for matching
  originalData?: {
    program: string;
    section: string;
    semester: string;
  };
}

export interface MissedLecture {
  subject_name: string;
  faculty: string;
  time: string;
  room: string;
  type: 'course' | 'lab'; // To distinguish between courses and labs
}

export interface StudentWithMissedLectures extends Student {
  missedLectures: MissedLecture[];
}

export interface EventMetadata {
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  organizingDepartment: string;
  facultyIncharge: string;
  contactDetails: string;
  [key: string]: string; // For any additional metadata
}

export interface GroupedStudentData {
  groupKey: string; // e.g., "B.Tech CSE - Section A"
  students: StudentWithMissedLectures[];
}

export interface TimeSlot {
  start: number; // Minutes from midnight
  end: number;   // Minutes from midnight
}

export interface Course {
  subject_name: string;
  faculty: string;
  time: string;
  room: string;
}

export interface Lab {
  subject_name: string;
  faculty: string;
  time: string;
  room: string;
}

export interface TimetableSection {
  courses: Course[];
  labs: Lab[];
}

export interface TimetableSemester {
  [section: string]: TimetableSection;
}

export interface TimetableProgram {
  [semester: string]: TimetableSemester;
}

export interface Timetable {
  [program: string]: TimetableProgram;
}

export interface ProcessOdResponse {
  success: boolean;
  metadata?: EventMetadata;
  groupedData?: GroupedStudentData[];
  email?: {
    subject: string;
    body: string;
    mailtoUrl: string;
  };
  reportBase64?: string;
  message?: string;
  warnings?: string[];
}

export interface ParsedExcelData {
  metadata: EventMetadata;
  students: Student[];
}
