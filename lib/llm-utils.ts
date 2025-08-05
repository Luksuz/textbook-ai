import type { QAPair } from "./types"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function generateQAPairs(text: string, pageRange: string): Promise<QAPair[]> {
  try {
    // Create a prompt for the LLM to create multiple choice questions
    const prompt = `
      You are analyzing a syllabus/textbook content. Create multiple choice questions with exactly 4 options from the following text.
      
      TEXT TO ANALYZE:
      ${text}
      
      INSTRUCTIONS:
      1. Create multiple choice questions based on the content
      2. Each question must have exactly 4 options (A, B, C, D)
      3. One option is correct, three are wrong but plausible
      4. Provide explanation for why the correct answer is right
      5. Provide explanations for why each wrong answer is incorrect
      6. Focus on key concepts, definitions, examples, and important facts
      7. If this chunk contains overlap pages (marked as OVERLAP), only use content from those pages if it's relevant to the main content in this chunk
      
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
      
      Only return valid JSON. Extract 3-10 multiple choice Q&A pairs if available.
    `

    // Call the LLM using AI SDK
    const { text: responseText } = await generateText({
      model: openai("gpt-4.1-mini"),
      prompt,
      temperature: 0.3,
    })

    // Parse the JSON response
    try {
      // Find JSON in the response (in case the model adds any extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No valid JSON found in the response")
      }

      const jsonStr = jsonMatch[0]
      const responseData = JSON.parse(jsonStr)

      // Map the response to QAPair objects
      const qaPairs: QAPair[] = []

      for (const item of responseData.qa_pairs || []) {
        qaPairs.push({
          question: item.question || "Unknown question",
          options: item.options || ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: item.correctAnswer ?? 0,
          explanation: item.explanation || "",
          wrongAnswerExplanations: item.wrongAnswerExplanations || ["Wrong A", "Wrong B", "Wrong C"],
          page_range: pageRange,
          confidence: item.confidence || 0.7,
        })
      }

      return qaPairs
    } catch (parseError) {
      console.error("Error parsing LLM response:", parseError)
      return []
    }
  } catch (error) {
    console.error("Error generating Q&A pairs:", error)
    return []
  }
}
