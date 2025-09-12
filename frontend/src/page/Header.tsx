import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../user/Login';

export default function Header() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsLoginModalOpen(false);
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleHamburgerClick = () => {
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleHamburgerClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-6 h-6 flex flex-col justify-center gap-1">
                <div className="w-full h-0.5 bg-gray-600"></div>
                <div className="w-full h-0.5 bg-gray-600"></div>
                <div className="w-full h-0.5 bg-gray-600"></div>
              </div>
            </button>
            <button 
              onClick={handleLogoClick}
              className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              毛자라
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50">
              무료로 회원가입
            </button>
            <button 
              onClick={handleLoginClick}
              className="px-4 py-2 text-sm text-white bg-gray-800 rounded-full hover:bg-gray-700"
            >
              로그인
            </button>
          </div>
        </div>
      </header>

      {/* 사이드바 모달 */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50">
          {/* 배경 오버레이 */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleCloseSidebar}
          ></div>
          
          {/* 사이드바 */}
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="p-4">
              {/* 로고와 닫기 버튼 */}
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => {
                    handleCloseSidebar();
                    handleLogoClick();
                  }}
                  className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  毛자라
                </button>
                <button
                  onClick={handleCloseSidebar}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  ×
                </button>
              </div>
              
              {/* 사이드바 메뉴 */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-800 cursor-pointer">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">💬</div>
                  <span className="text-sm font-medium">채팅</span>
                </div>
                <div 
                  className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-800 cursor-pointer"
                  onClick={() => {
                    handleCloseSidebar();
                    navigate('/ai-tools');
                  }}
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">🛠️</div>
                  <span className="text-sm font-medium">도구</span>
                </div>
                <div 
                  className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-800 cursor-pointer"
                  onClick={() => {
                    handleCloseSidebar();
                    navigate('/hair-loss-products');
                  }}
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">🛍️</div>
                  <span className="text-sm font-medium">제품추천</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-800 cursor-pointer">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">📚</div>
                  <span className="text-sm font-medium">자료실</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={handleCloseModal}
              className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 shadow-lg"
            >
              ×
            </button>
            <Login />
          </div>
        </div>
      )}
    </>
  )
}
