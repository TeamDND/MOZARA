import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HairToolHeaderProps {
  title: string;
  subtitle: string;
  isNew?: boolean;
  badge?: string;
  icon?: React.ReactNode;
  showBackButton?: boolean;
}

const HairToolHeader: React.FC<HairToolHeaderProps> = ({
  title,
  subtitle,
  isNew = false,
  badge,
  icon,
  showBackButton = true,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/40 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 뒤로가기 버튼 */}
        {showBackButton && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">돌아가기</span>
          </button>
        )}

        {/* 메인 헤더 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* 아이콘 */}
            {icon && (
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl">
                {icon}
              </div>
            )}
            
            <div>
              {/* 타이틀과 배지 */}
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {title}
                </h1>
                
                {/* NEW 배지 */}
                {isNew && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500 text-white">
                    NEW
                  </span>
                )}
                
                {/* 커스텀 배지 */}
                {badge && !isNew && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {badge}
                  </span>
                )}
              </div>

              {/* 설명 */}
              <p className="text-sm sm:text-base text-gray-600">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HairToolHeader;

