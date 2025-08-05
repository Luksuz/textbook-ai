import { type NextRequest, NextResponse } from 'next/server'
import { extractTextFromPDF } from '@/lib/pdf-utils'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File

    if (!pdfFile) {
      return NextResponse.json({
        success: false,
        error: 'No PDF file provided'
      }, { status: 400 })
    }

    // Validate file type
    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Please upload a PDF file.'
      }, { status: 400 })
    }

    // Validate file size (4.5MB limit)
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB
    if (pdfFile.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Please upload a PDF smaller than 4.5MB.'
      }, { status: 400 })
    }

    console.log(`Extracting chunks from PDF: ${pdfFile.name}`)

    // Extract text chunks from PDF (without generating Q&A pairs)
    const chunks = await extractTextFromPDF(pdfFile)

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No text could be extracted from the PDF'
      }, { status: 400 })
    }

    console.log(`Successfully extracted ${chunks.length} chunks from PDF`)

    return NextResponse.json({
      success: true,
      data: {
        chunks: chunks.map((chunk, index) => ({
          text: chunk.text,
          pageRange: chunk.pageRange,
          startPage: chunk.startPage,
          endPage: chunk.endPage,
          index
        }))
      },
      metadata: {
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        fileType: pdfFile.type,
        totalChunks: chunks.length
      }
    })

  } catch (error: any) {
    console.error('Error extracting chunks from PDF:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to extract chunks from PDF'
    }, { status: 500 })
  }
}