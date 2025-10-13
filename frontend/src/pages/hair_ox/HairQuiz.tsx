import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../../services/apiClient';
import { RootState } from '../../utils/store';

interface QuizQuestion {
  question: string;
  answer: 'O' | 'X';
  explanation: string;
}

interface QuizSubmission {
  userId: number;
  quizQuestions: QuizQuestion[]; // 퀴즈 문제들도 함께 제출
  answers: {
    questionIndex: number;
    userAnswer: 'O' | 'X';
  }[];
}

interface QuizResult {
  userId: number;
  totalQuestions: number;
  correctAnswers: number;
  earnedPoints: number;
  isPassed: boolean;
  questionResults: {
    questionIndex: number;
    question: string;
    correctAnswer: 'O' | 'X';
    userAnswer: 'O' | 'X';
    isCorrect: boolean;
    explanation: string;
  }[];
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
  const [userAnswers, setUserAnswers] = useState<('O' | 'X')[]>([]);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redux에서 사용자 정보 가져오기
  const { userId } = useSelector((state: RootState) => state.user);

  const generateQuizWithGemini = async (): Promise<QuizQuestion[]> => {
    try {
      const response = await apiClient.post('/api/ai/hair-quiz/generate');
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
    setUserAnswers([]);
    setQuizResult(null);
    setIsLoading(true);

    try {
      const data = await generateQuizWithGemini();
      if (data.length === 0) throw new Error("API로부터 퀴즈 데이터를 받지 못했습니다.");
      setQuizData(data);
      // 사용자 답변 배열 초기화
      setUserAnswers(new Array(data.length).fill(null));
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
    
    // 사용자 답변 저장
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = answer;
    setUserAnswers(newUserAnswers);
    
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
        // 퀴즈 완료 후 서버에 답변 제출
        submitQuizAnswers(newUserAnswers);
      }, 2000);
    }
  };

  // 퀴즈 답변 제출 함수
  const submitQuizAnswers = async (answers: ('O' | 'X')[]) => {
    if (!userId) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submission: QuizSubmission = {
        userId: userId,
        quizQuestions: quizData, // 퀴즈 문제들도 함께 제출
        answers: answers.map((answer, index) => ({
          questionIndex: index,
          userAnswer: answer
        }))
      };
      
      const response = await apiClient.post('/ai/hair-quiz/submit', submission);
      const result: QuizResult = response.data;
      
      setQuizResult(result);
      
      // 포인트 지급 알림
      if (result.isPassed && result.earnedPoints > 0) {
        alert(`🎉 퀴즈 통과! ${result.earnedPoints}포인트를 획득했습니다!`);
      }
      
    } catch (error: any) {
      console.error('퀴즈 제출 실패:', error);
      alert('퀴즈 결과 제출에 실패했습니다. 포인트가 지급되지 않을 수 있습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResultMessage = () => {
    if (score >= 10) {
      return "완벽해요! 탈모 박사로 인정합니다.";
    } else if (score >= 7) {
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
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 font-medium">{getResultMessage()}</p>
                    
                    {/* 서버 결과 표시 */}
                    {quizResult && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">서버 검증 결과:</span>
                          <span className={`font-semibold ${quizResult.isPassed ? 'text-green-600' : 'text-red-600'}`}>
                            {quizResult.correctAnswers}/{quizResult.totalQuestions} 정답
                          </span>
                        </div>
                        {quizResult.isPassed && quizResult.earnedPoints > 0 && (
                          <div className="mt-2 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              🎉 +{quizResult.earnedPoints}포인트 획득!
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 제출 중 표시 */}
                    {isSubmitting && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-center text-xs text-gray-500">
                          <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-gray-600 mr-2"></div>
                          결과 제출 중...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 결과별 상세 설명 */}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left">
                    <h3 className="text-sm font-bold text-blue-900 mb-2">📋 나의 결과 분석</h3>
                    <div className="text-xs text-gray-700 space-y-1">
                      {score >= 10 ? (
                        <>
                          <p>• 탈모에 대한 이해도가 매우 높습니다.</p>
                          <p>• 올바른 정보로 탈모를 관리하고 계시네요.</p>
                          <p>• 앞으로도 꾸준한 관심 부탁드립니다!</p>
                        </>
                      ) : score >= 7 ? (
                        <>
                          <p>• 탈모에 대한 기본 지식을 잘 갖추고 계십니다.</p>
                          <p>• 조금만 더 공부하면 전문가 수준!</p>
                          <p>• 틀린 문제를 복습해보세요.</p>
                        </>
                      ) : (
                        <>
                          <p>• 탈모에 대해 더 알아갈 기회입니다.</p>
                          <p>• 잘못된 정보로 탈모가 악화될 수 있어요.</p>
                          <p>• 매일 퀴즈로 올바른 지식을 쌓아가세요!</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 다시 풀기 버튼 */}
              <button
                onClick={initQuiz}
                className="w-full bg-[#1f0101] text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-[#2A0202] transition-all active:scale-[0.98]"
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
                className="w-full bg-[#1f0101] text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-[#2A0202] transition-all active:scale-[0.98]"
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
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">정답</p>
                    <p className="text-base font-bold text-gray-900">{currentQuestion.answer}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">문제풀이</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {currentQuestion.explanation || '해설이 없습니다.'}
                    </p>
                    {!currentQuestion.explanation && (
                      <p className="text-xs text-red-500 mt-2">
                        DEBUG: explanation 필드가 비어있습니다.
                      </p>
                    )}
                  </div>
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
