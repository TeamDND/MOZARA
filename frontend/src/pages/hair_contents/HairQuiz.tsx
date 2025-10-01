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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto min-h-screen bg-white">
          <main className="px-4 py-6 flex flex-col items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#222222] border-t-transparent mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 font-medium">AI가 오늘의 퀴즈를<br />새롭게 만들고 있습니다...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto min-h-screen bg-white">
          <main className="px-4 py-6 flex flex-col items-center justify-center min-h-screen">
            <div className="w-full">
              {/* 결과 헤더 */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <span className="text-3xl">🎉</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">퀴즈 완료!</h2>
              </div>

              {/* 점수 카드 */}
              <div className="bg-white border border-gray-100 rounded-xl p-6 mb-4 shadow-sm">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#222222] mb-2">
                    {score} / {quizData.length}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    총 {quizData.length}문제 중 {score}문제를 맞혔습니다!
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 font-medium">{getResultMessage()}</p>
                  </div>
                </div>
              </div>

              {/* 다시 풀기 버튼 */}
              <button
                onClick={initQuiz}
                className="w-full bg-[#222222] text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-gray-800 transition-all active:scale-[0.98]"
              >
                새로운 퀴즈 풀기
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (quizData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto min-h-screen bg-white">
          <main className="px-4 py-6 flex flex-col items-center justify-center min-h-screen">
            <div className="text-center w-full">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                  <span className="text-4xl">❓</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">탈모 OX 퀴즈</h2>
                <p className="text-sm text-gray-600">
                  AI가 만드는 매일 새로운<br />탈모 상식 퀴즈에 도전하세요!
                </p>
              </div>
              <button
                onClick={initQuiz}
                className="w-full bg-[#222222] text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-gray-800 transition-all active:scale-[0.98]"
              >
                퀴즈 시작하기
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const currentQuestion = quizData[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto min-h-screen bg-white">
        <main className="px-4 py-6">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">탈모 OX 퀴즈</h2>
            <p className="text-sm text-gray-600">
              {currentQuestionIndex + 1} / {quizData.length} 문제
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
            <div 
              className="bg-[#222222] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Question Card */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6 shadow-sm">
            <div className="min-h-[120px] flex items-center justify-center">
              <p className="text-base font-semibold text-center text-gray-900 leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>
          </div>

          {/* O/X Options */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => selectAnswer('O')}
              disabled={showExplanation}
              className={`w-28 h-28 rounded-full border-4 text-5xl font-bold transition-all ${
                showExplanation && selectedAnswer === 'O'
                  ? isCorrect 
                    ? 'bg-green-100 border-green-500 text-green-600' 
                    : 'bg-red-100 border-red-500 text-red-600'
                  : 'bg-white border-gray-200 text-blue-600 hover:border-blue-500 active:scale-95'
              } ${showExplanation ? 'cursor-not-allowed opacity-75' : 'cursor-pointer shadow-sm'}`}
            >
              O
            </button>
            
            <button
              onClick={() => selectAnswer('X')}
              disabled={showExplanation}
              className={`w-28 h-28 rounded-full border-4 text-5xl font-bold transition-all ${
                showExplanation && selectedAnswer === 'X'
                  ? isCorrect 
                    ? 'bg-green-100 border-green-500 text-green-600' 
                    : 'bg-red-100 border-red-500 text-red-600'
                  : 'bg-white border-gray-200 text-red-600 hover:border-red-500 active:scale-95'
              } ${showExplanation ? 'cursor-not-allowed opacity-75' : 'cursor-pointer shadow-sm'}`}
            >
              X
            </button>
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className={`rounded-xl p-5 ${
              isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">
                  {isCorrect ? '✅' : '❌'}
                </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold mb-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {isCorrect ? '정답입니다!' : '오답입니다!'}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{currentQuestion.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Spacing for Mobile Navigation */}
          <div className="h-20"></div>
        </main>
      </div>
    </div>
  );
};

export default HairQuiz;
