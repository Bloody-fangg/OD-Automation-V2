import * as XLSX from "xlsx"

export interface Participant {
  name: string
  program: string
  section: string
  semester: string
  missedLectures: string[]
}

export interface EventData {
  eventName: string
  coordinator: string
  date: string
  time: string
  place: string
  participants: Participant[]
}

// Sample timetable data - in a real app, this would be loaded from a database
const TIMETABLE_DATA = {
  BTECH: {
    CSE: {
      "1": {
        MONDAY: ["9:00-10:00 Math", "10:00-11:00 Physics", "11:00-12:00 Programming"],
        TUESDAY: ["9:00-10:00 Chemistry", "10:00-11:00 English", "11:00-12:00 Programming Lab"],
        WEDNESDAY: ["9:00-10:00 Math", "10:00-11:00 Physics", "11:00-12:00 Workshop"],
        THURSDAY: ["9:00-10:00 Chemistry", "10:00-11:00 English", "11:00-12:00 Programming"],
        FRIDAY: ["9:00-10:00 Math", "10:00-11:00 Physics Lab", "11:00-12:00 Programming Lab"],
      },
      "2": {
        MONDAY: ["9:00-10:00 Data Structures", "10:00-11:00 DBMS", "11:00-12:00 OS"],
        TUESDAY: ["9:00-10:00 Computer Networks", "10:00-11:00 Software Engineering", "11:00-12:00 DBMS Lab"],
        WEDNESDAY: ["9:00-10:00 Data Structures", "10:00-11:00 DBMS", "11:00-12:00 OS Lab"],
        THURSDAY: [
          "9:00-10:00 Computer Networks",
          "10:00-11:00 Software Engineering",
          "11:00-12:00 Data Structures Lab",
        ],
        FRIDAY: ["9:00-10:00 Web Development", "10:00-11:00 Mobile App Dev", "11:00-12:00 Project Work"],
      },
    },
    ECE: {
      "1": {
        MONDAY: ["9:00-10:00 Math", "10:00-11:00 Physics", "11:00-12:00 Electronics"],
        TUESDAY: ["9:00-10:00 Chemistry", "10:00-11:00 English", "11:00-12:00 Electronics Lab"],
        WEDNESDAY: ["9:00-10:00 Math", "10:00-11:00 Physics", "11:00-12:00 Workshop"],
        THURSDAY: ["9:00-10:00 Chemistry", "10:00-11:00 English", "11:00-12:00 Electronics"],
        FRIDAY: ["9:00-10:00 Math", "10:00-11:00 Physics Lab", "11:00-12:00 Electronics Lab"],
      },
    },
  },
  BCA: {
    CS: {
      "1": {
        MONDAY: ["9:00-10:00 Programming", "10:00-11:00 Math", "11:00-12:00 Computer Fundamentals"],
        TUESDAY: ["9:00-10:00 English", "10:00-11:00 Programming Lab", "11:00-12:00 Math"],
        WEDNESDAY: ["9:00-10:00 Programming", "10:00-11:00 Computer Fundamentals", "11:00-12:00 Workshop"],
        THURSDAY: ["9:00-10:00 English", "10:00-11:00 Programming", "11:00-12:00 Math"],
        FRIDAY: ["9:00-10:00 Programming Lab", "10:00-11:00 Computer Lab", "11:00-12:00 Project"],
      },
    },
  },
}

function normalizeProgram(program: string): string {
  const normalized = program.toUpperCase().replace(/[-\s]/g, "")
  if (normalized.includes("BTECH") || normalized.includes("BTech")) return "BTECH"
  if (normalized.includes("BCA")) return "BCA"
  return program.toUpperCase()
}

function normalizeSection(section: string): string {
  return section.toUpperCase().replace(/[-\s]/g, "")
}

function getDayFromDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
    return days[date.getDay()]
  } catch {
    return "MONDAY" // Default fallback
  }
}

function getTimeSlot(eventTime: string): string {
  // Convert event time to time slot format
  // This is a simplified version - in reality, you'd need more sophisticated time matching
  const time = eventTime.toLowerCase()
  if (time.includes("9") || time.includes("morning")) return "9:00-10:00"
  if (time.includes("10")) return "10:00-11:00"
  if (time.includes("11")) return "11:00-12:00"
  return "9:00-10:00" // Default
}

function findMissedLectures(participant: Participant, eventDay: string, eventTime: string): string[] {
  const normalizedProgram = normalizeProgram(participant.program)
  const normalizedSection = normalizeSection(participant.section)
  const semester = participant.semester.toString()
  const timeSlot = getTimeSlot(eventTime)

  const timetable = TIMETABLE_DATA[normalizedProgram as keyof typeof TIMETABLE_DATA]
  if (!timetable) return []

  const sectionTimetable = timetable[normalizedSection as keyof typeof timetable]
  if (!sectionTimetable) return []

  const semesterTimetable = sectionTimetable[semester as keyof typeof sectionTimetable]
  if (!semesterTimetable) return []

  const daySchedule = semesterTimetable[eventDay as keyof typeof semesterTimetable]
  if (!daySchedule) return []

  // Find lectures that conflict with the event time
  return daySchedule.filter((lecture) => lecture.startsWith(timeSlot.split("-")[0]))
}

/**
 * DEPRECATED: Use parseExcel from utils/parseExcel.ts for robust OD Excel parsing.
 * This function is kept for legacy reference only.
 */
// @deprecated
export async function parseExcelFile(_file: File): Promise<EventData> {
  throw new Error('parseExcelFile is deprecated. Use parseExcel from utils/parseExcel.ts instead.');
}

// Accepts either EventData (legacy) or ParsedExcelData (robust)
import type { ParsedExcelData } from "@/types/od"

type ODInput = EventData | ParsedExcelData

function isParsedExcelData(data: any): data is ParsedExcelData {
  return data && data.metadata && Array.isArray(data.students);
}

export function generateODMail(eventData: ODInput) {
  // Map robust ParsedExcelData to legacy fields for compatibility
  const meta = isParsedExcelData(eventData) ? eventData.metadata : eventData;
  const students = isParsedExcelData(eventData) ? eventData.students : (eventData as EventData).participants;

  const subject = `OD Request - ${'eventName' in meta ? meta.eventName : ''}`;

  const participantsList = students
    .map((p) => `${p.name} (${p.program} ${p.section} - Sem ${p.semester})`)
    .join("\n");

  const missedLecturesInfo = students
    .filter((p: any) => Array.isArray(p.missedLectures) && p.missedLectures.length > 0)
    .map((p: any) => `${p.name}: ${p.missedLectures.map((ml: any) => typeof ml === 'string' ? ml : ml.subject_name || 'Missed Lecture').join(", ")}`)
    .join("\n");

  const body = `Dear Faculty,

I hope this email finds you well.

I am writing to request On Duty (OD) approval for the following students who participated in "${'eventName' in meta ? meta.eventName : ''}" organized by the Amity Coding Club.

Event Details:
- Event Name: ${'eventName' in meta ? meta.eventName : ''}
- Coordinator: ${'coordinator' in meta ? meta.coordinator : ('facultyIncharge' in meta ? meta.facultyIncharge : '')}
- Date: ${'eventDate' in meta ? meta.eventDate : ('date' in meta ? meta.date : '')}
- Time: ${'eventTime' in meta ? meta.eventTime : ('time' in meta ? meta.time : '')}
- Venue: ${'eventVenue' in meta ? meta.eventVenue : ('place' in meta ? meta.place : '')}

Participating Students:
${participantsList}

${
  missedLecturesInfo
    ? `Missed Lectures:\n${missedLecturesInfo}`
    : "No lecture conflicts detected."
}

The students have actively participated in this educational event which contributes to their overall development and learning experience.

Please consider granting OD approval for the mentioned students.

Thank you for your consideration.

Best regards,
${'coordinator' in meta ? meta.coordinator : ('facultyIncharge' in meta ? meta.facultyIncharge : '')}
Amity Coding Club`;

  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoLink);
}

export function generateODReport(eventData: ODInput) {
  // Map robust ParsedExcelData to legacy fields for compatibility
  const meta = isParsedExcelData(eventData) ? eventData.metadata : eventData;
  const students = isParsedExcelData(eventData) ? eventData.students : (eventData as EventData).participants;

  const reportData = [
    ["OD Report - " + ('eventName' in meta ? meta.eventName : '')],
    ["Generated on: " + new Date().toLocaleDateString()],
    [],
    ["Event Details"],
    ["Event Name", 'eventName' in meta ? meta.eventName : ''],
    ["Coordinator", 'coordinator' in meta ? meta.coordinator : ('facultyIncharge' in meta ? meta.facultyIncharge : '')],
    ["Date", 'eventDate' in meta ? meta.eventDate : ('date' in meta ? meta.date : '')],
    ["Time", 'eventTime' in meta ? meta.eventTime : ('time' in meta ? meta.time : '')],
    ["Venue", 'eventVenue' in meta ? meta.eventVenue : ('place' in meta ? meta.place : '')],
    [],
    ["Participant Details"],
    ["Name", "Program", "Section", "Semester", "Missed Lectures"],
    ...students.map((p: any) => [
      p.name,
      p.program,
      p.section,
      p.semester,
      Array.isArray(p.missedLectures) && p.missedLectures.length > 0
        ? p.missedLectures.map((ml: any) => typeof ml === 'string' ? ml : ml.subject_name || 'Missed Lecture').join(", ")
        : "None",
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(reportData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "OD Report")

  const fileName = `OD_Report_${eventData.eventName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}
