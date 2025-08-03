"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react"

interface FileUploadProps {
  onFileUpload: (file: File) => void
  isLoading: boolean
}

export function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0])
      }
    },
    [onFileUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    disabled: isLoading,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
        isDragActive
          ? "border-yellow-400 bg-yellow-400/10"
          : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center space-y-4">
        {isLoading ? (
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-slate-900" />
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">{isLoading ? "Processing..." : "Upload Excel File"}</h3>
          <p className="text-slate-400 mb-4">
            {isDragActive ? "Drop the file here..." : "Drag & drop your .xlsx file here, or click to browse"}
          </p>
        </div>

        {!isLoading && (
          <Button
            type="button"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent"
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose File
          </Button>
        )}
      </div>
    </div>
  )
}
