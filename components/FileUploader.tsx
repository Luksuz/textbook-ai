"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Image } from "lucide-react"

interface FileUploaderProps {
  onFileChange: (file: File | null, fileType?: 'pdf' | 'image') => void
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      
      // Check file size limit (4.5MB)
      const maxSize = 4.5 * 1024 * 1024; // 4.5MB in bytes
      if (file.size > maxSize) {
        alert('File too large. Please select a file smaller than 4.5MB.')
        return
      }
      
      const fileType = getFileType(file)
      
      if (fileType) {
        onFileChange(file, fileType)
      } else {
        onFileChange(null)
        alert("Please upload a PDF file or an image file (JPEG, PNG, WebP, GIF, BMP, TIFF)")
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      
      // Check file size limit (4.5MB)
      const maxSize = 4.5 * 1024 * 1024; // 4.5MB in bytes
      if (file.size > maxSize) {
        alert('File too large. Please select a file smaller than 4.5MB.')
        e.target.value = '' // Clear the input
        return
      }
      
      const fileType = getFileType(file)
      
      if (fileType) {
        onFileChange(file, fileType)
      } else {
        onFileChange(null)
        alert("Please upload a PDF file or an image file (JPEG, PNG, WebP, GIF, BMP, TIFF)")
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
        onChange={handleFileInput} 
      />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">Drag and drop your file</h3>
      <p className="mt-1 text-xs text-gray-500">PDF or Image for Q&A extraction from educational content</p>
      
      <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
        <Button variant="outline" onClick={handleButtonClick} type="button" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Select PDF File
        </Button>
        <Button variant="outline" onClick={handleButtonClick} type="button" className="flex items-center gap-2">
          <Image className="h-4 w-4" />
          Select Image File
        </Button>
      </div>
      
              <p className="mt-2 text-xs text-gray-400">
          Supported: PDF, JPEG, PNG, WebP, GIF, BMP, TIFF (max 4.5MB)
        </p>
    </div>
  )
}
