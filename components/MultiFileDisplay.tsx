"use client"

import { FileText, Image, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MultiFileDisplayProps {
  files: File[]
  fileTypes: ('pdf' | 'image')[]
  onRemoveFile?: (index: number) => void
  showRemoveButton?: boolean
}

export function MultiFileDisplay({ 
  files, 
  fileTypes, 
  onRemoveFile,
  showRemoveButton = false 
}: MultiFileDisplayProps) {
  if (files.length === 0) {
    return null
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2)
  const maxSizeMB = 4.5

  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">
          Selected Files ({files.length}):
        </div>
        <div className={`text-xs ${totalSize > maxSizeMB * 1024 * 1024 ? 'text-red-600' : 'text-gray-500'}`}>
          {totalSizeMB} MB / {maxSizeMB} MB
        </div>
      </div>
      
      <div className="max-h-48 overflow-y-auto space-y-1">
        {files.map((file, index) => (
          <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded group">
            {fileTypes[index] === 'image' ? (
              <Image size={16} className="text-blue-600" />
            ) : (
              <FileText size={16} className="text-green-600" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{file.name}</div>
              <div className="text-xs text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
            
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full whitespace-nowrap">
              {fileTypes[index]?.toUpperCase()}
            </span>
            
            {showRemoveButton && onRemoveFile && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemoveFile(index)}
              >
                <X size={12} />
              </Button>
            )}
          </div>
        ))}
      </div>
      
      {totalSize > maxSizeMB * 1024 * 1024 && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          ⚠️ Total file size exceeds the 4.5MB limit. Please remove some files.
        </div>
      )}
    </div>
  )
}
