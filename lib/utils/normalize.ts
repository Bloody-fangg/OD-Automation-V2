import { EventMetadata, Student, ProcessingError } from '@/lib/types';

/**
 * Normalizes student data to ensure consistent formatting
 */
export function normalizeStudent(student: Partial<Student> & { name: string }): Student {
  if (!student.name) {
    throw new Error('Student name is required');
  }

  // Ensure program, section, and semester are strings and trim whitespace
  const program = String(student.program || '').trim();
  const section = String(student.section || '').trim().toUpperCase();
  const semester = String(student.semester || '').trim();

  return {
    name: student.name.trim(),
    program,
    section,
    semester,
    originalData: {
      program: student.originalData?.program || program,
      section: student.originalData?.section || section,
      semester: student.originalData?.semester || semester,
    },
  };
}

/**
 * Validates event metadata
 */
export function validateEventMetadata(metadata: Partial<EventMetadata>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!metadata.eventName?.trim()) {
    errors.push('Event name is required');
  }
  if (!metadata.coordinator?.trim()) {
    errors.push('Coordinator name is required');
  }
  if (!metadata.date?.trim()) {
    errors.push('Event date is required');
  }
  if (!metadata.day?.trim()) {
    errors.push('Event day is required');
  }
  if (!metadata.place?.trim()) {
    errors.push('Event place is required');
  }
  if (!metadata.eventTime?.trim()) {
    errors.push('Event time is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates student data
 */
export function validateStudent(student: Partial<Student>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!student.name?.trim()) {
    errors.push('Student name is required');
  }
  if (!student.program?.trim()) {
    errors.push('Program is required');
  }
  if (!student.section?.trim()) {
    errors.push('Section is required');
  }
  if (!student.semester?.trim()) {
    errors.push('Semester is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
