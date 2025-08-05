'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { QAPairCard } from '@/components/QAPairCard'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Trophy, Target, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { QAPair } from '@/lib/types'
import { ChatBot } from '@/components/ChatBot'

export default function QuizPage() {
  const router = useRouter()
  const [qaPairs, setQaPairs] = useState<QAPair[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [timeSpent, setTimeSpent] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isQuizCompleted, setIsQuizCompleted] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    // Load Q&A pairs from localStorage
    const storedQAPairs = localStorage.getItem('quiz-questions')
    if (storedQAPairs) {
      try {
        const parsedQAPairs = JSON.parse(storedQAPairs)
        setQaPairs(parsedQAPairs)
        setStartTime(Date.now())
      } catch (error) {
        console.error('Failed to parse stored Q&A pairs:', error)
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }, [router])

  useEffect(() => {
    // Timer for tracking time spent
    if (startTime && !isQuizCompleted) {
      const interval = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [startTime, isQuizCompleted])

  const handleAnswerSelect = (questionIndex: number, selectedOption: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < qaPairs.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      // Quiz completed
      setIsQuizCompleted(true)
      setShowResults(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const calculateResults = () => {
    const totalQuestions = qaPairs.length
    const correctAnswers = qaPairs.filter((qa, index) => 
      answers[index] === qa.correctAnswer
    ).length
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    return { totalQuestions, correctAnswers, score }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const restartQuiz = () => {
    setCurrentQuestionIndex(0)
    setAnswers({})
    setTimeSpent(0)
    setStartTime(Date.now())
    setIsQuizCompleted(false)
    setShowResults(false)
  }

  if (qaPairs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  const currentQuestion = qaPairs[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / qaPairs.length) * 100
  const { totalQuestions, correctAnswers, score } = calculateResults()

  if (showResults) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Quiz Results</h1>
          </div>

          {/* Results Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Your Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{score}%</div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{correctAnswers}</div>
                  <div className="text-sm text-gray-600">Correct Answers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{totalQuestions - correctAnswers}</div>
                  <div className="text-sm text-gray-600">Wrong Answers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{formatTime(timeSpent)}</div>
                  <div className="text-sm text-gray-600">Time Spent</div>
                </div>
              </div>

              <div className="mt-6 flex gap-4 justify-center">
                <Button onClick={restartQuiz} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Retake Quiz
                </Button>
                <Button variant="outline" onClick={() => setShowResults(false)}>
                  Review Answers
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Question Review */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Review Your Answers</h2>
            {qaPairs.map((qa, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {answers[index] === qa.correctAnswer ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">Question {index + 1}</h3>
                        <Badge variant={answers[index] === qa.correctAnswer ? "default" : "destructive"}>
                          {answers[index] === qa.correctAnswer ? "Correct" : "Wrong"}
                        </Badge>
                      </div>
                      <QAPairCard qaPair={qa} index={index} isQuizMode={false} />
                      {answers[index] !== undefined && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                          <p className="text-sm text-blue-700">
                            <span className="font-medium">Your answer:</span> {String.fromCharCode(65 + answers[index])}. {qa.options[answers[index]]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit Quiz
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Quiz Mode</h1>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(timeSpent)}
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {currentQuestionIndex + 1} of {qaPairs.length}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Question */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Question {currentQuestionIndex + 1}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-6">{currentQuestion.question}</h2>
              
              <div className="space-y-3">
                {currentQuestion.options.map((option, optionIndex) => (
                  <button
                    key={optionIndex}
                    onClick={() => handleAnswerSelect(currentQuestionIndex, optionIndex)}
                    className={`w-full p-4 border rounded-lg text-left transition-all ${
                      answers[currentQuestionIndex] === optionIndex
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-gray-500 min-w-[20px]">
                        {String.fromCharCode(65 + optionIndex)}.
                      </span>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              
              <div className="text-sm text-gray-600">
                {answers[currentQuestionIndex] !== undefined ? 'Answer selected' : 'Select an answer to continue'}
              </div>
              
              <Button
                onClick={handleNext}
                disabled={answers[currentQuestionIndex] === undefined}
                className={currentQuestionIndex === qaPairs.length - 1 ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {currentQuestionIndex === qaPairs.length - 1 ? 'Finish Quiz' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Question Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {qaPairs.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 rounded border-2 transition-all ${
                    index === currentQuestionIndex
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : answers[index] !== undefined
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chatbot */}
      <ChatBot qaPairs={qaPairs} context="Quiz mode - helping student understand the quiz content and learning material" />
    </div>
  )
}