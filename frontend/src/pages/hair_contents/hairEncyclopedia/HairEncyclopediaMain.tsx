import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import CategoryPage from './components/CategoryPage';
import ArticlePage from './components/ArticlePage';
import AllCategoriesPage from './components/AllCategoriesPage';
import ThesisSearchPage from './components/ThesisSearchPage';

const HairEncyclopediaMain: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Container - PC에서도 모바일 레이아웃 중앙 정렬 */}
      <div className="max-w-md mx-auto min-h-screen bg-white">
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="category/overview" element={<CategoryPage />} />
          <Route path="category/:categoryId" element={<CategoryPage />} />
          <Route path="article/:articleId" element={<ArticlePage />} />
          <Route path="all-categories" element={<AllCategoriesPage />} />
          <Route path="thesis-search" element={<ThesisSearchPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default HairEncyclopediaMain;