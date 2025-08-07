"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Image } from "lucide-react"

interface FileUploaderProps {
  onFileChange: (files: File[] | null, fileTypes?: ('pdf' | 'image')[]) => void
}

export function FileUploader({ onFileChange }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  // Helper function to determine file type
  const getFileType = (file: File): 'pdf' | 'image' | null => {
    if (file.type === "application/pdf") {
      return 'pdf'
    }
    
    const imageTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 
      'image/webp', 'image/gif', 'image/bmp', 'image/tiff'
    ]
    
    if (imageTypes.includes(file.type)) {
      return 'image'
    }
    
    return null
  }

  // Helper function to validate multiple files
  const validateFiles = (fileList: FileList | File[]): { valid: boolean, files: File[], fileTypes: ('pdf' | 'image')[], error?: string } => {
    const files = Array.from(fileList)
    const fileTypes: ('pdf' | 'image')[] = []
    
    // Check total size limit (4.5MB)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const maxTotalSize = 4.5 * 1024 * 1024; // 4.5MB in bytes
    
    if (totalSize > maxTotalSize) {
      const totalSizeMB = Math.round(totalSize / 1024 / 1024 * 10) / 10
      return {
        valid: false,
        files: [],
        fileTypes: [],
        error: `Total file size too large: ${totalSizeMB}MB. Maximum total size: 4.5MB`
      }
    }
    
    // Validate each file type
    for (const file of files) {
      const fileType = getFileType(file)
      if (!fileType) {
        return {
          valid: false,
          files: [],
          fileTypes: [],
          error: `Invalid file type: ${file.name}. Please upload PDF or image files only.`
        }
      }
      fileTypes.push(fileType)
    }
    
    return {
      valid: true,
      files,
      fileTypes
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validation = validateFiles(e.dataTransfer.files)
      
      if (validation.valid) {
        onFileChange(validation.files, validation.fileTypes)
      } else {
        onFileChange(null)
        alert(validation.error || "Invalid files")
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validation = validateFiles(e.target.files)
      
      if (validation.valid) {
        onFileChange(validation.files, validation.fileTypes)
      } else {
        onFileChange(null)
        alert(validation.error || "Invalid files")
        e.target.value = '' // Clear the input
      }
    }
  }

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center ${
        isDragging ? "border-primary bg-primary/5" : "border-gray-300"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff" 
        className="hidden" 
        ref={fileInputRef} 
        multiple
        onChange={handleFileInput} 
      />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">Drag and drop your files</h3>
      <p className="mt-1 text-xs text-gray-500">PDF or Image for Q&A extraction from educational content</p>
      
      <div className="mt-4 flex justify-center">
        <Button variant="outline" onClick={handleButtonClick} type="button" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Select Files
        </Button>
      </div>
      
              <p className="mt-2 text-xs text-gray-400">
          Supported: PDF, JPEG, PNG, WebP, GIF, BMP, TIFF (max 4.5MB total)
        </p>
    </div>
  )
}
