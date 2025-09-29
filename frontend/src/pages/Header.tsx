import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../utils/store';

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

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-50">
      <div className="flex items-center justify-center">
        <button 
          onClick={handleLogoClick}
          className="text-xl font-bold text-[#222222] hover:text-[#333333] transition-colors active:scale-95 font-kaushan"
        >
          HairFit
        </button>
      </div>
    </header>
  );
}