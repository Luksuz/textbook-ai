import { type NextRequest, NextResponse } from "next/server"
import { processImageWithOpenAI, processImageDirectlyWithOpenAI } from "@/lib/langchain-utils"
import { validateImageFormat, validateImageSize } from "@/lib/document-ai-utils"
import { getProcessingCapabilities } from "@/lib/env-config"

export async function POST(request: NextRequest) {
  try {
    console.log("=== Image Processing API Route ===")

    // Check processing capabilities
    const capabilities = getProcessingCapabilities()
    if (!capabilities.pdfQAExtraction) {
      return NextResponse.json({ 
        success: false, 
        error: "Image processing is not available. Please configure OpenAI API key." 
      }, { status: 503 })
    }

    // Get form data from the request
    const formData = await request.formData()
    const imageFile = formData.get("image") as File

    if (!imageFile) {
      return NextResponse.json({ 
        success: false, 
        error: "No image file provided" 
      }, { status: 400 })
    }

    console.log("File details:", { 
      name: imageFile.name, 
      size: imageFile.size, 
      type: imageFile.type 
    })

    // Validate file type
    if (!validateImageFormat(imageFile.type)) {
      const supportedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 
        'image/webp', 'image/gif', 'image/bmp', 'image/tiff'
      ]
      return NextResponse.json({ 
        success: false,
        error: `Invalid file type: ${imageFile.type}. Supported types: ${supportedTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Validate file size (max 4.5MB)
    if (!validateImageSize(imageFile.size, 4.5)) {
      return NextResponse.json({ 
        success: false,
        error: `File too large: ${Math.round(imageFile.size / 1024 / 1024 * 10) / 10}MB. Maximum size: 4.5MB` 
      }, { status: 400 })
    }

    // Convert image to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    const mimeType = imageFile.type

    // Choose processing method based on capabilities
    let result
    if (capabilities.documentAIOCR) {
      try {
        console.log("Using primary method: Document AI OCR + OpenAI...")
        result = await processImageWithOpenAI(imageBuffer, mimeType)
      } catch (primaryError) {
        console.warn("Document AI processing failed, falling back to direct vision:", primaryError)
        
        // Fallback: Direct OpenAI vision processing
        try {
          console.log("Using fallback method: Direct OpenAI vision...")
          result = await processImageDirectlyWithOpenAI(imageBuffer, mimeType)
        } catch (fallbackError) {
          console.error("Both processing methods failed:", fallbackError)
          return NextResponse.json({
            success: false,
            error: "Failed to process image with both Document AI and direct vision methods",
          }, { status: 500 })
        }
      }
    } else {
      try {
        console.log("Using direct OpenAI vision (Document AI not configured)...")
        result = await processImageDirectlyWithOpenAI(imageBuffer, mimeType)
      } catch (error) {
        console.error("Direct vision processing failed:", error)
        return NextResponse.json({
          success: false,
          error: "Failed to process image with direct vision method",
        }, { status: 500 })
      }
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "Unknown processing error",
      }, { status: 500 })
    }

    console.log("Image processing successful")

    // Return the extracted Q&A pairs
    return NextResponse.json({
      success: true,
      data: {
        qaPairs: result.data || []
      },
      metadata: {
        fileName: imageFile.name,
        fileSize: imageFile.size,
        fileType: imageFile.type,
        processingMethod: capabilities.documentAIOCR && result.ocrText ? "Document AI + OpenAI" : "Direct OpenAI Vision",
        totalQAPairs: result.data?.length || 0
      },
      ocrText: result.ocrText, // Include OCR text for debugging
    })

  } catch (error: any) {
    console.error("Error in image processing API:", error)

    // Handle specific error types
    if (error.code === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { 
          success: false,
          error: "Google Cloud authentication failed. Please check your credentials.",
        },
        { status: 401 },
      )
    }

    if (error.code === 'RESOURCE_EXHAUSTED') {
      return NextResponse.json(
        { 
          success: false,
          error: "API quota exceeded. Please try again later.",
        },
        { status: 429 },
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 },
    )
  }
}