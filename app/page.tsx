import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mail, Users, FileSpreadsheet, ArrowRight, Home, Upload } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
                <Image 
                  src="/amity-coding-club-logo.png" 
                  alt="Amity Coding Club Logo" 
                  width={64} 
                  height={64}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Amity Coding Club</h1>
                <p className="text-sm text-slate-400">OD Automation Portal</p>
              </div>
            </div>
            <nav className="flex space-x-4">
              <Link href="/od-generator">
                <Button className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-slate-900 font-semibold px-6 py-2 rounded-lg flex items-center gap-2 transition-all duration-300">
                  <Upload className="w-4 h-4" />
                  Generate OD
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              OD Mail Automation
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                Portal
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Generate faculty-ready OD mail & attendance reports instantly for student participants attending events.
            </p>
          </div>

          <div className="flex justify-center mb-16">
            <Link href="/od-generator">
              <Button
                size="lg"
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-slate-900 font-semibold px-12 py-6 text-xl rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Mark OD
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <FileSpreadsheet className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Smart Excel Parsing</h3>
              <p className="text-slate-400 leading-relaxed">
                Automatically extract event details and participant information from uploaded Excel sheets with
                intelligent data validation.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <Mail className="w-8 h-8 text-slate-900" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Instant Mail Generation</h3>
              <p className="text-slate-400 leading-relaxed">
                Generate professional OD mails with pre-formatted content ready to send to faculty members through your
                email client.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Attendance Tracking</h3>
              <p className="text-slate-400 leading-relaxed">
                Automatically detect missed lectures by matching event timings with student timetables and generate
                detailed reports.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-slate-400">© 2025 Amity Coding Club. Built for efficient event management.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
