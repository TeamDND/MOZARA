import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Search, X } from 'lucide-react';
import { categories, articles } from '../../../../utils/data/articles';

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const mainDisplayCategories = [
    'types', 'causes', 'treatment', 'scalp-health',
    'prevention', 'diagnosis', 'myths', 'recommendations'
  ].map(id => categories.find(c => c.id === id)!).filter(Boolean);

  // 아티클 검색 로직
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return articles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.summary.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query) ||
      article.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // 실시간 검색이므로 검색어가 있으면 자동으로 검색 결과 표시
  const shouldShowSearch = searchQuery.trim().length > 0;

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="space-y-12">
      {/* Navigation */}
      <div className="flex items-center mb-6">
        <Link
          to="/ai-tools"
          className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          AI 도구 모음
        </Link>
        <span className="text-gray-400">/</span>
        <span className="ml-4 text-gray-900 font-medium">탈모 백과</span>
      </div>

      <section className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          탈모 지식백과
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          탈모에 대한 모든 것을 한 곳에서. 전문적이고 신뢰할 수 있는 정보를 제공합니다.
        </p>
      </section>

      {/* 아티클 검색 섹션 */}
      <section className="mb-8">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="탈모 관련 아티클 검색... (예: 미녹시딜, 남성형 탈모, 모발이식)"
              className="w-full pl-12 pr-12 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 검색 결과 또는 주요 카테고리 */}
      {shouldShowSearch ? (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              검색 결과 ({searchResults.length}개)
            </h2>
            <button
              onClick={clearSearch}
              className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
            >
              <X className="w-4 h-4 mr-1" />
              검색 취소
            </button>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((article) => (
                <Link
                  key={article.id}
                  to={`/hair-encyclopedia/article/${article.id}`}
                  className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 border group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <span className={`px-2 py-1 ${article.category.color} text-white rounded-full mr-2`}>
                          {article.category.icon}
                        </span>
                        <span>{article.category.name}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-3">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>읽기 시간: {article.readTime}분</span>
                    <span className={`px-2 py-1 rounded-full ${
                      article.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                      article.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {article.difficulty === 'beginner' ? '초급' :
                       article.difficulty === 'intermediate' ? '중급' : '고급'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">🔍</div>
              <p className="text-gray-500 text-lg mb-2">
                "{searchQuery}"에 대한 아티클을 찾을 수 없습니다
              </p>
              <p className="text-gray-400 text-sm mb-4">다른 키워드로 다시 검색해보세요</p>
              <button
                onClick={clearSearch}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                주요 카테고리 보기
              </button>
            </div>
          )}
        </section>
      ) : (
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">주요 카테고리</h2>
            <Link
              to="/hair-encyclopedia/all-categories"
              className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              전체보기
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mainDisplayCategories.map((category) => (
              <Link
                key={category.id}
                to={`/hair-encyclopedia/category/${category.id}`}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 border"
              >
                <div className="flex items-center mb-3">
                  <div className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center mr-3`}>
                    <span className="text-white text-lg">{category.icon}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {category.description}
                </p>
                <div className="mt-3 text-xs text-gray-500">
                  {category.subcategories.length}개 항목
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// line-clamp 유틸리티 클래스를 위한 스타일
const styles = `
  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  
  .line-clamp-3 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
`;

// 스타일을 head에 추가
if (typeof document !== 'undefined' && !document.querySelector('#line-clamp-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'line-clamp-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default HomePage;