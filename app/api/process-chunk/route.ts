import { type NextRequest, NextResponse } from 'next/server'
import { generateQAPairs } from '@/lib/llm-utils'
import type { QAPair } from '@/lib/types'

interface ChunkRequest {
  text: string
  pageRange: string
  chunkIndex: number
  totalChunks: number
}

export async function POST(request: NextRequest) {
  try {
    const { text, pageRange, chunkIndex, totalChunks }: ChunkRequest = await request.json()

    if (!text || !pageRange) {
      return NextResponse.json({
        success: false,
        error: 'Text and page range are required'
      }, { status: 400 })
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Q&A extraction is not available. Please configure OpenAI API key.'
      }, { status: 503 })
    }

    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} (Pages ${pageRange})`)

    // Generate Q&A pairs for this chunk
    const qaPairs = await generateQAPairs(text, pageRange)

    return NextResponse.json({
      success: true,
      data: {
        qaPairs,
        chunkIndex,
        totalChunks,
        pageRange
      },
      metadata: {
        chunkIndex,
        totalChunks,
        pageRange,
        qaPairsCount: qaPairs.length
      }
    })

  } catch (error: any) {
    console.error('Error processing chunk:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process chunk'
    }, { status: 500 })
  }
}