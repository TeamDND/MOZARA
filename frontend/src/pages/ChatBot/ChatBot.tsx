import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, MessageSquare, BookOpen, Clock, ChevronDown, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';

// 타입 정의
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  sources?: string[];
  contextUsed?: boolean;
}

interface ChatResponse {
  response: string;
  sources: string[];
  conversation_id: string;
  timestamp: string;
  context_used?: boolean;
}

interface QuickQuestion {
  id: string;
  text: string;
  category: string;
}

const ChatBot: React.FC = () => {
  // 로그인된 사용자 정보 가져오기
  const getUserId = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.email || user.id || 'anonymous';
      }
    } catch (e) {
      console.error('사용자 정보 가져오기 실패:', e);
    }
    return 'anonymous';
  };

  // 사용자별 conversation_id 생성
  const userId = getUserId();
  const userConversationId = `chat_${userId}`;

  // 상태 관리
  const [messages, setMessages] = useState<Message[]>(() => {
    // localStorage에서 이전 대화 불러오기
    try {
      const savedMessages = localStorage.getItem(`chatMessages_${userConversationId}`);
      if (savedMessages) {
        return JSON.parse(savedMessages);
      }
    } catch (e) {
      console.error('대화 기록 불러오기 실패:', e);
    }

    // 기본 환영 메시지
    return [
      {
        id: '1',
        text: '안녕하세요! 저는 탈모 전문 AI 상담사입니다. 📚\n\n최신 의학 논문과 전문 자료를 바탕으로 탈모에 대한 정확한 정보를 제공해드립니다.\n\n이전 대화를 기억하고 있으니 이어서 질문하셔도 됩니다!\n\n궁금한 점이 있으시면 언제든 물어보세요! 😊',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        contextUsed: false,
      },
    ];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>(userConversationId);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  // refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 메시지 변경 시 localStorage에 저장
  useEffect(() => {
    if (messages.length > 1) { // 환영 메시지 이외의 메시지가 있을 때만 저장
      localStorage.setItem(`chatMessages_${userConversationId}`, JSON.stringify(messages));
    }
  }, [messages, userConversationId]);

  // 빠른 질문 목록
  const quickQuestions: QuickQuestion[] = [
    { id: '1', text: '남성형 탈모(AGA)의 원인과 치료법은?', category: '남성탈모' },
    { id: '2', text: '여성형 탈모(FPHL)는 어떻게 관리하나요?', category: '여성탈모' },
    { id: '3', text: '피나스테리드와 미녹시딜 효과 비교', category: '약물' },
    { id: '4', text: 'DHT가 탈모를 유발하는 원리는?', category: '원인' },
    { id: '5', text: '모발이식 FUE와 FUT 방법 차이점은?', category: '수술' },
    { id: '6', text: 'PRP 주사 치료는 효과가 있나요?', category: '시술' },
  ];

  // 스크롤 자동 이동
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 대화 ID 초기화
  useEffect(() => {
    setConversationId(`conv_${Date.now()}`);
  }, []);

  // 메시지 전송
  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowQuickQuestions(false);

    try {
      const response = await apiClient.post('/api/ai/rag-chat', {
        message: textToSend,
        conversation_id: conversationId,
      });

      const data: ChatResponse = response.data;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: data.timestamp,
        sources: data.sources,
        contextUsed: data.context_used,
      };

      setMessages(prev => [...prev, botMessage]);
      setConversationId(data.conversation_id);
      setIsConnected(true);

    } catch (error) {
      console.error('챗봇 오류:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '죄송합니다. 현재 서버에 연결할 수 없습니다. 네트워크 연결을 확인하고 잠시 후 다시 시도해주세요.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 빠른 질문 클릭
  const handleQuickQuestion = (question: QuickQuestion) => {
    sendMessage(question.text);
  };

  // 대화 새로 시작
  const resetConversation = () => {
    // localStorage에서 대화 기록 삭제
    localStorage.removeItem(`chatMessages_${userConversationId}`);

    // 환영 메시지로 초기화
    const welcomeMessage: Message = {
      id: '1',
      text: '안녕하세요! 저는 탈모 전문 AI 상담사입니다. 📚\n\n최신 의학 논문과 전문 자료를 바탕으로 탈모에 대한 정확한 정보를 제공해드립니다.\n\n이전 대화를 기억하고 있으니 이어서 질문하셔도 됩니다!\n\n궁금한 점이 있으시면 언제든 물어보세요! 😊',
      sender: 'bot',
      timestamp: new Date().toISOString(),
      contextUsed: false,
    };

    setMessages([welcomeMessage]);
    setShowQuickQuestions(true);
    setInputMessage('');

    // 백엔드에도 대화 기록 삭제 요청 (선택적)
    apiClient.post('/api/ai/rag-chat/clear', {
      conversation_id: userConversationId,
    }).catch(err => {});
  };

  // 시간 포맷팅
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 카테고리별 색상
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      '남성탈모': 'bg-blue-100 text-blue-700',
      '여성탈모': 'bg-pink-100 text-pink-700',
      '약물': 'bg-green-100 text-green-700',
      '원인': 'bg-orange-100 text-orange-700',
      '수술': 'bg-purple-100 text-purple-700',
      '시술': 'bg-red-100 text-red-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              탈모 전문 AI 상담사
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            </h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              최신 의학 논문 기반 RAG 시스템
            </p>
          </div>
        </div>
        <button
          onClick={resetConversation}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="새 대화 시작"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 메시지 목록 */}
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-sm shadow-lg'
                    : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
                }`}
              >
                {/* 봇 메시지 헤더 */}
                {message.sender === 'bot' && (
                  <div className="flex items-start gap-2 mb-2">
                    <Bot className="w-4 h-4 text-indigo-500 mt-1 flex-shrink-0" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">AI 상담사</span>
                      {message.contextUsed && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          논문 참조
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 메시지 내용 */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.text}
                </div>

                {/* 출처 정보 */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1 mb-2">
                      <BookOpen className="w-3 h-3 text-indigo-500" />
                      <span className="text-xs text-gray-500 font-medium">참고 자료</span>
                    </div>
                    <div className="space-y-1">
                      {message.sources.map((source, index) => (
                        <div
                          key={index}
                          className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-200 flex items-center gap-1"
                        >
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                          {source}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 시간 */}
                <div className={`flex items-center gap-1 mt-2 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            </div>

            {/* 빠른 질문 (첫 번째 봇 메시지의 시간 표시 바로 아래) */}
            {showQuickQuestions && message.sender === 'bot' && messages.indexOf(message) === 0 && (
              <div className="mt-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium text-gray-700">자주 묻는 질문</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {quickQuestions.map((question) => (
                      <button
                        key={question.id}
                        onClick={() => handleQuickQuestion(question)}
                        className="text-left p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(question.category)}`}>
                            {question.category}
                          </span>
                          <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-sm text-gray-700 group-hover:text-indigo-700">
                          {question.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 rounded-xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
              <Bot className="w-4 h-4 text-indigo-500" />
              <Loader className="w-4 h-4 animate-spin text-indigo-500" />
              <span className="text-sm text-gray-500">
                의학 자료를 검색하고 답변을 생성하고 있습니다...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="탈모에 대해 궁금한 점을 물어보세요..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* 하단 정보 */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              최신 의학 논문 기반
            </span>
            <span className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              {isConnected ? '연결됨' : '연결 실패'}
            </span>
          </div>
          <span>Enter 키로 전송</span>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;