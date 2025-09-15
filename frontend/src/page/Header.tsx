import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../user/Login';

export default function Header() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
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
