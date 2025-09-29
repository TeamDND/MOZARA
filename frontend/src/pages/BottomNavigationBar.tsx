import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// TypeScript: BottomNavigationBar 컴포넌트 타입 정의
interface NavigationItem {
  id: string;
  label: string;
  icon: string | React.ReactNode;
  path: string;
}

const BottomNavigationBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 모바일 네비게이션 아이템 정의
  const navigationItems: NavigationItem[] = [
    {
      id: 'features',
      label: '기능',
      icon: <img src="/assets/icons/features.png" alt="기능" className="w-5 h-5" />,
      path: '/main-contents'
    },
    {
      id: 'analysis',
      label: '분석',
      icon: <img src="/assets/icons/analysis.png" alt="기능" className="w-5 h-5" />,
      path: '/check'
    },
    {
      id: 'home',
      label: '홈',
      icon: <img src="/assets/icons/home.png" alt="기능" className="w-5 h-5" />,
      path: '/'
    },
    {
      id: 'daily',
      label: '데일리',
      icon: <img src="/assets/icons/daily.png" alt="기능" className="w-5 h-5" />,
      path: '/daily'
    },
    {
      id: 'my',
      label: '마이',
      icon: <img src="/assets/icons/mypage.png" alt="기능" className="w-5 h-5" />,
      path: '/mypage'
    }
  ];

  // 현재 활성 탭 확인
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // 탭 클릭 핸들러
  const handleTabClick = (path: string) => {
    navigate(path);
  };

  return (
    // Tailwind CSS: 모바일 하단 네비게이션 바
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.path)}
            className={`
              flex flex-col items-center justify-center 
              min-w-0 flex-1 h-full
              transition-colors duration-200
              ${isActive(item.path) 
                ? 'text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
            aria-label={item.label}
          >
            {/* 아이콘 */}
            <div className="mb-1">
              {typeof item.icon === 'string' ? (
                <div className={`
                  text-xl
                  ${isActive(item.path) ? 'text-blue-600' : 'text-gray-500'}
                `}>
                  {item.icon}
                </div>
              ) : (
                <div className={`
                  ${isActive(item.path) ? 'opacity-100' : 'opacity-60'}
                  transition-opacity duration-200
                `}>
                  {item.icon}
                </div>
              )}
            </div>
            
            {/* 라벨 */}
            <span className={`
              text-xs font-medium truncate
              ${isActive(item.path) ? 'text-blue-600' : 'text-gray-500'}
            `}>
              {item.label}
            </span>
            
            {/* 활성 상태 표시 */}
            {isActive(item.path) && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigationBar;
