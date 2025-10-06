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
      {!isLandingPage && <Header />}
      {/* Tailwind CSS: 메인 콘텐츠 영역 - BottomNavigationBar 높이만큼 하단 여백 추가 */}
      <main className={isLandingPage ? "" : "pt-16 pb-24"}>
        <Outlet />
      </main>
      {!isLandingPage && <BottomNavigationBar />}
      {/* <Footer /> */}
    </div>
  );
};

export default MainLayout;

