import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './page/MainLayout';
import SignUp from './user/SignUp';
import Login from './user/Login';
import BaspSelfCheck from './features/selfcheck/BaspSelfCheck';

// TypeScript: React 함수형 컴포넌트 타입 정의
const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/basp-check" element={<BaspSelfCheck />} />
      </Routes>
    </>
  );
};

export default App;

