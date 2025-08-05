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
import { AlertCircle, FileText, Upload, Image, Brain, Play } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ChatBot } from "@/components/ChatBot"

export default function Home() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [qaPairs, setQAPairs] = useState<QAPair[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processingStage, setProcessingStage] = useState<string>("")

  const handleFileChange = (selectedFile: File | null, selectedFileType?: 'pdf' | 'image') => {
    setFile(selectedFile)
    setFileType(selectedFileType || null)
    setError(null)
    setQAPairs([])
  }

  const handleStartQuiz = () => {
    if (qaPairs.length > 0) {
      localStorage.setItem('quiz-questions', JSON.stringify(qaPairs))
      router.push('/quiz')
    }
  }

  const handleSubmit = async () => {
    if (!file || !fileType) {
      setError("Please select a file")
      return
    }

    try {
      setIsProcessing(true)
      setProgress(0)
      setError(null)

      if (fileType === 'pdf') {
        // Handle PDF processing for Q&A extraction
        setProcessingStage("Extracting text from PDF")
        setProgress(10)
        
        // Create a FormData object to send the file
        const formData = new FormData()
        formData.append("pdf", file)

        // Call the PDF processing API
        const response = await fetch('/api/process-pdf', {
          method: 'POST',
          body: formData,
        })

        setProgress(50)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'PDF processing failed')
        }

        const result = await response.json()
        
        setProgress(90)

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to extract Q&A pairs from PDF')
        }

        setProcessingStage("Processing complete")
        setQAPairs(result.data.qaPairs || [])
        setProgress(100)
        
        // Store Q&A pairs in localStorage for quiz mode
        if (result.data.qaPairs && result.data.qaPairs.length > 0) {
          localStorage.setItem('quiz-questions', JSON.stringify(result.data.qaPairs))
        }
        
      } else if (fileType === 'image') {
        // Handle image processing for VCA extraction
        setProcessingStage("Processing image with Document AI and LangChain")
        setProgress(10)

        // Create a FormData object to send the image
        const formData = new FormData()
        formData.append("image", file)

        // Call the image processing API
        const response = await fetch('/api/process-image', {
          method: 'POST',
          body: formData,
        })

        setProgress(50)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Image processing failed')
        }

        const result: ImageExtractionResult = await response.json()
        
        setProgress(90)

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to extract Q&A pairs from image')
        }

        setProcessingStage("Processing complete")
        setQAPairs(result.data.qaPairs || [])
        setProgress(100)
        
        // Store Q&A pairs in localStorage for quiz mode
        if (result.data.qaPairs && result.data.qaPairs.length > 0) {
          localStorage.setItem('quiz-questions', JSON.stringify(result.data.qaPairs))
        }
      }
    } catch (err) {
      console.error(`Error processing ${fileType}:`, err)
      setError(`Failed to process ${fileType}. Please try again with a different file.`)
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
        Upload a PDF or Image to extract Q&A pairs from educational content
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {fileType === 'image' ? (
                <>
                  <Image className="h-5 w-5" />
                  Upload Image for Q&A
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Upload PDF or Image
                </>
              )}
            </CardTitle>
            <CardDescription>
              {fileType === 'image' 
                ? "Processing image for Q&A extraction using Document AI and OpenAI"
                : "Select a PDF or image to extract Q&A pairs from educational content"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader onFileChange={handleFileChange} />

            {file && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                {fileType === 'image' ? (
                  <Image size={16} />
                ) : (
                  <FileText size={16} />
                )}
                <span>
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
                {fileType && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {fileType.toUpperCase()}
                  </span>
                )}
              </div>
            )}

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
            <Button onClick={handleSubmit} disabled={!file || isProcessing} className="w-full">
              {isProcessing ? "Processing..." : "Extract Q&A Pairs"}
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
              {qaPairs.length > 0 ? `Found ${qaPairs.length} Q&A pairs from the ${fileType || 'document'}` :
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
                  ? `Processing ${fileType || 'file'}...`
                  : `No Q&A pairs extracted yet. Upload and process a ${fileType || 'document'} to get started.`}
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
