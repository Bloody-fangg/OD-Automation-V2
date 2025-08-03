// Core data interfaces for OD automation system

export interface EventMetadata {
  eventName: string
  coordinator: string
  date: string
  day: string
  place: string
  eventTime: string
}

export interface Student {
  name: string
  program: string
  section: string
  semester: string
  originalData: {
    program: string
    section: string
    semester: string
  }
}

export interface MissedLecture {
  subject_code: string
  subject_name: string
  faculty: string
  room: string
  time: string
  day: string
  type: 'Course' | 'Lab'
  group?: string
}

export interface StudentWithMissed extends Student {
  missedLectures: MissedLecture[]
  hasConflicts: boolean
}

export interface GroupedStudents {
  groupName: string // e.g., "B.Tech CSE - Section A"
  students: StudentWithMissed[]
  totalMissedLectures: number
}

export interface UnmatchedStudent {
  student: Student
  reason: string
}

export interface EmailData {
  subject: string
  body: string
  mailtoUrl: string
  bodyLength: number
  hasWarning: boolean
}

export interface ProcessResult {
  metadata: EventMetadata
  studentsWithMissed: StudentWithMissed[]
  grouped: GroupedStudents[]
  email: EmailData
  unmatched: UnmatchedStudent[]
  totalStudents: number
  totalMissedLectures: number
  processingTime: number
}

// Timetable interfaces
export interface Course {
  subject_code: string
  subject_name: string
  faculty: string
  room: string
  day: string
  time: string
  group?: string
}

export interface SectionSchedule {
  Courses: Course[]
  Labs: Course[]
}

export interface ProgramSections {
  [section: string]: SectionSchedule
}

export interface ProgramData {
  Semester: string
  Sections: ProgramSections
}

export interface TimetableData {
  Programs: {
    [program: string]: ProgramData
  }
}

// Error types
export interface ProcessingError {
  type: 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'TIMETABLE_ERROR' | 'EMAIL_ERROR'
  message: string
  details?: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ProcessingError[]
  warnings: string[]
} 