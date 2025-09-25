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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-center">
          <h1 className="text-lg font-bold text-gray-900">탈모 지식백과</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4">
        <section className="text-center py-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl mb-4">
          <p className="text-sm text-gray-600 px-4">
            탈모에 대한 모든 것을 한 곳에서. 전문적이고 신뢰할 수 있는 정보를 제공합니다.
          </p>
        </section>

        {/* 아티클 검색 섹션 */}
        <section className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="탈모 관련 아티클 검색..."
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-gray-50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </section>

        {/* 검색 결과 또는 주요 카테고리 */}
        {shouldShowSearch ? (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                검색 결과 ({searchResults.length}개)
              </h2>
              <button
                onClick={clearSearch}
                className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
              >
                <X className="w-4 h-4 mr-1" />
                취소
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((article) => (
                  <Link
                    key={article.id}
                    to={`/hair-encyclopedia/article/${article.id}`}
                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 touch-manipulation border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2">
                          {article.title}
                        </h3>
                        <div className="flex items-center text-xs text-gray-500">
                          <span className={`px-2 py-1 ${article.category.color} text-white rounded-full mr-2`}>
                            {article.category.icon}
                          </span>
                          <span>{article.category.name}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs leading-relaxed mb-3 line-clamp-2">
                      {article.summary}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{article.readTime}분</span>
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
              <div className="text-center py-8">
                <div className="text-gray-400 text-3xl mb-3">🔍</div>
                <p className="text-gray-500 text-sm mb-2">
                  "{searchQuery}"에 대한 아티클을 찾을 수 없습니다
                </p>
                <p className="text-gray-400 text-xs mb-4">다른 키워드로 다시 검색해보세요</p>
                <button
                  onClick={clearSearch}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  주요 카테고리 보기
                </button>
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">주요 카테고리</h2>
              <Link
                to="/hair-encyclopedia/all-categories"
                className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
              >
                전체보기
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {mainDisplayCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/hair-encyclopedia/category/${category.id}`}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 touch-manipulation border"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center mb-3`}>
                      <span className="text-white text-lg">{category.icon}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-2">{category.name}</h3>
                    <p className="text-gray-600 text-xs leading-relaxed mb-2 line-clamp-2">
                      {category.description}
                    </p>
                    <div className="text-xs text-gray-500">
                      {category.subcategories.length}개 항목
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Spacing for Mobile Navigation */}
        <div className="h-20"></div>
      </div>
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