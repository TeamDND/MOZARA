import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronLeft, Sparkles, MessageCircle } from 'lucide-react';
import apiClient from '../../services/apiClient';

// 타입 정의
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  sources?: string[];
}

interface ChatResponse {
  response: string;
  sources: string[];
  conversation_id: string;
  timestamp: string;
  is_hair_related?: boolean;
}

interface ChatBotMessengerProps {
  onClose: () => void;
  isModalClosing?: boolean;
}

const ChatBotMessenger: React.FC<ChatBotMessengerProps> = ({ onClose, isModalClosing: propIsModalClosing }) => {
  const [isModalClosing, setIsModalClosing] = useState(false);
  // 로그인된 사용자 정보
  const getUserInfo = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          id: user.email || user.id || 'anonymous',
          nickname: user.nickname || user.name || '고객'
        };
      }
    } catch (e) {
      console.error('사용자 정보 가져오기 실패:', e);
    }
    return { id: 'anonymous', nickname: '고객' };
  };

  const userInfo = getUserInfo();
  const userId = userInfo.id;
  const userNickname = userInfo.nickname;
  const userConversationId = `chat_${userId}`;

  // 상태 관리
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem(`chatMessages_${userConversationId}`);
      if (savedMessages) {
        return JSON.parse(savedMessages);
      }
    } catch (e) {
      console.error('대화 기록 불러오기 실패:', e);
    }

    return [
      {
        id: '1',
        text: `안녕하세요! ${userNickname}님!\nHairfit AI 챗봇이에요.\n무엇을 도와드릴까요?`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relatedQuestions, setRelatedQuestions] = useState<{[key: string]: string[]}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 추천 질문
  const quickQuestions = [
    '마이신한포인트 조회',
    '아세안트 변경',
    '정책자원금',
    '통장사본 발급',
    '자주찾는메뉴',
    '금융용어사전',
    '금융계산기',
  ];

  // 실제 탈모 관련 추천 질문
  const hairQuestions = [
    '남성형 탈모 원인',
    '여성형 탈모 관리',
    '피나스테리드 효과',
    'DHT 억제 방법',
    '모발이식 비용',
    '탈모 예방법',
  ];

  // AI가 연관 질문을 생성하는 함수
  const getRelatedQuestions = async (botResponse: string): Promise<string[]> => {
    try {
      const response = await apiClient.post('/ai/rag-v2-check/generate-related-questions', {
        response: botResponse,
      });

      return response.data.questions || [];
    } catch (error) {
      console.error('연관 질문 생성 실패:', error);
      // 실패 시 기본 질문들 반환
      return [
        '이 치료법의 부작용은?',
        '다른 치료법도 있나요?',
        '효과가 언제 나타나나요?',
        '주의사항이 있나요?',
      ];
    }
  };

  // 메시지 변경 시 localStorage 저장
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(`chatMessages_${userConversationId}`, JSON.stringify(messages));
    }
  }, [messages, userConversationId]);

  // 모달이 닫혀있을 때 새로운 봇 메시지가 오면 모달을 다시 열기
  useEffect(() => {
    if (propIsModalClosing && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'bot' && lastMessage.timestamp) {
        // 최근 5초 이내의 봇 메시지라면 모달을 다시 열기
        const messageTime = new Date(lastMessage.timestamp).getTime();
        const now = new Date().getTime();
        if (now - messageTime < 5000) {
          // 모달을 다시 열기 위해 부모 컴포넌트에 알림
          window.dispatchEvent(new CustomEvent('openChatBot'));
        }
      }
    }
  }, [messages, propIsModalClosing]);

  // 스크롤 자동 이동
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 메시지 전송
  const sendMessage = async (text?: string) => {
    const messageText = text || inputMessage.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    // 메시지 추가 후 즉시 스크롤
    setTimeout(() => scrollToBottom(), 100);

    try {
      const response = await apiClient.post('/ai/rag-chat', {
        message: messageText,
        conversation_id: userConversationId,
      });

      const data: ChatResponse = response.data;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: data.timestamp,
        sources: data.is_hair_related ? data.sources : [], // 탈모 관련이 아니면 참고자료 숨기기
      };

      // 모달이 닫혀도 메시지와 연관 질문을 저장
      setMessages(prev => [...prev, botMessage]);
      
      // 봇 응답 후 연관 질문 생성 (모달이 닫혀도 실행)
      try {
        const questions = await getRelatedQuestions(data.response);
        setRelatedQuestions(prev => ({
          ...prev,
          [botMessage.id]: questions
        }));
      } catch (error) {
        console.error('연관 질문 생성 실패:', error);
      }
      
      // 봇 응답 후 스크롤 (모달이 열려있을 때만)
      if (!isModalClosing && !propIsModalClosing) {
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // 에러 메시지 후에도 스크롤 (모달이 열려있을 때만)
      if (!isModalClosing && !propIsModalClosing) {
        setTimeout(() => scrollToBottom(), 100);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 시간 포맷
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 새로운 대화 시작
  const handleNewConversation = async () => {
    try {
      // 서버에 대화 기록 초기화 요청
      await apiClient.post('/ai/rag-chat/clear', {
        conversation_id: userConversationId,
      });

      // 로컬 스토리지 초기화
      localStorage.removeItem(`chatMessages_${userConversationId}`);

      // 메시지를 초기 환영 메시지로 리셋
      setMessages([
        {
          id: '1',
          text: `안녕하세요! ${userNickname}님!\nHairfit AI 챗봇이에요.\n무엇을 도와드릴까요?`,
          sender: 'bot',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('대화 초기화 실패:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900">챗봇과 대화중</h2>
        </div>
        <button
          onClick={handleNewConversation}
          className="text-sm text-[#1F0101] font-medium hover:text-[#3F0202] transition-colors"
        >
          새로 질문하기
        </button>
      </div>

      {/* 환영 배너 */}
      <div className="bg-gradient-to-r from-[#1F0101] to-[#3F0202] mx-4 mt-4 rounded-2xl p-4 shadow-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium mb-1">
              안녕하세요!
            </p>
            <p className="text-white text-xs opacity-90">
              궁금한 점 언제든 드릴게요!
            </p>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message, index) => (
          <div key={message.id}>
            <div
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* 아바타 */}
                {message.sender === 'bot' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-[#1F0101] rounded-full flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* 메시지 말풍선 */}
                <div className="flex flex-col gap-1">
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-[#1F0101] text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.text}
                    </p>

                    {/* 출처 표시 */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">참고 자료:</p>
                        <div className="space-y-1">
                          {message.sources.map((source, idx) => (
                            <p key={idx} className="text-xs text-[#1F0101]">
                              • {source}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 시간 */}
                  <p
                    className={`text-xs text-gray-400 px-2 ${
                      message.sender === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>

            {/* 빠른 질문 (첫 번째 봇 메시지 바로 아래) */}
            {message.sender === 'bot' && index === 0 && messages.length === 1 && (
              <div className="mt-4 ml-10">
                <div className="flex flex-wrap gap-2">
                  {hairQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(question)}
                      className="max-w-72 min-w-fit px-3 py-2 bg-white text-gray-700 text-xs rounded-full border border-gray-200 hover:bg-gray-50 hover:border-[#1F0101] transition-colors shadow-sm text-left"
                      title={question}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 연관 질문 (AI 응답 후) */}
            {message.sender === 'bot' && index > 0 && relatedQuestions[message.id] && (
              <div className="mt-4 ml-10">
                <div className="flex flex-wrap gap-2">
                  {relatedQuestions[message.id].map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(question)}
                      className="max-w-72 min-w-fit px-3 py-2 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm text-left"
                      title={question}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 로딩 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-[#1F0101] rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>


      {/* 입력 영역 */}
      <div className="bg-white border-t px-4 py-3 shadow-lg">
        <div className="flex gap-2 items-center">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="궁금한점을 입력하세요."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1F0101]"
          />

          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="p-2 bg-[#1F0101] text-white rounded-full hover:bg-[#3F0202] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBotMessenger;