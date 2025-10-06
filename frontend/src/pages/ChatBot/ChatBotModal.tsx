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

      {/* 모달 */}
      {isOpen && (
        <>
          {/* 블러 배경 */}
          <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-md pointer-events-auto" />

          {/* 모달 컨테이너 */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pt-20 pb-20 pointer-events-none">
            <div 
              ref={modalRef}
              className="relative w-full max-w-md h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn pointer-events-auto"
            >
              {/* 챗봇 메신저 컴포넌트 */}
              <ChatBotMessenger onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </>
      )}

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