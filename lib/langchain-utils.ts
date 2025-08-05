import OpenAI from "openai"
import { z } from "zod"
import type { QAPair } from "./types"
import { extractTextWithOCR } from "./document-ai-utils"

// Multiple Choice Q&A Pair Schema for structured extraction using Zod
const QAPairSchema = z.object({
  question: z.string().describe("The multiple choice question extracted from the text"),
  options: z.array(z.string()).length(4).describe("Exactly 4 multiple choice options"),
  correctAnswer: z.number().min(0).max(3).describe("Index of the correct answer (0-3)"),
  explanation: z.string().describe("Explanation for why the correct answer is right"),
  wrongAnswerExplanations: z.array(z.string()).length(3).describe("Explanations for why each of the other 3 options are wrong"),
  confidence: z.number().min(0).max(1).describe("Confidence score from 0 to 1"),
})

const QAPairsResponseSchema = z.object({
  qa_pairs: z.array(QAPairSchema),
})

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function processImageWithOpenAI(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{
  success: boolean
  data?: QAPair[]
  error?: string
  ocrText?: string
}> {
  try {
    console.log("=== Processing Image with OpenAI + Document AI ===")
    console.log("Image size:", imageBuffer.length, "bytes")
    console.log("MIME type:", mimeType)

    // Step 1: Extract text using Google Document AI OCR
    console.log("Step 1: Extracting text with Document AI OCR...")
    const ocrResult = await extractTextWithOCR(imageBuffer, mimeType)
    const extractedText = ocrResult.text

    if (!extractedText || extractedText.trim().length === 0) {
      return {
        success: false,
        error: "No text could be extracted from the image",
        ocrText: extractedText,
      }
    }

    console.log("OCR extraction successful. Text length:", extractedText.length)

    // Step 2: Process with OpenAI for Q&A extraction
    console.log("Step 2: Processing with OpenAI for Q&A extraction...")
    
    const openai = getOpenAIClient()

    // Create the completion with structured output using chat completions
    console.log('Processing extracted text with OpenAI...')
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_NAME || "gpt-4o",
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: "You are analyzing text content from documents. Create multiple choice questions with 4 options each from the following text."
        },
        {
          role: "user",
          content: `You are analyzing a document/textbook content. Create multiple choice questions with exactly 4 options from the following text.

TEXT TO ANALYZE:
${extractedText}

INSTRUCTIONS:
1. Create multiple choice questions based on the content
2. Each question must have exactly 4 options (A, B, C, D)
3. One option is correct, three are wrong but plausible
4. Provide explanation for why the correct answer is right
5. Provide explanations for why each wrong answer is incorrect
6. Focus on key concepts, definitions, examples, and important facts

OUTPUT FORMAT (JSON):
{
  "qa_pairs": [
    {
      "question": "What is the main concept discussed in this section?",
      "options": ["Correct answer", "Plausible wrong answer 1", "Plausible wrong answer 2", "Plausible wrong answer 3"],
      "correctAnswer": 0,
      "explanation": "Explanation for why option A is correct based on the text",
      "wrongAnswerExplanations": ["Why option B is wrong", "Why option C is wrong", "Why option D is wrong"],
      "confidence": 0.95
    }
  ]
}

Extract 3-10 multiple choice Q&A pairs if available. Return ONLY the JSON object with no additional text.`
        },
      ],
      response_format: { type: "json_object" }
    })

    console.log("OpenAI Q&A extraction completed")
    const rawContent = completion.choices[0].message.content
    
    if (!rawContent) {
      throw new Error("No content returned from OpenAI")
    }

    // Parse and validate with Zod
    try {
      const rawData = JSON.parse(rawContent)
      const validatedData = QAPairsResponseSchema.parse(rawData)

      // Map the response to QAPair objects
      const qaPairs: QAPair[] = []

      for (const item of validatedData.qa_pairs || []) {
        qaPairs.push({
          question: item.question || "Unknown question",
          options: (item.options && item.options.length === 4 
            ? item.options as [string, string, string, string] 
            : ["Option A", "Option B", "Option C", "Option D"]) as [string, string, string, string],
          correctAnswer: item.correctAnswer ?? 0,
          explanation: item.explanation || "",
          wrongAnswerExplanations: (item.wrongAnswerExplanations && item.wrongAnswerExplanations.length === 3 
            ? item.wrongAnswerExplanations as [string, string, string] 
            : ["Wrong A", "Wrong B", "Wrong C"]) as [string, string, string],
          page_range: "Extracted from image", // Since this comes from an image
          confidence: item.confidence || 0.7,
        })
      }

      console.log("Successfully extracted and validated Q&A pairs")

      return {
        success: true,
        data: qaPairs,
        ocrText: extractedText,
      }

    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError)
      return {
        success: false,
        error: `Failed to parse extraction results: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
        ocrText: extractedText,
      }
    }

  } catch (error) {
    console.error("Error in OpenAI processing:", error)
    return {
      success: false,
      error: `OpenAI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// Alternative method using image directly (if Document AI is not available)
export async function processImageDirectlyWithOpenAI(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{
  success: boolean
  data?: QAPair[]
  error?: string
  ocrText?: string
}> {
  try {
    console.log("=== Processing Image Directly with OpenAI Vision ===")

    const openai = getOpenAIClient()

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64')

    // Create the completion with structured output using chat completions
    console.log('Processing image directly with OpenAI vision...')
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_NAME || "gpt-4o",
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: "You are analyzing document/textbook images. Extract question-answer pairs from the content you can see in the image."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and extract question-answer pairs from any educational content you can see.

INSTRUCTIONS:
1. Look for questions and their corresponding answers in the image
2. Include practice questions, review questions, examples, etc.
3. For each Q&A pair, provide an explanation/context
4. Generate educational Q&A pairs that would help someone learn from this content

OUTPUT FORMAT (JSON):
{
  "qa_pairs": [
    {
      "question": "What is the main concept discussed?",
      "answer": "The correct answer here",
      "explanation": "Context or explanation from the image content",
      "confidence": 0.95
    }
  ]
}

Extract 3-15 Q&A pairs if available. Return ONLY the JSON object with no additional text.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" }
    })

    console.log("Direct OpenAI vision processing completed")
    const rawContent = completion.choices[0].message.content
    
    if (!rawContent) {
      throw new Error("No content returned from OpenAI")
    }

    // Parse and validate with Zod
    try {
      const rawData = JSON.parse(rawContent)
      const validatedData = QAPairsResponseSchema.parse(rawData)

      // Map the response to QAPair objects
      const qaPairs: QAPair[] = []

      for (const item of validatedData.qa_pairs || []) {
        qaPairs.push({
          question: item.question || "Unknown question",
          options: (item.options && item.options.length === 4 
            ? item.options as [string, string, string, string] 
            : ["Option A", "Option B", "Option C", "Option D"]) as [string, string, string, string],
          correctAnswer: item.correctAnswer ?? 0,
          explanation: item.explanation || "",
          wrongAnswerExplanations: (item.wrongAnswerExplanations && item.wrongAnswerExplanations.length === 3 
            ? item.wrongAnswerExplanations as [string, string, string] 
            : ["Wrong A", "Wrong B", "Wrong C"]) as [string, string, string],
          page_range: "Extracted from image (direct vision)", // Since this comes from direct image analysis
          confidence: item.confidence || 0.7,
        })
      }

      console.log("Successfully extracted Q&A pairs with direct vision")

      return {
        success: true,
        data: qaPairs,
      }

    } catch (parseError) {
      console.error("Error parsing direct vision response:", parseError)
      return {
        success: false,
        error: `Failed to parse extraction results: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
      }
    }

  } catch (error) {
    console.error("Error in direct OpenAI vision processing:", error)
    return {
      success: false,
      error: `Direct vision processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}