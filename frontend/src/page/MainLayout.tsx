import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { CollapsibleSidebar } from '../components/navigation/collapsible-sidebar';

// TypeScript: MainLayout 컴포넌트 타입 정의
const MainLayout: React.FC = () => {
  return (
    // Tailwind CSS: 메인 레이아웃 컨테이너
    <div className="min-h-screen bg-gray-50">
      <CollapsibleSidebar />
      <Header />
      {/* Tailwind CSS: 메인 콘텐츠 영역 */}
      <main className="pt-16 pl-[4.5rem] pr-4 py-8">
        <div className="container mx-auto">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;

