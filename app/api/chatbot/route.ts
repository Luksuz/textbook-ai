import { type NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import type { QAPair } from '@/lib/types'

interface ChatRequest {
  message: string
  qaPairs?: QAPair[]
  context?: string
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { message, qaPairs = [], context, conversationHistory = [] }: ChatRequest = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({
        error: 'Message is required'
      }, { status: 400 })
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'Chatbot is not available. OpenAI API key not configured.'
      }, { status: 503 })
    }

    // Initialize ChatOpenAI with GPT-4o-mini
    const chatModel = new ChatOpenAI({
      modelName: 'gpt-4.1-mini',
      temperature: 0.7,
      maxTokens: 10000,
      openAIApiKey: process.env.OPENAI_API_KEY,
    })

    // Create context from Q&A pairs
    let qaContext = ''
    if (qaPairs.length > 0) {
      qaContext = `\n\nAvailable Q&A Content:\n${qaPairs.map((qa, index) => {
        const correctOption = qa.options[qa.correctAnswer]
        return `${index + 1}. Question: ${qa.question}
   Options: ${qa.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join(', ')}
   Correct Answer: ${String.fromCharCode(65 + qa.correctAnswer)}. ${correctOption}
   Explanation: ${qa.explanation}
   Page Range: ${qa.page_range}`
      }).join('\n\n')}`
    }

    // Create conversation context
    let conversationContext = ''
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nRecent Conversation:\n' + 
        conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')
    }

    // Create system message with context
    const systemMessage = new SystemMessage(`You are a helpful learning assistant designed to help students understand educational material. You have access to Q&A pairs from learning content and should use this information to provide accurate, helpful responses.

Guidelines:
1. Be friendly, encouraging, and supportive
2. Use the provided Q&A content to answer questions accurately
3. If asked about concepts covered in the Q&A pairs, reference the specific questions and explanations
4. Break down complex concepts into simpler terms
5. Provide examples and analogies when helpful
6. If a question is not covered in the available content, be honest about limitations but try to provide general guidance
7. Encourage active learning and critical thinking
8. Keep responses concise but informative (aim for 2-3 sentences for simple questions, more for complex explanations)

${context ? `Additional Context: ${context}` : ''}${qaContext}${conversationContext}`)

    const humanMessage = new HumanMessage(message)

    // Create the chain
    const outputParser = new StringOutputParser()
    const chain = chatModel.pipe(outputParser)

    // Get the response
    const response = await chain.invoke([systemMessage, humanMessage])

    return NextResponse.json({
      response: response.trim(),
      success: true
    })

  } catch (error) {
    console.error('Chatbot API error:', error)
    return NextResponse.json({
      error: 'Failed to process chatbot request',
      success: false
    }, { status: 500 })
  }
}