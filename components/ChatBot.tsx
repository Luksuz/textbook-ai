'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send, Bot, User, X, Minimize2 } from 'lucide-react'
import type { QAPair } from '@/lib/types'
import { Dialog } from '@radix-ui/react-dialog'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatBotProps {
  qaPairs?: QAPair[]
  context?: string
}

export function ChatBot({ qaPairs = [], context }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hey there! How can I help you with the learning material? I can answer questions about the content, explain concepts, or help you understand the Q&A pairs better.',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          qaPairs,
          context,
          conversationHistory: messages.slice(-10) // Send last 10 messages for context
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chatbot error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again later.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Floating Chat Window */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 max-h-[calc(100vh-3rem)] ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        {isOpen && (
          <Card className={`w-96 shadow-2xl border-0 transition-all duration-300 flex flex-col ${
            isMinimized ? 'h-14' : 'h-[min(500px,calc(100vh-3rem))]'
          }`}>
            {/* Header */}
            <CardHeader className="p-3 pb-2 border-b bg-blue-600 text-white rounded-t-lg flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4" />
                Learning Assistant
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="h-6 w-6 p-0 text-white hover:bg-blue-700"
                  >
                    <Minimize2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-6 w-6 p-0 text-white hover:bg-blue-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardTitle>
              {!isMinimized && qaPairs.length > 0 && (
                <p className="text-xs text-blue-100">
                  Context: {qaPairs.length} Q&A pairs available
                </p>
              )}
            </CardHeader>

            {!isMinimized && (
              <>
                {/* Messages Area */}
                <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-full">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start gap-2 ${
                          message.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {message.role === 'user' ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                        </div>
                        
                        <div className={`flex-1 max-w-[80%] ${
                          message.role === 'user' ? 'text-right' : ''
                        }`}>
                          <div className={`rounded-lg px-3 py-2 text-sm ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white ml-auto'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 px-1">
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                          <Bot className="h-3 w-3" />
                        </div>
                        <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>

                {/* Input Area */}
                <CardFooter className="p-4 border-t bg-gray-50 flex-shrink-0">
                  <div className="w-full space-y-2">
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me about the learning material..."
                        disabled={isLoading}
                        className="flex-1 h-10"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        size="default"
                        className="h-10 px-3"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                </CardFooter>
              </>
            )}
          </Card>
        )}
      </div>

      {/* Floating Action Button */}
      <div className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${
        isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <Button
          size="lg"
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">Open learning assistant</span>
        </Button>
      </div>
    </>
  )
}