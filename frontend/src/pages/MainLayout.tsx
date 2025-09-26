import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BottomNavigationBar from './BottomNavigationBar';

// TypeScript: MainLayout 컴포넌트 타입 정의
const MainLayout: React.FC = () => {
  return (
    // Tailwind CSS: 메인 레이아웃 컨테이너
    <div className="min-h-screen bg-gray-50">
      <Header />
      {/* Tailwind CSS: 메인 콘텐츠 영역 - BottomNavigationBar 높이만큼 하단 여백 추가 */}
      <main className="pt-16 pb-16">
        <Outlet />
      </main>
      <BottomNavigationBar />
      {/* <Footer /> */}
    </div>
  );
};

export default MainLayout;

