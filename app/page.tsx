"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
// Remove server action import - using API routes instead
import type { QAPair, ImageExtractionResult } from "@/lib/types"
import { FileUploader } from "@/components/FileUploader"
import { QAPairList } from "@/components/QAPairList"
import { MultiFileDisplay } from "@/components/MultiFileDisplay"
import { AlertCircle, FileText, Upload, Image, Brain, Play } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ChatBot } from "@/components/ChatBot"

export default function Home() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [fileTypes, setFileTypes] = useState<('pdf' | 'image')[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [qaPairs, setQAPairs] = useState<QAPair[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processingStage, setProcessingStage] = useState<string>("")

  const handleFileChange = (selectedFiles: File[] | null, selectedFileTypes?: ('pdf' | 'image')[]) => {
    setFiles(selectedFiles || [])
    setFileTypes(selectedFileTypes || [])
    setError(null)
    setQAPairs([])
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newFileTypes = fileTypes.filter((_, i) => i !== index)
    setFiles(newFiles)
    setFileTypes(newFileTypes)
    setError(null)
    setQAPairs([])
  }

  const handleStartQuiz = () => {
    if (qaPairs.length > 0) {
      localStorage.setItem('quiz-questions', JSON.stringify(qaPairs))
      router.push('/quiz')
    }
  }

  const removeDuplicateQAPairs = (qaPairs: QAPair[]): QAPair[] => {
    const seen = new Set<string>()
    return qaPairs.filter(qa => {
      const key = `${qa.question.toLowerCase().trim()}:${qa.options.join('|').toLowerCase()}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  const handleSubmit = async () => {
    if (!files.length || !fileTypes.length) {
      setError("Please select at least one file")
      return
    }

    // Check total file size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB in bytes
    if (totalSize > maxSize) {
      const totalSizeMB = Math.round(totalSize / 1024 / 1024 * 10) / 10
      setError(`Total file size too large: ${totalSizeMB}MB. Maximum total size: 4.5MB`)
      return
    }

    try {
      setIsProcessing(true)
      setProgress(0)
      setError(null)
      
      let allQAPairs: QAPair[] = []
      const totalFiles = files.length
      
      // Process each file sequentially
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex]
        const fileType = fileTypes[fileIndex]
        
        setProcessingStage(`Processing file ${fileIndex + 1}/${totalFiles}: ${file.name}`)
        
        // Calculate base progress for this file
        const fileBaseProgress = Math.round((fileIndex / totalFiles) * 95)
        const fileProgressRange = Math.round(95 / totalFiles)
        
        if (fileType === 'pdf') {
          // Handle PDF processing for Q&A extraction with chunk-based progress
          setProcessingStage(`Extracting text chunks from PDF: ${file.name}`)
          setProgress(fileBaseProgress + Math.round(fileProgressRange * 0.1))
          
          // Step 1: Extract chunks from PDF
          const formData = new FormData()
          formData.append("pdf", file)

          const chunksResponse = await fetch('/api/extract-chunks', {
            method: 'POST',
            body: formData,
          })

          setProgress(fileBaseProgress + Math.round(fileProgressRange * 0.2))

          if (!chunksResponse.ok) {
            const errorData = await chunksResponse.json()
            console.warn(`Failed to extract chunks from ${file.name}: ${errorData.error}`)
            continue // Skip this file and continue with next
          }

          const chunksResult = await chunksResponse.json()
          
          if (!chunksResult.success || !chunksResult.data?.chunks) {
            console.warn(`Failed to extract chunks from ${file.name}: ${chunksResult.error || 'Unknown error'}`)
            continue // Skip this file and continue with next
          }

          const chunks = chunksResult.data.chunks
          const totalChunks = chunks.length
          let fileQAPairs: QAPair[] = []

          setProcessingStage(`Processing ${totalChunks} page chunks from ${file.name}`)
        
          // Step 2: Process each chunk individually with progress updates
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]
            setProcessingStage(`Processing chunk ${i + 1}/${totalChunks} from ${file.name} (Pages ${chunk.pageRange})`)
            
            // Calculate progress within this file's range
            const chunkProgress = fileBaseProgress + Math.round(fileProgressRange * (0.2 + (i / totalChunks) * 0.7))
            setProgress(chunkProgress)

            try {
              const chunkResponse = await fetch('/api/process-chunk', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: chunk.text,
                  pageRange: chunk.pageRange,
                  chunkIndex: i,
                  totalChunks: totalChunks
                }),
              })

              if (!chunkResponse.ok) {
                const errorData = await chunkResponse.json()
                console.warn(`Failed to process chunk ${i + 1} from ${file.name}: ${errorData.error}`)
                continue // Skip failed chunks but continue processing
              }

              const chunkResult = await chunkResponse.json()
              
              if (chunkResult.success && chunkResult.data?.qaPairs) {
                fileQAPairs.push(...chunkResult.data.qaPairs)
              }
            } catch (chunkError) {
              console.warn(`Error processing chunk ${i + 1} from ${file.name}:`, chunkError)
              // Continue processing other chunks
            }
          }

          // Add this file's Q&A pairs to the overall collection
          allQAPairs.push(...fileQAPairs)
          
        } else if (fileType === 'image') {
          // Handle image processing for Q&A extraction
          setProcessingStage(`Processing image: ${file.name}`)
          setProgress(fileBaseProgress + Math.round(fileProgressRange * 0.2))

          // Create a FormData object to send the image
          const formData = new FormData()
          formData.append("image", file)

          // Call the image processing API
          const response = await fetch('/api/process-image', {
            method: 'POST',
            body: formData,
          })

          setProgress(fileBaseProgress + Math.round(fileProgressRange * 0.6))

          if (!response.ok) {
            const errorData = await response.json()
            console.warn(`Failed to process image ${file.name}: ${errorData.error}`)
            continue // Skip this file and continue with next
          }

          const result: ImageExtractionResult = await response.json()
          
          setProgress(fileBaseProgress + Math.round(fileProgressRange * 0.9))

          if (!result.success || !result.data) {
            console.warn(`Failed to extract Q&A pairs from ${file.name}: ${result.error || 'Unknown error'}`)
            continue // Skip this file and continue with next
          }

          // Add this file's Q&A pairs to the overall collection
          if (result.data.qaPairs && result.data.qaPairs.length > 0) {
            allQAPairs.push(...result.data.qaPairs)
          }
        }
      }
      
      // Finalize processing for all files
      setProcessingStage("Finalizing Q&A pairs from all files")
      setProgress(95)

      // Remove duplicates across all files
      const uniqueQAPairs = removeDuplicateQAPairs(allQAPairs)
      
      setProcessingStage("Processing complete")
      setQAPairs(uniqueQAPairs)
      setProgress(100)
      
      // Store Q&A pairs in localStorage for quiz mode
      if (uniqueQAPairs.length > 0) {
        localStorage.setItem('quiz-questions', JSON.stringify(uniqueQAPairs))
      }
    } catch (err) {
      console.error(`Error processing files:`, err)
      setError(`Failed to process files. Please try again with different files.`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 text-center">
        Document Q&A Extraction
      </h1>
      <p className="text-gray-600 mb-8 text-center">
        Upload multiple PDFs and/or Images to extract Q&A pairs from educational content (4.5MB total)
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Multiple Files
            </CardTitle>
            <CardDescription>
              Select multiple PDFs and/or images to extract Q&A pairs from educational content (4.5MB total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader onFileChange={handleFileChange} />

            <MultiFileDisplay 
              files={files} 
              fileTypes={fileTypes} 
              onRemoveFile={handleRemoveFile}
              showRemoveButton={!isProcessing}
            />

            {isProcessing && (
              <div className="mt-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{processingStage}</span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSubmit} 
              disabled={
                !files.length || 
                isProcessing || 
                files.reduce((sum, file) => sum + file.size, 0) > 4.5 * 1024 * 1024
              } 
              className="w-full"
            >
              {isProcessing ? "Processing..." : `Extract Q&A Pairs from ${files.length} file${files.length !== 1 ? 's' : ''}`}
              {!isProcessing && <Upload className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extracted Q&A Pairs
            </CardTitle>
            <CardDescription>
              {qaPairs.length > 0 ? `Found ${qaPairs.length} Q&A pairs from ${files.length} file${files.length !== 1 ? 's' : ''}` :
               "Q&A pairs will appear here after processing"}
            </CardDescription>
            {qaPairs.length > 0 && (
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleStartQuiz}
                  className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Start Quiz Mode
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Review Mode
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {qaPairs.length > 0 ? (
              <QAPairList qaPairs={qaPairs} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                {isProcessing
                  ? `Processing ${files.length} file${files.length !== 1 ? 's' : ''}...`
                  : `No Q&A pairs extracted yet. Upload and process files to get started.`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chatbot */}
      <ChatBot qaPairs={qaPairs} context="Processing page - helping with Q&A extraction from PDFs and images" />
    </main>
  )
}
