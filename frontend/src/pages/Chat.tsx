import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';

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
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '안녕하세요! 탈모 백과사전 챗봇입니다. 탈모와 관련된 궁금한 점이 있으시면 언제든 물어보세요! 😊',
      sender: 'bot',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 메시지 스크롤 자동 이동
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
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('챗봇 서버 응답 오류');
      }

      const data: ChatResponse = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: data.timestamp,
        sources: data.sources,
      };

      setMessages(prev => [...prev, botMessage]);
      setConversationId(data.conversation_id);

    } catch (error) {
      console.error('챗봇 오류:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '죄송합니다. 현재 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
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

  // 메시지 포맷팅
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">탈모 백과사전 챗봇</h1>
          <p className="text-sm text-gray-500">탈모 관련 궁금한 점을 물어보세요</p>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-white text-gray-900 rounded-bl-none shadow-sm border'
              }`}
            >
              {/* 아바타 (봇인 경우만) */}
              {message.sender === 'bot' && (
                <div className="flex items-start gap-2 mb-2">
                  <Bot className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                  <span className="text-xs text-gray-500 font-medium">AI 상담사</span>
                </div>
              )}

              {/* 메시지 내용 */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.text}
              </p>

              {/* 소스 정보 (봇 응답시) */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">참고 정보:</p>
                  <div className="space-y-1">
                    {message.sources.map((source, index) => (
                      <span
                        key={index}
                        className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mr-1"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 시간 */}
              <p className={`text-xs mt-2 ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 rounded-lg rounded-bl-none shadow-sm border px-4 py-2 flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-500">답변을 생성하고 있습니다...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="bg-white border-t px-4 py-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="탈모에 대해 궁금한 점을 물어보세요..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* 하단 힌트 */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          탈모 유형, 원인, 치료법, 예방법 등에 대해 질문해보세요
        </div>
      </div>
    </div>
  );
};

export default Chat;