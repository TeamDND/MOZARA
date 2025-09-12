import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { categories } from '../../../data/articles';

const HomePage = () => {
  const mainDisplayCategories = [
    'types', 'causes', 'treatment', 'scalp-health',
    'prevention', 'diagnosis', 'myths', 'recommendations'
  ].map(id => categories.find(c => c.id === id)!).filter(Boolean);

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
    </div>
  );
};

export default HomePage;