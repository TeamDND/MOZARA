import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './pages/MainLayout';
import LandingPage from './pages/LandingPage';
import SignUp from './pages/users/SignUp';
import LogIn from './pages/users/LogIn';
import HairChange from './pages/hair_change/HairChange';
import HairPT from './pages/hair_pt/HairPT';
import HairLossProducts from './pages/hair_product/HairLossProducts';
import MainContent from './pages/MainContent';
import YouTubeVideos from './pages/hair_tube/YouTubeVideos';
import HairEncyclopediaMain from './pages/hairEncyclopedia/HairEncyclopediaMain';
import HairDiagnosis from './pages/check/HairDiagnosis';
import HairQuiz from './pages/hair_ox/HairQuiz';
import MainPage from './pages/MainPage';
import DailyCare from './pages/hair_dailycare/DailyCare';
import StoreFinder from './pages/hair_map/StoreFinder';


// new_fn_flow.md에 따른 새로운 컴포넌트들
import Dashboard from './pages/hair_dailycare/Dashboard';
import IntegratedDiagnosis from './pages/check/IntegratedDiagnosis';
import DiagnosisResults from './pages/check/DiagnosisResults';
import ProgressTracking from './pages/hair_dailycare/ProgressTracking';
import WeeklyChallenges from './pages/hair_dailycare/WeeklyChallenges';
import VirtualHairstyle from './pages/hair_change/VirtualHairstyle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlantGrowth } from './components/PlantGrowth';
import MyPage from './pages/mypage/MyPage';
import MyReportPage from './pages/mypage/MyReportPage';
import Chat from './pages/ChatBot/Chat';
import ChatBotModal from './pages/ChatBot/ChatBotModal';
import PointExchange from './pages/hair_pt/PointExchange';

// TypeScript: React 함수형 컴포넌트 타입 정의
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      {/* 전역 챗봇 모달 */}
      <ChatBotModal />

      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPage />} />
          {/* 메인 플로우 (Main Flow) - new_fn_flow.md */}
          <Route path="landing" element={<LandingPage />} />
          <Route path="login" element={<LogIn />} />
          <Route path="integrated-diagnosis" element={<IntegratedDiagnosis />} />
          <Route path="diagnosis-results" element={<DiagnosisResults />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* 추가 기능 화면들 (Additional Features) */}
          <Route path="progress-tracking" element={<ProgressTracking />} />
          <Route path="weekly-challenges" element={<WeeklyChallenges />} />
          <Route path="virtual-hairstyle" element={<VirtualHairstyle />} />

          {/* 기존 라우트들 (호환성 유지) */}
          <Route path="main-contents" element={<MainContent />} />
          <Route path="hair-change" element={<HairChange />} />
          <Route path="hair-pt" element={<HairPT />} />
          <Route path="hair-loss-products" element={<HairLossProducts />} />
          <Route path="youtube-videos" element={<YouTubeVideos />} />
          <Route path="product-search" element={<HairLossProducts />} />
          <Route path="hair-encyclopedia/*" element={<HairEncyclopediaMain />} />
          <Route path="hair-diagnosis" element={<HairDiagnosis />} />
          <Route path="hair-quiz" element={<HairQuiz />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="main-page" element={<MainPage />} />
          <Route path="d-care" element={<DailyCare />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="my-report" element={<MyReportPage />} />
          <Route path="store-finder" element={<StoreFinder />} />
          {/* Chat 라우트 제거 - 이제 모달로 사용 */}
          <Route path="chat" element={<Chat />} />
          <Route path="point-exchange" element={<PointExchange />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

export default App;