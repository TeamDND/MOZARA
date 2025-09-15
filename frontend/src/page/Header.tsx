import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { clearUser } from '../store/userSlice';
import { clearToken } from '../store/tokenSlice';
import Login from '../user/Login';

export default function Header() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Redux에서 사용자 정보와 토큰 가져오기
  const user = useSelector((state: RootState) => state.user);
  const token = useSelector((state: RootState) => state.token.jwtToken);
  
  // 로그인 상태 확인
  const isLoggedIn = !!(user.username && token);

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsLoginModalOpen(false);
  };

  const handleLogoClick = () => {
    navigate('/');
  };


  const handleLogout = () => {
    dispatch(clearUser());
    dispatch(clearToken());
    navigate('/');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={handleLogoClick}
              className="text-lg sm:text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              毛자라
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <>
                <span className="text-xs sm:text-sm text-gray-700 hidden sm:block">
                  {user.nickname}님 환영합니다
                </span>
                <span className="text-xs text-gray-700 sm:hidden">
                  {user.nickname}님
                </span>
                <button 
                  onClick={() => navigate('/profile')}
                  className="p-2 sm:px-4 sm:py-2 text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                  title="내정보"
                >
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline text-sm">내정보</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 sm:px-4 sm:py-2 text-white bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                  title="로그아웃"
                >
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline text-sm">로그아웃</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/signup')}
                  className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50"
                >
                  <span className="hidden sm:inline">무료로 회원가입</span>
                  <span className="sm:hidden">회원가입</span>
                </button>
                <button 
                  onClick={handleLoginClick}
                  className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm text-white bg-gray-800 rounded-full hover:bg-gray-700"
                >
                  로그인
                </button>
              </>
            )}
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
