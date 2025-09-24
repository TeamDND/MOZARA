import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './pages/MainLayout';
import LandingPage from './pages/LandingPage';
import HairCheck from './pages/check/HairCheck';
import SignUp from './pages/users/SignUp';
import LogIn from './pages/users/LogIn';
import HairDamageAnalysis from './pages/check/HairDamageAnalysis';
import HairChange from './pages/hair_contents/HairChange';
import HairPT from './pages/hair_solutions/HairPT';
import HairLossProducts from './pages/hair_solutions/HairLossProducts';
import AiToolList from './pages/AiToolList';
import MainContent from './pages/MainContent';
import YouTubeVideos from './pages/hair_contents/YouTubeVideos';
import HairEncyclopediaMain from './pages/hair_contents/hairEncyclopedia/HairEncyclopediaMain';
import HairDiagnosis from './pages/check/HairDiagnosis';
import HairQuiz from './pages/hair_contents/HairQuiz';  
import DailyCare from './pages/hair_solutions/DailyCare';
import LandingPageV2 from './pages/LandingPageV2';
import StoreFinder from './pages/StoreFinder';

// TypeScript: React 함수형 컴포넌트 타입 정의
const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPageV2 />} />
          {/* <Route index element={<LandingPage />} /> */}
          <Route path="main" element={<MainContent />} />
          <Route path="hair-check" element={<HairCheck />} />
          <Route path="hair-damage" element={<HairDamageAnalysis />} />
          <Route path="hair-change" element={<HairChange />} />
          <Route path="hair-pt" element={<HairPT />} />
          <Route path="hair-loss-products" element={<HairLossProducts />} />
          <Route path="youtube-videos" element={<YouTubeVideos />} />
          <Route path="ai-tools" element={<AiToolList />} />
          <Route path="product-search" element={<HairLossProducts />} />
          <Route path="hair-encyclopedia/*" element={<HairEncyclopediaMain />} />
          <Route path="hair-diagnosis" element={<HairDiagnosis />} />
          <Route path="hair-quiz" element={<HairQuiz />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="login" element={<LogIn />} />
          <Route path="daily-care" element={<DailyCare />} />
          <Route path="store-finder" element={<StoreFinder />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;

