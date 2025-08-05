import { type NextRequest, NextResponse } from "next/server"
import { extractTextFromPDF } from "@/lib/pdf-utils"
import { generateQAPairs } from "@/lib/llm-utils"
import type { QAPair } from "@/lib/types"
import { getProcessingCapabilities } from "@/lib/env-config"

export async function POST(request: NextRequest) {
  try {
    console.log("=== PDF Processing API Route ===")

    // Check processing capabilities
    const capabilities = getProcessingCapabilities()
    if (!capabilities.pdfQAExtraction) {
      return NextResponse.json({ 
        success: false, 
        error: "PDF Q&A extraction is not available. Please configure OpenAI API key." 
      }, { status: 503 })
    }

    // Get form data from the request
    const formData = await request.formData()
    const pdfFile = formData.get("pdf") as File

    if (!pdfFile) {
      return NextResponse.json({ 
        success: false, 
        error: "No PDF file provided" 
      }, { status: 400 })
    }

    console.log("PDF file details:", { 
      name: pdfFile.name, 
      size: pdfFile.size, 
      type: pdfFile.type 
    })

    // Validate file type
    if (pdfFile.type !== "application/pdf") {
      return NextResponse.json({ 
        success: false,
        error: `Invalid file type: ${pdfFile.type}. Only PDF files are supported.` 
      }, { status: 400 })
    }

    // Validate file size (max 4.5MB for PDFs)
    const maxSize = 4.5 * 1024 * 1024 // 4.5MB
    if (pdfFile.size > maxSize) {
      return NextResponse.json({ 
        success: false,
        error: `File too large: ${Math.round(pdfFile.size / 1024 / 1024 * 10) / 10}MB. Maximum size: 4.5MB` 
      }, { status: 400 })
    }

    console.log("Extracting text from PDF...")
    
    // Extract text from PDF
    const chunks = await extractTextFromPDF(pdfFile)
    
    console.log(`Extracted ${chunks.length} chunks from PDF`)

    // Process chunks and extract Q&A pairs
    const allQAPairs: QAPair[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      console.log(`Processing chunk ${i + 1}/${chunks.length}...`)

      // Extract Q&A pairs from the current chunk
      const qaPairs = await generateQAPairs(chunk.text, chunk.pageRange)
      allQAPairs.push(...qaPairs)
    }

    console.log(`Extracted ${allQAPairs.length} total Q&A pairs`)

    // Post-process and remove duplicates
    const uniqueQAPairs = removeDuplicateQAPairs(allQAPairs)

    console.log(`After deduplication: ${uniqueQAPairs.length} unique Q&A pairs`)

    // Return the extracted Q&A pairs
    return NextResponse.json({
      success: true,
      data: {
        qaPairs: uniqueQAPairs
      },
      metadata: {
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        fileType: pdfFile.type,
        totalChunks: chunks.length,
        totalQAPairs: allQAPairs.length,
        uniqueQAPairs: uniqueQAPairs.length
      }
    })

  } catch (error: any) {
    console.error("Error in PDF processing API:", error)

    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 },
    )
  }
}

// Helper function to remove duplicate Q&A pairs
function removeDuplicateQAPairs(qaPairs: QAPair[]): QAPair[] {
  const uniquePairs: QAPair[] = []
  const questionSet = new Set<string>()

  for (const pair of qaPairs) {
    // Normalize the question for comparison
    const normalizedQuestion = pair.question.toLowerCase().trim()

    if (!questionSet.has(normalizedQuestion)) {
      questionSet.add(normalizedQuestion)
      uniquePairs.push(pair)
    }
  }

  return uniquePairs
}