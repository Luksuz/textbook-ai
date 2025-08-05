"use server"

import type { ProcessingOptions, QAPair, ExtractionResult } from "./types"
import { extractTextFromPDF } from "./pdf-utils"
import { generateQAPairs } from "./llm-utils"

export async function extractQAPairs(formData: FormData, options?: ProcessingOptions): Promise<ExtractionResult> {
  try {
    // Get the PDF file from the form data
    const pdfFile = formData.get("pdf") as File
    if (!pdfFile) {
      throw new Error("No PDF file provided")
    }

    // Update progress
    options?.onProgress?.("Extracting text from PDF", 10)

    // Extract text from PDF
    const chunks = await extractTextFromPDF(pdfFile)

    options?.onProgress?.("Processing text chunks", 40)

    // Process chunks and extract Q&A pairs
    const allQAPairs: QAPair[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      // Update progress based on chunk processing
      options?.onProgress?.(`Processing chunk ${i + 1}/${chunks.length}`, 40 + Math.round((i / chunks.length) * 50))

      // Extract Q&A pairs from the current chunk
      const qaPairs = await generateQAPairs(chunk.text, chunk.pageRange)
      allQAPairs.push(...qaPairs)
    }

    options?.onProgress?.("Finalizing results", 95)

    // Post-process and remove duplicates
    const uniqueQAPairs = removeDuplicateQAPairs(allQAPairs)

    options?.onProgress?.("Complete", 100)

    return {
      qaPairs: uniqueQAPairs,
    }
  } catch (error) {
    console.error("Error in extractQAPairs:", error)
    throw new Error("Failed to extract Q&A pairs from PDF")
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
