import { Student, MissedLecture, StudentWithMissedLectures, TimeSlot, Timetable, Course, Lab } from '@/types/od';

/**
 * Loads timetable data from the JSON file
 * @returns Promise<Timetable> - Timetable data
 */
export async function loadTimetable(): Promise<Timetable> {
  try {
    const response = await fetch('/data/timetable.json');
    if (!response.ok) {
      throw new Error('Failed to load timetable data');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading timetable:', error);
    return { Programs: {} };
  }
}

/**
 * Calculates missed lectures for students based on event time and timetable
 * @param students - Array of students
 * @param eventTime - Event time string (e.g., "09:15–10:10_10:15–11:10")
 * @param eventDay - Day of the week (e.g., "Monday", "Tuesday")
 * @param timetable - Timetable data
 * @returns Array of students with their missed lectures
 */
export function calculateMissedLectures(
  students: Student[],
  eventTime: string,
  eventDay: string,
  timetable: Timetable
): StudentWithMissedLectures[] {
  console.log('🕐 Starting missed lecture calculation...');
  console.log(`📅 Event time: ${eventTime}, Day: ${eventDay}`);
  console.log(`👥 Processing ${students.length} students`);

  // Parse event time slots
  const eventSlots = parseEventTimeSlots(eventTime);
  console.log('⏰ Event time slots:', eventSlots);

  const studentsWithMissedLectures: StudentWithMissedLectures[] = [];

  students.forEach((student, index) => {
    console.log(`\n🔍 Processing student ${index + 1}/${students.length}: ${student.name}`);
    console.log(`📚 Looking for: ${student.normalizedProgram} - Semester ${student.semester} - ${student.section}`);

    const missedLectures = findMissedLecturesForStudent(
      student,
      eventSlots,
      eventDay,
      timetable
    );

    const studentWithMissed: StudentWithMissedLectures = {
      ...student,
      missedLectures
    };

    studentsWithMissedLectures.push(studentWithMissed);

    if (missedLectures.length > 0) {
      console.log(`❌ Found ${missedLectures.length} missed lectures for ${student.name}`);
      missedLectures.forEach(lecture => {
        console.log(`   - ${lecture.subject_name} (${lecture.faculty}) at ${lecture.time}`);
      });
    } else {
      console.log(`✅ No missed lectures for ${student.name}`);
    }
  });

  const totalMissedLectures = studentsWithMissedLectures.reduce(
    (sum, student) => sum + student.missedLectures.length, 0
  );
  
  console.log(`\n📊 Summary: ${totalMissedLectures} total missed lectures across ${students.length} students`);
  return studentsWithMissedLectures;
}

/**
 * Parses event time string into time slots
 * @param eventTime - Event time string (e.g., "09:15–10:10_10:15–11:10")
 * @returns Array of TimeSlot objects
 */
function parseEventTimeSlots(eventTime: string): TimeSlot[] {
  if (!eventTime) return [];

  const slots = eventTime.split(/[_\s]+/).filter(Boolean);
  return slots.map(slot => {
    const [start, end] = slot.split('–').map(time => time.trim());
    return { start, end };
  });
}

/**
 * Finds missed lectures for a specific student
 * @param student - Student data
 * @param eventSlots - Event time slots
 * @param eventDay - Event day
 * @param timetable - Timetable data
 * @returns Array of missed lectures
 */
function findMissedLecturesForStudent(
  student: Student,
  eventSlots: TimeSlot[],
  eventDay: string,
  timetable: Timetable
): MissedLecture[] {
  const missedLectures: MissedLecture[] = [];

  // Find the student's program in timetable
  const programKey = findProgramKey(student.normalizedProgram, timetable);
  if (!programKey) {
    console.log(`⚠️  Program not found: ${student.normalizedProgram}`);
    return missedLectures;
  }

  const program = timetable.Programs[programKey];
  if (!program) return missedLectures;

  // Find the student's section
  const section = program.Sections[student.section];
  if (!section) {
    console.log(`⚠️  Section not found: ${student.section} for ${programKey}`);
    return missedLectures;
  }

  // Check courses and labs for the event day
  const dayCourses = section.Courses.filter(course => course.day === eventDay);
  const dayLabs = section.Labs.filter(lab => lab.day === eventDay);

  console.log(`📚 Found ${dayCourses.length} courses and ${dayLabs.length} labs for ${eventDay}`);

  // For each event time slot, find overlapping lectures/labs
  eventSlots.forEach(eventSlot => {
    console.log(`⏰ Checking event slot: ${eventSlot.start} - ${eventSlot.end}`);
    
    // Check courses - include all overlapping courses
    const overlappingCourses = dayCourses.filter(course => {
      return isTimeOverlapping(eventSlot, course.time);
    });

    // Check labs - only include if student's group matches or if both groups are affected
    const overlappingLabs = dayLabs.filter(lab => {
      if (!isTimeOverlapping(eventSlot, lab.time)) return false;
      
      // If student has a group, only include if it matches
      if (student.group) {
        return lab.group === `Group ${student.group}`;
      }
      
      // If no group specified, include all labs for this time slot
      return true;
    });

    console.log(`📖 Found ${overlappingCourses.length} overlapping courses`);
    console.log(`🔬 Found ${overlappingLabs.length} overlapping labs for group ${student.group || 'all'}`);

    // Add all overlapping courses to missed lectures
    overlappingCourses.forEach(course => {
      const missedLecture: MissedLecture = {
        subject_code: course.subject_code || '',
        subject_name: course.subject_name || '',
        faculty: course.faculty || '',
        faculty_code: course.faculty_code || '', // Empty for now, ready for future expansion
        time: course.time || '',
        group: '', // No group for courses
        day: eventDay
      };

      missedLectures.push(missedLecture);
      console.log(`❌ Added missed course: ${course.subject_name} (${course.faculty}) at ${course.time}`);
    });

    // Add all overlapping labs to missed lectures
    overlappingLabs.forEach(lab => {
      const missedLecture: MissedLecture = {
        subject_code: lab.subject_code || '',
        subject_name: lab.subject_name || '',
        faculty: lab.faculty || '',
        faculty_code: lab.faculty_code || '', // Empty for now, ready for future expansion
        time: lab.time || '',
        group: lab.group || '', // Include group for labs
        day: eventDay
      };

      missedLectures.push(missedLecture);
      console.log(`❌ Added missed lab: ${lab.subject_name} (${lab.faculty}) at ${lab.time} for ${lab.group}`);
    });
  });

  return missedLectures;
}

/**
 * Finds the correct program key in timetable
 * @param normalizedProgram - Normalized program name
 * @param timetable - Timetable data
 * @returns Program key or null
 */
function findProgramKey(normalizedProgram: string, timetable: Timetable): string | null {
  const programKeys = Object.keys(timetable.Programs);
  
  // Exact match first
  const exactMatch = programKeys.find(key => 
    key.toLowerCase() === normalizedProgram.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Fuzzy match with common variations
  const fuzzyMatch = programKeys.find(key => {
    const keyLower = key.toLowerCase();
    const programLower = normalizedProgram.toLowerCase();
    
    // Handle common variations
    const variations = [
      keyLower,
      keyLower.replace(/\s+/g, ''),
      keyLower.replace(/[()]/g, ''),
      keyLower.replace(/\s*\([^)]*\)\s*/g, ''),
      keyLower.replace(/b\.?tech/i, 'btech'),
      keyLower.replace(/btech/i, 'b.tech'),
      keyLower.replace(/cse/i, 'computer science'),
      keyLower.replace(/it/i, 'information technology'),
      keyLower.replace(/bca/i, 'bachelor of computer applications')
    ];
    
    return variations.some(variant => 
      variant.includes(programLower) || programLower.includes(variant)
    );
  });

  return fuzzyMatch || null;
}

/**
 * Checks if two time slots overlap
 * @param eventSlot - Event time slot
 * @param lectureTime - Lecture time string
 * @returns boolean indicating overlap
 */
function isTimeOverlapping(eventSlot: TimeSlot, lectureTime: string): boolean {
  if (!lectureTime) return false;

  const [lectureStart, lectureEnd] = lectureTime.split('–').map(time => time.trim());
  
  // Convert times to minutes for comparison
  const eventStartMinutes = timeToMinutes(eventSlot.start);
  const eventEndMinutes = timeToMinutes(eventSlot.end);
  const lectureStartMinutes = timeToMinutes(lectureStart);
  const lectureEndMinutes = timeToMinutes(lectureEnd);

  // Check for overlap
  return eventStartMinutes < lectureEndMinutes && eventEndMinutes > lectureStartMinutes;
}

/**
 * Converts time string to minutes
 * @param time - Time string (e.g., "09:15")
 * @returns Minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
