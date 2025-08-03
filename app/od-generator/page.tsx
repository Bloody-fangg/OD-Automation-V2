"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { DataPreview } from "@/components/data-preview"
import { processOdRequest } from "@/app/actions/processOd"
import type { ProcessResult } from "@/lib/types"

export default function ODGeneratorPage() {
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFileUpload = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await processOdRequest(file)
      setProcessResult(result)
      setSuccess(`File processed successfully! Found ${result.totalStudents} students with ${result.totalMissedLectures} missed lectures.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateMail = () => {
    if (!processResult) return

    try {
      // Open the mailto URL
      window.open(processResult.email.mailtoUrl, '_blank')
      setSuccess("OD mail opened in your email client!")
    } catch (err) {
      setError("Failed to open email client")
    }
  }

  const handleDownloadReport = () => {
    if (!processResult) return

    try {
      // For now, we'll create a simple CSV download
      // In a real implementation, you'd use the server action to generate the report
      const csvContent = generateCSVReport(processResult)
      downloadCSV(csvContent, `OD_Report_${processResult.metadata.eventName}_${processResult.metadata.date}.csv`)
      setSuccess("OD report downloaded successfully!")
    } catch (err) {
      setError("Failed to generate report")
    }
  }

  const generateCSVReport = (result: ProcessResult): string => {
    const headers = ["Student Name", "Program", "Section", "Semester", "Missed Lectures", "Faculty", "Room", "Time"]
    const rows = [headers.join(",")]

    result.studentsWithMissed.forEach(student => {
      if (student.missedLectures.length > 0) {
        student.missedLectures.forEach(lecture => {
          const row = [
            student.name,
            student.program,
            student.section,
            student.semester,
            `${lecture.subject_code} - ${lecture.subject_name}`,
            lecture.faculty,
            lecture.room,
            lecture.time
          ].map(field => `"${field}"`).join(",")
          rows.push(row)
        })
      } else {
        const row = [
          student.name,
          student.program,
          student.section,
          student.semester,
          "No conflicts",
          "",
          "",
          ""
        ].map(field => `"${field}"`).join(",")
        rows.push(row)
      }
    })

    return rows.join("\n")
  }

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
                    <li>• Rows 2-7: Event metadata (Name, Coordinator, Date, Day, Place, Time)</li>
                    <li>• Row 10: Headers (Student Name, Program, Section, Semester)</li>
                    <li>• Row 11+: Student data</li>
                    <li>• Time format: 9:15-10:10_10:15-11:10 (multiple slots separated by _)</li>
                    <li>• Supports .xlsx format only</li>
                  </ul>
                  
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent"
                      onClick={() => {
                        // Create a simple CSV template for now
                        const templateContent = `Event Name:,Hack@Amity
Coordinator:,Dr. XYZ
Event Date:,02-08-2025
Day:,Monday
Place:,D Block Seminar Hall
Event Time:,9:15-10:10_10:15-11:10_14:15-15:10
,,,
Student Name,Program,Section,Semester
Adarsh Singh,CSE,A,2
Aryan Tomar,IT,D,8
Namma Singh,BCA,E,6`
                        
                        const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' })
                        const link = document.createElement('a')
                        const url = URL.createObjectURL(blob)
                        link.setAttribute('href', url)
                        link.setAttribute('download', 'OD_Template.csv')
                        link.style.visibility = 'hidden'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
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
                  disabled={!processResult}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-slate-900 font-semibold py-3 rounded-xl transition-all duration-300"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Generate OD Mail
                </Button>

                <Button
                  onClick={handleDownloadReport}
                  disabled={!processResult}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white py-3 rounded-xl transition-all duration-300 bg-transparent"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download OD Report
                </Button>

                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-white mb-2">What happens next:</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Mail opens in your default email client</li>
                    <li>• Report downloads as Excel file</li>
                    <li>• All data processed locally</li>
                  </ul>
                </div>

                {/* Processing Stats */}
                {processResult && (
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <h4 className="text-sm font-semibold text-white mb-2">Processing Results:</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• Total Students: {processResult.totalStudents}</li>
                      <li>• Missed Lectures: {processResult.totalMissedLectures}</li>
                      <li>• Processing Time: {processResult.processingTime}ms</li>
                      {processResult.unmatched.length > 0 && (
                        <li>• Unmatched: {processResult.unmatched.length} students</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Preview */}
          {processResult && (
            <div className="mt-8">
              <DataPreview eventData={processResult} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
