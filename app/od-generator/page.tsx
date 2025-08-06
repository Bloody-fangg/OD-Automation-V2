"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react"
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
    try {
      generateODMail(eventData)
      setSuccess("OD mail generated! Check your email client.")
    } catch (err) {
      setError("Failed to generate mail")
    }
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
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center space-x-3 text-slate-300 hover:text-yellow-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">OD Generator</h1>
                <p className="text-sm text-slate-400">Upload & Process</p>
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
                  Generate OD Mail
                </Button>

                <Button
                  onClick={handleGmailDraft}
                  disabled={!eventData}
                  className="w-full bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white font-semibold py-3 rounded-xl transition-all duration-300"
                >
                  <Mail className="w-5 h-5 mr-2" />
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
