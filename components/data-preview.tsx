"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, User, Clock, GraduationCap } from "lucide-react"
import type { EventData } from "@/lib/excel-utils"

interface DataPreviewProps {
  eventData: EventData
}

export function DataPreview({ eventData }: DataPreviewProps) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-yellow-400" />
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Event Details */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-slate-300">Event</span>
            </div>
            <p className="text-white font-semibold">{eventData.eventName}</p>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-slate-300">Coordinator</span>
            </div>
            <p className="text-white font-semibold">{eventData.coordinator}</p>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-slate-300">Date & Time</span>
            </div>
            <p className="text-white font-semibold">{eventData.date}</p>
            <p className="text-slate-300 text-sm">{eventData.time}</p>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-slate-300">Venue</span>
            </div>
            <p className="text-white font-semibold">{eventData.place}</p>
          </div>
        </div>

        {/* Participants Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Participants ({eventData.participants.length})</h3>
            <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">
              {eventData.participants.filter((p) => p.missedLectures.length > 0).length} with missed lectures
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Program</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Section</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Semester</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Missed Lectures</th>
                </tr>
              </thead>
              <tbody>
                {eventData.participants.map((participant, index) => (
                  <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4 text-white font-medium">{participant.name}</td>
                    <td className="py-3 px-4 text-slate-300">{participant.program}</td>
                    <td className="py-3 px-4 text-slate-300">{participant.section}</td>
                    <td className="py-3 px-4 text-slate-300">{participant.semester}</td>
                    <td className="py-3 px-4">
                      {participant.missedLectures.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {participant.missedLectures.map((lecture, idx) => (
                            <Badge key={idx} variant="destructive" className="text-xs">
                              {lecture}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
                          No conflicts
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
