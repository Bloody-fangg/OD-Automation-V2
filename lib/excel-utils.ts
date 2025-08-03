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

export async function parseExcelFile(file: File): Promise<EventData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        if (jsonData.length < 3) {
          throw new Error("Excel file must contain at least event details and participant data")
        }

        // Parse event details (assuming they're in the first few rows)
        const eventName = jsonData[0]?.[1] || "Unknown Event"
        const coordinator = jsonData[1]?.[1] || "Unknown Coordinator"
        const date = jsonData[2]?.[1] || new Date().toLocaleDateString()
        const time = jsonData[3]?.[1] || "9:00 AM"
        const place = jsonData[4]?.[1] || "Unknown Venue"

        // Find participant data (look for headers)
        let participantStartRow = -1
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (
            row &&
            row.some(
              (cell) =>
                typeof cell === "string" &&
                (cell.toLowerCase().includes("name") || cell.toLowerCase().includes("student")),
            )
          ) {
            participantStartRow = i
            break
          }
        }

        if (participantStartRow === -1) {
          throw new Error("Could not find participant data in the Excel file")
        }

        const headers = jsonData[participantStartRow].map((h) => h?.toString().toLowerCase() || "")
        const nameIndex = headers.findIndex((h) => h.includes("name"))
        const programIndex = headers.findIndex((h) => h.includes("program") || h.includes("course"))
        const sectionIndex = headers.findIndex((h) => h.includes("section"))
        const semesterIndex = headers.findIndex((h) => h.includes("semester") || h.includes("sem"))

        if (nameIndex === -1 || programIndex === -1 || sectionIndex === -1 || semesterIndex === -1) {
          throw new Error("Required columns (Name, Program, Section, Semester) not found")
        }

        const participants: Participant[] = []
        const eventDay = getDayFromDate(date)

        for (let i = participantStartRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || !row[nameIndex]) continue

          const participant: Participant = {
            name: row[nameIndex]?.toString() || "",
            program: row[programIndex]?.toString() || "",
            section: row[sectionIndex]?.toString() || "",
            semester: row[semesterIndex]?.toString() || "",
            missedLectures: [],
          }

          if (participant.name.trim()) {
            participant.missedLectures = findMissedLectures(participant, eventDay, time)
            participants.push(participant)
          }
        }

        if (participants.length === 0) {
          throw new Error("No valid participant data found")
        }

        resolve({
          eventName,
          coordinator,
          date,
          time,
          place,
          participants,
        })
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}`))
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}

export function generateODMail(eventData: EventData) {
  const subject = `OD Request - ${eventData.eventName}`

  const participantsList = eventData.participants
    .map((p) => `${p.name} (${p.program} ${p.section} - Sem ${p.semester})`)
    .join("\n")

  const missedLecturesInfo = eventData.participants
    .filter((p) => p.missedLectures.length > 0)
    .map((p) => `${p.name}: ${p.missedLectures.join(", ")}`)
    .join("\n")

  const body = `Dear Faculty,

I hope this email finds you well.

I am writing to request On Duty (OD) approval for the following students who participated in "${eventData.eventName}" organized by the Amity Coding Club.

Event Details:
- Event Name: ${eventData.eventName}
- Coordinator: ${eventData.coordinator}
- Date: ${eventData.date}
- Time: ${eventData.time}
- Venue: ${eventData.place}

Participating Students:
${participantsList}

${
  missedLecturesInfo
    ? `Missed Lectures:
${missedLecturesInfo}`
    : "No lecture conflicts detected."
}

The students have actively participated in this educational event which contributes to their overall development and learning experience.

Please consider granting OD approval for the mentioned students.

Thank you for your consideration.

Best regards,
${eventData.coordinator}
Amity Coding Club`

  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(mailtoLink)
}

export function generateODReport(eventData: EventData) {
  const reportData = [
    ["OD Report - " + eventData.eventName],
    ["Generated on: " + new Date().toLocaleDateString()],
    [],
    ["Event Details"],
    ["Event Name", eventData.eventName],
    ["Coordinator", eventData.coordinator],
    ["Date", eventData.date],
    ["Time", eventData.time],
    ["Venue", eventData.place],
    [],
    ["Participant Details"],
    ["Name", "Program", "Section", "Semester", "Missed Lectures"],
    ...eventData.participants.map((p) => [
      p.name,
      p.program,
      p.section,
      p.semester,
      p.missedLectures.join(", ") || "None",
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(reportData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "OD Report")

  const fileName = `OD_Report_${eventData.eventName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}
