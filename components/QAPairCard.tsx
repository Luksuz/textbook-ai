import type { QAPair } from "@/lib/types"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, HelpCircle, Info, Check, X } from "lucide-react"
import { useState } from "react"

interface QAPairCardProps {
  qaPair: QAPair
  index: number
  isQuizMode?: boolean
}

export function QAPairCard({ qaPair, index, isQuizMode = false }: QAPairCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(!isQuizMode)

  // Format confidence as percentage
  const confidencePercent = Math.round(qaPair.confidence * 100)

  // Determine confidence color
  const getConfidenceColor = () => {
    if (qaPair.confidence >= 0.8) return "bg-green-100 text-green-800"
    if (qaPair.confidence >= 0.6) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const handleOptionSelect = (optionIndex: number) => {
    if (!isQuizMode) return
    setSelectedOption(optionIndex)
    setShowAnswer(true)
  }

  const getOptionStyle = (optionIndex: number) => {
    if (!showAnswer) {
      return "border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
    }
    
    if (optionIndex === qaPair.correctAnswer) {
      return "border-green-500 bg-green-50 text-green-800"
    }
    
    if (selectedOption === optionIndex && optionIndex !== qaPair.correctAnswer) {
      return "border-red-500 bg-red-50 text-red-800"
    }
    
    return "border-gray-200 bg-gray-50 text-gray-600"
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="w-full">
            <h3 className="font-medium text-gray-900 mb-4">{qaPair.question}</h3>

            {/* Multiple Choice Options */}
            <div className="space-y-3">
              {qaPair.options.map((option, optionIndex) => (
                <div
                  key={optionIndex}
                  className={`p-3 border rounded-lg transition-all ${getOptionStyle(optionIndex)}`}
                  onClick={() => handleOptionSelect(optionIndex)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-gray-500 min-w-[20px]">
                      {String.fromCharCode(65 + optionIndex)}.
                    </span>
                    <span className="text-sm">{option}</span>
                    {showAnswer && optionIndex === qaPair.correctAnswer && (
                      <Check className="h-4 w-4 text-green-600 ml-auto" />
                    )}
                    {showAnswer && selectedOption === optionIndex && optionIndex !== qaPair.correctAnswer && (
                      <X className="h-4 w-4 text-red-600 ml-auto" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Explanations */}
            {showAnswer && (
              <div className="mt-4 space-y-3">
                {/* Correct Answer Explanation */}
                <div className="bg-green-50 p-3 rounded-md text-sm border border-green-200">
                  <div className="flex gap-2 items-center text-green-700 mb-2">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">Why {String.fromCharCode(65 + qaPair.correctAnswer)} is correct:</span>
                  </div>
                  <p className="text-green-700">{qaPair.explanation}</p>
                </div>

                {/* Wrong Answer Explanations */}
                {selectedOption !== null && selectedOption !== qaPair.correctAnswer && (
                  <div className="bg-red-50 p-3 rounded-md text-sm border border-red-200">
                    <div className="flex gap-2 items-center text-red-700 mb-2">
                      <X className="h-4 w-4" />
                      <span className="font-medium">Why {String.fromCharCode(65 + selectedOption)} is wrong:</span>
                    </div>
                    <p className="text-red-700">{qaPair.wrongAnswerExplanations[selectedOption > qaPair.correctAnswer ? selectedOption - 1 : selectedOption]}</p>
                  </div>
                )}

                {/* All Wrong Answer Explanations (in non-quiz mode) */}
                {!isQuizMode && (
                  <div className="bg-gray-50 p-3 rounded-md text-sm border border-gray-200">
                    <div className="flex gap-2 items-center text-gray-600 mb-2">
                      <Info className="h-4 w-4" />
                      <span className="font-medium">Why other options are wrong:</span>
                    </div>
                    <div className="space-y-2">
                      {qaPair.wrongAnswerExplanations.map((explanation, idx) => {
                        const wrongOptionIndex = idx >= qaPair.correctAnswer ? idx + 1 : idx
                        return (
                          <p key={idx} className="text-gray-600">
                            <span className="font-medium">{String.fromCharCode(65 + wrongOptionIndex)}:</span> {explanation}
                          </p>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quiz Mode: Show Answer Button */}
            {isQuizMode && !showAnswer && (
              <button
                onClick={() => setShowAnswer(true)}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
              >
                Show Answer
              </button>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-2 pb-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span>Pages {qaPair.page_range}</span>
        </div>

        <Badge variant="outline" className={`${getConfidenceColor()} font-normal`}>
          Confidence: {confidencePercent}%
        </Badge>
      </CardFooter>
    </Card>
  )
}
