import { Student, StudentWithMissed, GroupedStudents, MissedLecture } from '@/lib/types';

/**
 * Processes students to find their missed lectures based on timetable data
 */
export function processStudentsWithMissedLectures(
  students: Student[],
  timetableData: any,
  eventDate: string,
  eventDay: string,
  eventTime: string
): StudentWithMissed[] {
  return students.map(student => {
    const missedLectures: MissedLecture[] = [];
    
    // Find the student's program and section in the timetable
    const programData = timetableData.Programs[student.program];
    if (!programData) return { ...student, missedLectures: [], hasConflicts: false };
    
    const sectionData = programData.Sections[student.section];
    if (!sectionData) return { ...student, missedLectures: [], hasConflicts: false };
    
    // Check both Courses and Labs for conflicts
    const allSchedules = [
      ...(sectionData.Courses || []).map((c: any) => ({ ...c, type: 'Course' as const })),
      ...(sectionData.Labs || []).map((l: any) => ({ ...l, type: 'Lab' as const }))
    ];
    
    // Find all lectures that overlap with the event time
    for (const lecture of allSchedules) {
      if (lecture.day === eventDay) {
        const [lectureStart, lectureEnd] = lecture.time.split('–').map((t: string) => t.trim());
        const [eventStart, eventEnd] = eventTime.split('–').map((t: string) => t.trim());
        
        // Simple time overlap check (for demonstration)
        if (doTimeRangesOverlap(lectureStart, lectureEnd, eventStart, eventEnd)) {
          missedLectures.push({
            subject_code: lecture.subject_code,
            subject_name: lecture.subject_name,
            faculty: lecture.faculty,
            room: lecture.room,
            time: lecture.time,
            day: lecture.day,
            type: lecture.type,
            group: lecture.group
          });
        }
      }
    }
    
    return {
      ...student,
      missedLectures,
      hasConflicts: missedLectures.length > 0
    };
  });
}

/**
 * Groups students by their program and section
 */
export function groupStudentsByProgramSection(students: StudentWithMissed[]): GroupedStudents[] {
  const groups: { [key: string]: GroupedStudents } = {};
  
  for (const student of students) {
    const groupName = `${student.program} - Section ${student.section}`;
    
    if (!groups[groupName]) {
      groups[groupName] = {
        groupName,
        students: [],
        totalMissedLectures: 0
      };
    }
    
    groups[groupName].students.push(student);
    groups[groupName].totalMissedLectures += student.missedLectures.length;
  }
  
  return Object.values(groups);
}

/**
 * Sorts groups by program and section
 */
export function sortGroups(groups: GroupedStudents[]): GroupedStudents[] {
  return [...groups].sort((a, b) => {
    // Sort by program name first
    const programCompare = a.groupName.localeCompare(b.groupName);
    if (programCompare !== 0) return programCompare;
    
    // Then by section if programs are the same
    return a.groupName.localeCompare(b.groupName);
  });
}

/**
 * Calculates totals across all groups
 */
export function calculateTotals(groups: GroupedStudents[]): { totalStudents: number; totalMissedLectures: number } {
  return groups.reduce(
    (totals, group) => ({
      totalStudents: totals.totalStudents + group.students.length,
      totalMissedLectures: totals.totalMissedLectures + group.totalMissedLectures
    }),
    { totalStudents: 0, totalMissedLectures: 0 }
  );
}

/**
 * Helper function to check if two time ranges overlap
 */
function doTimeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Simple string comparison for time (HH:MM format)
  // This is a simplified check and may need adjustment for actual time comparison
  return (
    (start1 >= start2 && start1 < end2) ||
    (end1 > start2 && end1 <= end2) ||
    (start1 <= start2 && end1 >= end2)
  );
}
