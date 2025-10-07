import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatBotMessenger from './ChatBotMessenger';

// 전역 이벤트로 모달 열기/닫기
export const openChatBotModal = () => {
  window.dispatchEvent(new CustomEvent('openChatBot'));
};

export const closeChatBotModal = () => {
  window.dispatchEvent(new CustomEvent('closeChatBot'));
};

const ChatBotModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // 전역 이벤트 리스너
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('openChatBot', handleOpen);
    window.addEventListener('closeChatBot', handleClose);

    return () => {
      window.removeEventListener('openChatBot', handleOpen);
      window.removeEventListener('closeChatBot', handleClose);
    };
  }, []);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      {/* 플로팅 버튼 제거 - 네비게이션 바에서만 접근 */}

      {/* 블러 배경 - 모달이 열려있을 때만 */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-md pointer-events-auto" />
      )}

      {/* 모달 컨테이너 - 항상 렌더링하되 보이지 않게 */}
      <div
        className={`fixed inset-0 z-[101] flex items-center justify-center p-4 pt-20 pb-20 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          ref={modalRef}
          className={`relative w-full max-w-md h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            isOpen ? 'animate-fadeIn pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          {/* 챗봇 메신저 컴포넌트 - 항상 렌더링 */}
          <ChatBotMessenger
            onClose={() => {
              setIsOpen(false);
            }}
            isModalClosing={!isOpen}
          />
        </div>
      </div>

      {/* 애니메이션 스타일 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default ChatBotModal;