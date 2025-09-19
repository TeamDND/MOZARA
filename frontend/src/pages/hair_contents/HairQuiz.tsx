import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';

interface QuizQuestion {
  question: string;
  answer: 'O' | 'X';
  explanation: string;
}

const HairQuiz: React.FC = () => {
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<'O' | 'X' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const generateQuizWithGemini = async (): Promise<QuizQuestion[]> => {
    try {
      const response = await apiClient.post('/ai/hair-quiz/generate');
      return response.data.items as QuizQuestion[];
    } catch (error: any) {
      console.error('퀴즈 생성 API 호출 실패:', error);
      throw new Error(error.response?.data?.message || '퀴즈 생성에 실패했습니다.');
    }
  };

  const initQuiz = async () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizData([]);
    setShowExplanation(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsLoading(true);

    try {
      const data = await generateQuizWithGemini();
      if (data.length === 0) throw new Error("API로부터 퀴즈 데이터를 받지 못했습니다.");
      setQuizData(data);
    } catch (error) {
      console.error("퀴즈 생성 오류:", error);
      alert('퀴즈를 만드는 데 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectAnswer = (answer: 'O' | 'X') => {
    if (showExplanation) return;
    
    setSelectedAnswer(answer);
    const currentQuestion = quizData[currentQuestionIndex];
    const correct = answer === currentQuestion.answer;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(prev => prev + 1);
    }
    
    setShowExplanation(true);
    
    if (currentQuestionIndex < quizData.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        setShowExplanation(false);
        setSelectedAnswer(null);
      }, 2000);
    } else {
      setTimeout(() => {
        setShowResult(true);
      }, 2000);
    }
  };

  const getResultMessage = () => {
    if (score >= 18) {
      return "완벽해요! 탈모 박사로 인정합니다.";
    } else if (score >= 12) {
      return "좋아요! 탈모에 대해 많이 알고 계시네요.";
    } else {
      return "아쉬워요. 매일 새로운 퀴즈를 통해 더 많은 정보를 알아가세요!";
    }
  };

  const progress = quizData.length > 0 ? ((currentQuestionIndex + 1) / quizData.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">AI가 오늘의 퀴즈를<br />새롭게 만들고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">퀴즈 결과</h3>
          <p className="text-lg mb-4">총 {quizData.length}문제 중 {score}문제를 맞혔습니다!</p>
          <p className="text-blue-600 font-semibold mb-6">{getResultMessage()}</p>
          <button
            onClick={initQuiz}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            새로운 퀴즈 풀기
          </button>
        </div>
      </div>
    );
  }

  if (quizData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <button
            onClick={initQuiz}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            퀴즈 시작하기
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quizData[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Question Counter */}
        <p className="text-right text-gray-600 mb-6">
          {currentQuestionIndex + 1} / {quizData.length}
        </p>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <p className="text-xl font-bold text-center text-gray-900 min-h-[80px] flex items-center justify-center">
            {currentQuestion.question}
          </p>
        </div>

        {/* O/X Options */}
        <div className="flex justify-center gap-8 mb-8">
          <button
            onClick={() => selectAnswer('O')}
            disabled={showExplanation}
            className={`w-32 h-32 rounded-full border-4 text-6xl font-bold transition-all ${
              showExplanation && selectedAnswer === 'O'
                ? isCorrect 
                  ? 'bg-green-100 border-green-500 text-green-600' 
                  : 'bg-red-100 border-red-500 text-red-600'
                : 'border-gray-300 text-blue-600 hover:scale-110 hover:border-blue-500'
            } ${showExplanation ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            O
          </button>
          
          <button
            onClick={() => selectAnswer('X')}
            disabled={showExplanation}
            className={`w-32 h-32 rounded-full border-4 text-6xl font-bold transition-all ${
              showExplanation && selectedAnswer === 'X'
                ? isCorrect 
                  ? 'bg-green-100 border-green-500 text-green-600' 
                  : 'bg-red-100 border-red-500 text-red-600'
                : 'border-gray-300 text-red-600 hover:scale-110 hover:border-red-500'
            } ${showExplanation ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            X
          </button>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className="bg-gray-100 rounded-lg p-6 text-center">
            <h3 className={`text-xl font-bold mb-3 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {isCorrect ? '정답입니다!' : '오답입니다!'}
            </h3>
            <p className="text-gray-700">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HairQuiz;
