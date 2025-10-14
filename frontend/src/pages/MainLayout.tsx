import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BottomNavigationBar from '../components/BottomNavigationBar';

// TypeScript: MainLayout 컴포넌트 타입 정의
const MainLayout: React.FC = () => {
  const location = useLocation();
  
  // LandingPage에서는 Header와 BottomNavigationBar 숨기기
  const isLandingPage = location.pathname === '/';
  
  return (
    // Tailwind CSS: 메인 레이아웃 컨테이너
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 우선 컨테이너 */}
      <div className="max-w-md mx-auto min-h-screen bg-white relative">
        {!isLandingPage && <Header />}
        {/* Tailwind CSS: 메인 콘텐츠 영역 */}
        <main className="pb-20">
          <Outlet />
        </main>
        {/* <Footer /> */}
      </div>
      {!isLandingPage && <BottomNavigationBar />}
    </div>
  );
};

export default MainLayout;

