"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, XCircle, ClipboardCopy, Send, Home } from "lucide-react"
import Image from "next/image"
import { FileUpload } from "@/components/file-upload"
import { DataPreview } from "@/components/data-preview"
import { parseExcel } from "@/utils/parseExcel"
/**
 * Existing imports
 */
import { generateODMail } from "@/lib/excel-utils"
import { buildGmailComposeUrl } from "@/lib/gmail-url-builder"
import { exportODReport } from "@/lib/report-exporter"
import type { ParsedExcelData } from "@/types/od"

type StudentWithMissedLectures = {
  name: string;
  program: string;
  section: string;
  semester: string;
  missedLectures?: Array<{
    subject?: string;
    subject_name?: string;
    faculty?: string;
    time?: string;
    room?: string;
  }>;
};

export default function ODGeneratorPage() {
  const [eventData, setEventData] = useState<ParsedExcelData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [gmailWarning, setGmailWarning] = useState<string | null>(null)
  // Modal state
  const [showMailModal, setShowMailModal] = useState(false)
  const [mailSubject, setMailSubject] = useState("")
  const [mailBody, setMailBody] = useState("")
  const [copyButtonText, setCopyButtonText] = useState("Copy to Clipboard")

  const handleFileUpload = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const data = await parseExcel(file)
      setEventData(data)
      setSuccess("File uploaded and parsed successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateMail = () => {
    if (!eventData) return
    // Compose subject/body for preview
    const meta = eventData.metadata
    const students = eventData.students as StudentWithMissedLectures[]
    const venue = meta.eventVenue || meta.place || ""
    const subject = `OD Request - ${meta.eventName || ''}`
    let body = `Dear Faculty,\n\n` +
      `I hope this email finds you well.\n\n` +
      `Please grant On Duty (OD) approval for the following students who participated in the event:\n\n` +
      `Event Name: ${meta.eventName || ''}\n` +
      `Coordinator: ${meta.coordinator || ''}\n` +
      `Date: ${meta.eventDate || ''}\n` +
      `Day: ${meta.day || ''}\n` +
      `Venue: ${venue}\n` +
      `Time: ${meta.eventTime || ''}\n\n` +
      `Participants:\n` +
      students.map(p => `${p.name} (${p.program} ${p.section} - Sem ${p.semester})`).join("\n") +
      "\n\n";
    // Missed lectures if any
    const missedLecturesInfo = students.map(p => {
      if (Array.isArray(p.missedLectures) && (p.missedLectures?.length ?? 0) > 0) {
        return `${p.name}:\n` + p.missedLectures?.map((ml: {
          subject?: string;
          subject_name?: string;
          time?: string;
        }) =>
          `- ${ml.subject || ml.subject_name || ''} ${ml.time ? '(' + ml.time + ')' : ''}`
        ).join("\n")
      }
      return ''
    }).filter(Boolean).join("\n\n")
    if (missedLecturesInfo) {
      body += `Missed Lectures:\n${missedLecturesInfo}\n\n`
    }
    body += `The students have actively participated in this educational event which contributes to their overall development and learning experience.\n\nPlease consider granting OD approval for the mentioned students.\n\nThank you for your consideration.\n\nBest regards,\n${meta.coordinator || ''}`
    setMailSubject(subject)
    setMailBody(body)
    setShowMailModal(true)
  }

  const handleGmailDraft = () => {
    if (!eventData) return
    setGmailWarning(null)
    // Compose subject/body as in generateODMail
    const meta = eventData.metadata
    const students = eventData.students as StudentWithMissedLectures[]
    const subject = `OD Request - ${meta.eventName || ''}`
    let body = `Dear Faculty,\n\n` +
      `I hope this email finds you well.\n\n` +
      `Please grant On Duty (OD) approval for the following students who participated in the event:\n\n` +
      `Event Name: ${meta.eventName || ''}\n` +
      `Coordinator: ${meta.coordinator || ''}\n` +
      `Date: ${meta.eventDate || ''}\n` +
      `Day: ${meta.day || ''}\n` +
      `Place: ${meta.place || ''}\n` +
      `Time: ${meta.eventTime || ''}\n\n` +
      `Participants:\n` +
      students.map(p => `${p.name} (${p.program} ${p.section} - Sem ${p.semester})`).join("\n") +
      "\n\n";
    // Missed lectures if any
    const missedLecturesInfo = students.map(p => {
      if (Array.isArray(p.missedLectures) && (p.missedLectures?.length ?? 0) > 0) {
        return `${p.name}:\n` + p.missedLectures?.map((ml: {
          subject?: string;
          subject_name?: string;
          time?: string;
        }) =>
          `- ${ml.subject || ml.subject_name || ''} ${ml.time ? '(' + ml.time + ')' : ''}`
        ).join("\n")
      }
      return ''
    }).filter(Boolean).join("\n\n")
    if (missedLecturesInfo) {
      body += `Missed Lectures:\n${missedLecturesInfo}\n\n`
    }
    body += `The students have actively participated in this educational event which contributes to their overall development and learning experience.\n\nPlease consider granting OD approval for the mentioned students.\n\nThank you for your consideration.\n\nBest regards,\n${meta.coordinator || ''}`

    const { url, tooLong } = buildGmailComposeUrl({ subject, body })
    if (tooLong) {
      setGmailWarning("Mail body too long for web draft. Please copy-paste manually.")
    }
    window.open(url, '_blank')
  }

  const handleCopyMail = () => {
    navigator.clipboard.writeText(`Subject: ${mailSubject}\n\n${mailBody}`)
    setCopyButtonText("Copied!")
    setSuccess("Mail content copied to clipboard!")
    
    // Reset button text after 2 seconds
    setTimeout(() => {
      setCopyButtonText("Copy to Clipboard")
    }, 2000)
  }

  const handleSendMail = () => {
    // Use buildGmailComposeUrl for Gmail
    const { url, tooLong } = buildGmailComposeUrl({ subject: mailSubject, body: mailBody })
    if (tooLong) {
      setGmailWarning("Mail body too long for web draft. Please copy-paste manually.")
    }
    window.open(url, '_blank')
    setShowMailModal(false)
  }

  const handleDownloadReport = () => {
    if (!eventData) return
    const result = exportODReport(eventData)
    if (!result.success) {
      setError(result.error || "Failed to generate report")
    } else {
      setSuccess("OD report downloaded successfully!")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Mail Preview Modal */}
      {showMailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-10 relative">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
              onClick={() => setShowMailModal(false)}
              aria-label="Close"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800">
              <Mail className="w-6 h-6 text-yellow-500" /> OD Mail Preview
            </h2>
            <div className="mb-6">
              <label className="block text-slate-700 font-semibold mb-2">Subject</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-lg"
                value={mailSubject}
                onChange={e => setMailSubject(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label className="block text-slate-700 font-semibold mb-2">Body</label>
              <textarea
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-slate-50 min-h-[350px] focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-200"
                value={mailBody}
                onChange={e => setMailBody(e.target.value)}
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#94a3b8 #e2e8f0'
                }}
              />
            </div>
            <div className="flex gap-4 justify-end">
              <Button
                onClick={handleCopyMail}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold flex items-center gap-2 px-6 py-3 text-lg"
              >
                <ClipboardCopy className="w-5 h-5" /> {copyButtonText}
              </Button>
              <Button
                onClick={handleSendMail}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-slate-900 font-semibold flex items-center gap-2 px-6 py-3 text-lg"
              >
                <Send className="w-5 h-5" /> Send Mail
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold px-6 py-2 rounded-lg flex items-center gap-2 transition-all duration-300"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-xl font-bold text-white">OD Generator</h1>
                <p className="text-sm text-slate-400">Upload & Process</p>
              </div>
              <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
                <Image 
                  src="/amity-coding-club-logo.png" 
                  alt="Amity Coding Club Logo" 
                  width={64} 
                  height={64}
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Upload Participation Sheet</h1>
            <p className="text-xl text-slate-300">
              Upload your Excel file to automatically generate OD mails and attendance reports
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <Alert className="mb-6 border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300">{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-yellow-400" />
                  File Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />

                <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-white mb-2">Expected Excel Format:</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Event Name, Coordinator, Date, Time, Place</li>
                    <li>• Student columns: Name, Program, Section, Semester</li>
                    <li>• Supports .xlsx format only</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Actions Section */}
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-yellow-400" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleGenerateMail}
                  disabled={!eventData}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-slate-900 font-semibold py-3 rounded-xl transition-all duration-300"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  OD Mail Preview
                </Button>

                <Button
                  onClick={handleGmailDraft}
                  disabled={!eventData}
                  className="w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h20.728A1.636 1.636 0 0 1 24 5.457zM12 14.182L21.818 6.545H2.182L12 14.182z"/>
                  </svg>
                  Open in Gmail
                </Button>

                <Button
                  onClick={handleDownloadReport}
                  disabled={!eventData}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white py-3 rounded-xl transition-all duration-300 bg-transparent"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download OD Report
                </Button>

                {gmailWarning && (
                  <Alert className="mt-4 border-yellow-500/50 bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-300">{gmailWarning}</AlertDescription>
                  </Alert>
                )}

                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-white mb-2">What happens next:</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Mail opens in your default email client</li>
                    <li>• Report downloads as Excel file</li>
                    <li>• All data processed locally</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Preview */}
          {eventData && (
            <div className="mt-8">
              <DataPreview eventData={eventData} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
