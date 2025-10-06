import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../utils/store';
import { User, Settings } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const isLoggedIn = !!(user.username && user.username.trim() !== '');

  const handleLogoClick = () => {
    if (isLoggedIn) {
      navigate('/daily-care');
    } else {
      navigate('/');
    }
  };

  const handleUserClick = () => {
    navigate('/mypage');
  };

  const handleAdminClick = () => {
    navigate('/admin');
  };

  const isAdmin = user.role === 'ROLE_ADMIN';

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-50">
      <div className="flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center active:scale-95"
          aria-label="뒤로가기"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6 text-black"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className="flex-1 flex justify-center">
          <button
            onClick={handleLogoClick}
            className="text-xl font-bold text-[#222222] hover:text-[#333333] transition-colors active:scale-95 font-kaushan"
          >
            HairFit
          </button>
        </div>

        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={handleAdminClick}
                className="flex items-center justify-center active:scale-95"
                aria-label="관리자 페이지"
                title="관리자 페이지"
              >
                <Settings className="h-5 w-5 text-[#222222]" />
              </button>
            )}
            <button
              onClick={handleUserClick}
              className="flex items-center justify-center active:scale-95 pl-1"
              aria-label="마이페이지"
            >
              <User className="h-5 w-5 mb-1 text-[#222222]" />
            </button>
          </div>
        ) : (
          <div className="w-6 h-6"></div>
        )}
      </div>
    </header>
  );
}