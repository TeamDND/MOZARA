import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, User, Tag } from 'lucide-react';
import { categories } from '../../../../utils/data/transformed-articles';
import { articles } from '../../../../utils/data/transformed-articles';
import ThesisSearchPage from './ThesisSearchPage';

const CategoryPage = () => {
  let { categoryId } = useParams<{ categoryId: string }>();

  // If categoryId is undefined (meaning it came from /category/overview), set it to 'overview'
  if (categoryId === undefined) {
    categoryId = 'overview';
  }

  // Special case: if categoryId is 'thesis-search', render ThesisSearchPage
  if (categoryId === 'thesis-search') {
    return <ThesisSearchPage />;
  }

  const category = categories.find(cat => cat.id === categoryId);

  if (!category) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">카테고리를 찾을 수 없습니다</h1>
        <Link to="/hair-encyclopedia" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  

  const categoryArticles = articles.filter(article => 
    article.category.id === categoryId
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            to="/hair-encyclopedia"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm">탈모 백과</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-800">{category.name}</h1>
          <div className="w-16"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <div className="flex items-center mb-4">
            <div className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center mr-3`}>
              <span className="text-white text-lg">{category.icon}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{category.name}</h1>
              <p className="text-gray-600 text-sm mt-1">{category.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {category.subcategories.map((subcategory: string, index: number) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="font-medium text-gray-900 text-sm">{subcategory}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              관련 아티클 ({categoryArticles.length})
            </h2>
            <select className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50">
              <option>최신순</option>
              <option>인기순</option>
              <option>난이도순</option>
            </select>
          </div>

          {categoryArticles.length > 0 ? (
            <div className="space-y-4">
              {categoryArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/hair-encyclopedia/article/${article.id}`}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 touch-manipulation border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      article.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                      article.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {article.difficulty === 'beginner' ? '초급' :
                       article.difficulty === 'intermediate' ? '중급' : '고급'}
                    </span>
                    <span className="text-xs text-gray-500">{article.subcategory}</span>
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2">
                    {article.title}
                  </h3>

                  <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                    {article.summary}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {article.readTime}분
                      </div>
                      {article.author && (
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {article.author}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {article.lastUpdated}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {article.tags.slice(0, 2).map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        <Tag className="w-2 h-2 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 2 && (
                      <span className="text-xs text-gray-500">+{article.tags.length - 2}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
              <div className="text-gray-400 mb-3">
                <span className="text-3xl">{category.icon}</span>
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-2">
                아직 등록된 아티클이 없습니다
              </h3>
              <p className="text-gray-600 text-sm">
                곧 새로운 콘텐츠가 추가될 예정입니다.
              </p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mt-6">
          <h3 className="text-base font-bold text-gray-900 mb-3">다른 카테고리 둘러보기</h3>
          <div className="grid grid-cols-2 gap-2">
            {categories
              .filter(cat => cat.id !== categoryId)
              .slice(0, 4)
              .map((cat) => (
                <Link
                  key={cat.id}
                  to={`/hair-encyclopedia/category/${cat.id}`}
                  className="flex items-center p-3 bg-white rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className={`w-6 h-6 ${cat.color} rounded-lg flex items-center justify-center mr-2`}>
                    <span className="text-white text-xs">{cat.icon}</span>
                  </div>
                  <span className="font-medium text-gray-900 text-xs">{cat.name}</span>
                </Link>
              ))}
          </div>
        </div>

        {/* Bottom Spacing for Mobile Navigation */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default CategoryPage;