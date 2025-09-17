import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './page/MainLayout';
import LandingPage from './page/LandingPage';
import HairCheck from './page/HairCheck';
import SignUp from './user/SignUp';
import LogIn from './user/LogIn';
import BaspSelfCheck from './features/selfcheck/BaspSelfCheck';
import HairDamageAnalysis from './page/HairDamageAnalysis';
import HairChange from './page/HairChange';
import HairPT from './components/HairPT';
import HairLossProducts from './page/HairLossProducts';
import AiToolList from './page/AiToolList';
import MainContent from './page/MainContent';
import YouTubeVideos from './page/YouTubeVideos';
import HairEncyclopediaMain from './features/hairEncyclopedia/HairEncyclopediaMain';
import HairDiagnosis from './components/HairDiagnosis';
import HairQuiz from './components/HairQuiz';
import DailyCare from './page/DailyCare';

// TypeScript: React 함수형 컴포넌트 타입 정의
const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="main" element={<MainContent />} />
          <Route path="hair-check" element={<HairCheck />} />
          <Route path="hair-damage" element={<HairDamageAnalysis />} />
          <Route path="hair-change" element={<HairChange />} />
          <Route path="hair-pt" element={<HairPT />} />
          <Route path="hair-loss-products" element={<HairLossProducts />} />
          <Route path="youtube-videos" element={<YouTubeVideos />} />
          <Route path="basp-check" element={<BaspSelfCheck />} />
          <Route path="ai-tools" element={<AiToolList />} />
          <Route path="product-search" element={<HairLossProducts />} />
          <Route path="hair-encyclopedia/*" element={<HairEncyclopediaMain />} />
          <Route path="hair-diagnosis" element={<HairDiagnosis />} />
          <Route path="hair-quiz" element={<HairQuiz />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="login" element={<LogIn />} />
          <Route path="daily-care" element={<DailyCare />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;

