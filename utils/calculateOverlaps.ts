import { Student, MissedLecture, StudentWithMissedLectures, TimeSlot, Timetable, Course, Lab } from '@/types/od';

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
  console.log(`⏰ Parsing event time: "${eventTime}"`);
  
  if (!eventTime) {
    console.warn('⚠️ No event time provided');
    return [];
  }

  const slots: TimeSlot[] = [];
  
  // Split by underscore or comma to handle multiple time slots
  const timeRanges = eventTime.split(/[_,|]/).map(t => t.trim());
  
  timeRanges.forEach((range, index) => {
    console.log(`🔍 Processing time range ${index + 1}: "${range}"`);
    
    // Handle different separators (–, -, to, etc.)
    const timeParts = range.split(/[–\-]|to/i).map(t => t.trim());
    
    if (timeParts.length >= 2) {
      const startTime = parseTimeToMinutes(timeParts[0]);
      const endTime = parseTimeToMinutes(timeParts[1]);
      
      if (startTime !== -1 && endTime !== -1) {
        slots.push({ start: startTime, end: endTime });
        console.log(`✅ Added slot: ${timeParts[0]} (${startTime}min) - ${timeParts[1]} (${endTime}min)`);
      } else {
        console.warn(`⚠️ Could not parse time range: "${range}"`);
      }
    } else {
      console.warn(`⚠️ Invalid time range format: "${range}"`);
    }
  });

  console.log(`📋 Parsed ${slots.length} time slots`);
  return slots;
}

/**
 * Converts time string to minutes from midnight
 * @param timeStr - Time string (e.g., "09:15", "9:15 AM")
 * @returns Minutes from midnight, or -1 if invalid
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
  
  const cleaned = timeStr.trim().toUpperCase();
  
  // Handle 24-hour format (HH:MM)
  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }
  
  // Handle 12-hour format (H:MM AM/PM)
  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3];
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }
  
  console.warn(`⚠️ Could not parse time: "${timeStr}"`);
  return -1;
}

/**
 * Finds missed lectures for a specific student
 * @param student - Student object
 * @param eventSlots - Event time slots
 * @param eventDay - Day of the week
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
  
  // Find student's timetable
  const programTimetable = timetable[student.normalizedProgram];
  if (!programTimetable) {
    console.warn(`⚠️ No timetable found for program: ${student.normalizedProgram}`);
    return missedLectures;
  }
  
  const semesterTimetable = programTimetable[student.semester];
  if (!semesterTimetable) {
    console.warn(`⚠️ No timetable found for semester: ${student.semester}`);
    return missedLectures;
  }
  
  const sectionTimetable = semesterTimetable[student.section];
  if (!sectionTimetable) {
    console.warn(`⚠️ No timetable found for section: ${student.section}`);
    return missedLectures;
  }
  
  console.log(`✅ Found timetable for ${student.normalizedProgram} - Sem ${student.semester} - ${student.section}`);
  
  // Check courses for overlaps
  if (sectionTimetable.courses) {
    sectionTimetable.courses.forEach(course => {
      if (hasTimeOverlap(course.time, eventSlots, eventDay)) {
        missedLectures.push({
          subject_name: course.subject_name,
          faculty: course.faculty,
          time: course.time,
          room: course.room,
          type: 'course'
        });
        console.log(`❌ Course overlap: ${course.subject_name} at ${course.time}`);
      }
    });
  }
  
  // Check labs for overlaps
  if (sectionTimetable.labs) {
    sectionTimetable.labs.forEach(lab => {
      if (hasTimeOverlap(lab.time, eventSlots, eventDay)) {
        missedLectures.push({
          subject_name: lab.subject_name,
          faculty: lab.faculty,
          time: lab.time,
          room: lab.room,
          type: 'lab'
        });
        console.log(`❌ Lab overlap: ${lab.subject_name} at ${lab.time}`);
      }
    });
  }
  
  return missedLectures;
}

/**
 * Checks if a lecture time overlaps with event time slots
 * @param lectureTime - Lecture time string
 * @param eventSlots - Event time slots
 * @param eventDay - Day of the week
 * @returns Boolean indicating overlap
 */
function hasTimeOverlap(lectureTime: string, eventSlots: TimeSlot[], eventDay: string): boolean {
  if (!lectureTime || eventSlots.length === 0) return false;
  
  // Parse lecture time - format might be "Monday 09:15-10:10" or just "09:15-10:10"
  const lectureTimeInfo = parseLectureTime(lectureTime);
  
  if (!lectureTimeInfo) {
    console.warn(`⚠️ Could not parse lecture time: "${lectureTime}"`);
    return false;
  }
  
  // Check if the day matches (if specified in lecture time)
  if (lectureTimeInfo.day && lectureTimeInfo.day.toLowerCase() !== eventDay.toLowerCase()) {
    return false;
  }
  
  // Check for time overlap with any event slot
  return eventSlots.some(eventSlot => {
    const overlap = (
      lectureTimeInfo.start < eventSlot.end && 
      lectureTimeInfo.end > eventSlot.start
    );
    
    if (overlap) {
      console.log(`⚠️ Time overlap detected: Lecture ${lectureTimeInfo.start}-${lectureTimeInfo.end} vs Event ${eventSlot.start}-${eventSlot.end}`);
    }
    
    return overlap;
  });
}

/**
 * Parses lecture time string to extract day and time range
 * @param lectureTime - Lecture time string
 * @returns Object with day, start, and end times, or null if invalid
 */
function parseLectureTime(lectureTime: string): { day?: string; start: number; end: number } | null {
  if (!lectureTime) return null;
  
  const cleaned = lectureTime.trim();
  
  // Check if day is included (e.g., "Monday 09:15-10:10")
  const dayMatch = cleaned.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(.+)$/i);
  
  let timeStr = cleaned;
  let day: string | undefined;
  
  if (dayMatch) {
    day = dayMatch[1];
    timeStr = dayMatch[2];
  }
  
  // Parse time range (09:15-10:10 or 09:15–10:10)
  const timeRangeMatch = timeStr.match(/^(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})$/);
  
  if (!timeRangeMatch) {
    return null;
  }
  
  const startTime = parseTimeToMinutes(timeRangeMatch[1]);
  const endTime = parseTimeToMinutes(timeRangeMatch[2]);
  
  if (startTime === -1 || endTime === -1) {
    return null;
  }
  
  return {
    day,
    start: startTime,
    end: endTime
  };
}

/**
 * Loads timetable from JSON file
 * @param filePath - Path to timetable.json file
 * @returns Promise<Timetable> - Loaded timetable data
 */
export async function loadTimetable(filePath: string = '/data/timetable.json'): Promise<Timetable> {
  console.log(`📚 Loading timetable from: ${filePath}`);
  
  try {
    // In a real Next.js app, you might use fs.readFile or fetch
    // For now, we'll assume the timetable is available as a static file
    const response = await fetch(filePath);
    
    if (!response.ok) {
      throw new Error(`Failed to load timetable: ${response.statusText}`);
    }
    
    const timetable: Timetable = await response.json();
    console.log('✅ Timetable loaded successfully');
    
    // Log available programs for debugging
    const programs = Object.keys(timetable);
    console.log(`📋 Available programs: ${programs.join(', ')}`);
    
    return timetable;
    
  } catch (error) {
    console.error('❌ Error loading timetable:', error);
    throw new Error(`Failed to load timetable: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
