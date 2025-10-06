import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { categories } from '../../../utils/data/articles';

const AllCategoriesPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-center">
          <h1 className="text-lg font-bold text-gray-900">전체 카테고리</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4">
        <section className="text-center py-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl mb-4">
          <p className="text-sm text-gray-600">
            탈모와 모발 건강에 관한 모든 정보를 카테고리별로 확인해보세요.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/hair-encyclopedia/category/${category.id}`}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 touch-manipulation border"
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center mb-3`}>
                  <span className="text-white text-lg">{category.icon}</span>
                </div>
                <h2 className="font-bold text-sm text-gray-900 mb-2">{category.name}</h2>
                
                <p className="text-gray-600 text-xs mb-3 line-clamp-2 leading-relaxed">
                  {category.description}
                </p>
                
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 mb-1">주요 항목:</div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {category.subcategories.slice(0, 2).map((subcategory: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {subcategory}
                      </span>
                    ))}
                    {category.subcategories.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{category.subcategories.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Spacing for Mobile Navigation */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default AllCategoriesPage;