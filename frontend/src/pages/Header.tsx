import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../utils/store';
import { clearUser } from '../utils/userSlice';
import { clearToken } from '../utils/tokenSlice';
import { clearSeedling } from '../utils/seedlingSlice';
import apiClient from '../services/apiClient';
import { Menu, X, User, LogOut, UserPlus, LogIn, Home, Search, Layers3, Settings } from 'lucide-react';
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

// 사이드바 메뉴 아이템 인터페이스
interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  active?: boolean;
  requireRole?: string;
}

// 사이드바 메뉴 아이템 정의
const sidebarItems: SidebarItem[] = [
  { icon: Home, label: "홈", href: "/", active: true },
  { icon: Search, label: "분석 바로가기", href: "/hair-check" },
  { icon: Layers3, label: "도구모음", href: "/main" },
  { icon: User, label: "마이페이지", href: "/mypage" },
  { icon: Settings, label: "관리자 설정", href: "#", requireRole: "admin" },
];

// Collapsible 컴포넌트들
function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  );
}

export default function Header() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMenuText, setShowMenuText] = useState(false);

  // Redux에서 사용자 정보 가져오기
  const user = useSelector((state: RootState) => state.user);

  // 로그인 상태 확인 (사용자명만으로 확인)
  const isLoggedIn = !!(user.username && user.username.trim() !== '');
 

  // 메뉴 애니메이션 효과
  useEffect(() => {
    if (isMenuOpen) {
      const timer = setTimeout(() => setShowMenuText(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowMenuText(false);
    }
  }, [isMenuOpen]);

  const handleLoginClick = () => {
    setIsMenuOpen(false);
    navigate('/login');
  };

  const handleSignupClick = () => {
    setIsMenuOpen(false);
    navigate('/signup');
  };

  const handleProfileClick = () => {
    setIsMenuOpen(false);
    navigate('/profile');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleDiagnosisClick = () => {
    setIsMenuOpen(false);
    if (isLoggedIn) {
      navigate('/integrated-diagnosis');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    try {
      console.log('로그아웃 시작 - 백엔드 API 호출');
      const response = await apiClient.delete('/logout');
      console.log('로그아웃 API 응답:', response.data);
    } catch (error) {
      console.error('로그아웃 API 호출 실패:', error);
    } finally {
      console.log('프론트엔드 상태 정리 중...');
      dispatch(clearUser());
      dispatch(clearToken());
      dispatch(clearSeedling());
      setIsMenuOpen(false);
      console.log('로그아웃 완료 - 홈으로 이동');
      navigate('/');
    }
  };

  return (
    <>
      {/* Mobile-First 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-50">
        <div className="flex items-center justify-between">
          {/* 좌측 햄버거 메뉴 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* 가운데 로고 */}
          <button 
            onClick={handleLogoClick}
            className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors active:scale-95 font-kaushan"
          >
            HairFit
          </button>

          {/* 우측 여백 (대칭성을 위해) */}
          <div className="w-10"></div>
        </div>
      </header>

      {/* 햄버거 메뉴 사이드바 */}
      {isMenuOpen && (
        <>
          {/* 배경 오버레이 */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* 사이드바 메뉴 */}
          <div
            className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 ease-in-out ${
              isMenuOpen ? "w-64" : "w-0"
            } overflow-hidden`}
            style={{ backgroundColor: "#F9FAFB" }}
          >
            {/* 메뉴 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 메뉴 내용 */}
            <nav className="flex-1 p-2">
              <ul className="space-y-1">
                {sidebarItems
                  .filter(item => !item.requireRole || (isLoggedIn && user.role === item.requireRole))
                  .map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <li key={index}>
                        <button
                          onClick={() => {
                            if (item.label === "분석 바로가기") {
                              handleDiagnosisClick();
                            } else if (item.label === "마이페이지") {
                              if (isLoggedIn) {
                                navigate('/mypage');
                                setIsMenuOpen(false);
                              } else {
                                navigate('/login');
                                setIsMenuOpen(false);
                              }
                            } else if (item.href !== "#") {
                              navigate(item.href!);
                              setIsMenuOpen(false);
                            }
                          }}
                          className={`w-full h-12 px-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded transition-colors flex items-center gap-3 ${
                            item.active ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : ""
                          }`}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </nav>

            {/* 사용자 섹션 */}
            <div className="p-4 border-t border-gray-200">
              {isLoggedIn ? (
                <>
                  {/* 로그인된 사용자 정보 */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.nickname}님</p>
                      <p className="text-sm text-gray-600">환영합니다!</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>로그아웃</span>
                  </button>
                </>
              ) : (
                <>
                  {/* 비로그인 사용자 메뉴 */}
                  <div className="space-y-3">
                    <button
                      onClick={handleLoginClick}
                      className="w-full flex items-center gap-3 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <LogIn className="h-5 w-5" />
                      <span className="font-medium">로그인</span>
                    </button>
                    <button
                      onClick={handleSignupClick}
                      className="w-full flex items-center gap-3 p-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <UserPlus className="h-5 w-5" />
                      <span className="font-medium">회원가입</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
