import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { categories } from '../../../../utils/data/articles';

const AllCategoriesPage = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center mb-6">
        <Link
          to="/hair-encyclopedia"
          className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          탈모 백과
        </Link>
        <span className="text-gray-400">/</span>
        <span className="ml-4 text-gray-900 font-medium">전체 카테고리</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">전체 카테고리</h1>
        <p className="text-gray-600 mb-8">
          탈모와 모발 건강에 관한 모든 정보를 카테고리별로 확인해보세요.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/hair-encyclopedia/category/${category.id}`}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 border"
            >
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center mr-4`}>
                  <span className="text-white text-xl">{category.icon}</span>
                </div>
                <h2 className="font-bold text-lg text-gray-900">{category.name}</h2>
              </div>
              
              <p className="text-gray-600 mb-4 line-clamp-2">
                {category.description}
              </p>
              
              <div className="space-y-2">
                <div className="text-sm text-gray-500 mb-2">주요 항목:</div>
                <div className="flex flex-wrap gap-1">
                  {category.subcategories.slice(0, 3).map((subcategory: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {subcategory}
                    </span>
                  ))}
                  {category.subcategories.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{category.subcategories.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllCategoriesPage;