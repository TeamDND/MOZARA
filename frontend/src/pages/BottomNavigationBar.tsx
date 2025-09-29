import type React from "react"
import { Home, User, Bot, Search, Layers3 } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useSelector } from "react-redux"
import { RootState } from "../utils/store"

const BottomNavigationBar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // 로그인 상태 가져오기 (토큰 존재 여부로 판단)
  const token = useSelector((state: RootState) => state.token.token)
  const isLoggedIn = !!token

  // 현재 활성 탭 확인
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    // 모바일 하단 네비게이션
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="relative bg-white/90 backdrop-blur">
        {/* 상단 둥근 모서리 */}
        <div className="bg-white/90 backdrop-blur rounded-t-xl">

          <div className="flex items-center justify-around pt-6 pb-4 px-4">
            {/* 홈 */}
            <button
              onClick={() => {
                if (isLoggedIn) {
                  navigate('/daily-care')
                } else {
                  navigate('/')
                }
              }}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                isActive('/') || (isLoggedIn && isActive('/daily-care'))
                  ? 'text-[#222222]' 
                  : 'text-gray-600'
              }`}
            >
              <Home className={`h-5 w-5 mb-1 ${
                isActive('/') || (isLoggedIn && isActive('/daily-care')) ? 'text-[#222222]' : 'text-gray-600'
              }`} />
              <span className={`text-xs font-medium ${
                isActive('/') || (isLoggedIn && isActive('/daily-care')) ? 'text-[#222222]' : 'text-gray-600'
              }`}>
                홈
              </span>
            </button>

            {/* 기능 */}
            <button
              onClick={() => navigate('/main-contents')}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                isActive('/main-contents')
                  ? 'text-[#222222]' 
                  : 'text-gray-600'
              }`}
            >
              <Layers3 className={`h-5 w-5 mb-1 ${
                isActive('/main-contents') ? 'text-[#222222]' : 'text-gray-600'
              }`} />
              <span className={`text-xs font-medium ${
                isActive('/main-contents') ? 'text-[#222222]' : 'text-gray-600'
              }`}>
                기능
              </span>
            </button>

            {/* 챗봇 (아이콘만) */}
            <button
              onClick={() => navigate('/chat')}
              className="flex flex-col items-center py-2 px-3 bg-[#222222] rounded-full w-12 h-12 justify-center transition-all hover:bg-[#333333]"
            >
              <Bot className="h-6 w-6 text-white" />
            </button>

            {/* 분석 */}
            <button
              onClick={() => navigate('/integrated-diagnosis')}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                isActive('/integrated-diagnosis')
                  ? 'text-[#222222]' 
                  : 'text-gray-600'
              }`}
            >
              <Search className={`h-5 w-5 mb-1 ${
                isActive('/integrated-diagnosis') ? 'text-[#222222]' : 'text-gray-600'
              }`} />
              <span className={`text-xs font-medium ${
                isActive('/integrated-diagnosis') ? 'text-[#222222]' : 'text-gray-600'
              }`}>
                분석
              </span>
            </button>


            {/* 프로필 */}
            <button
              onClick={() => navigate('/mypage')}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                isActive('/mypage')
                  ? 'text-[#222222]' 
                  : 'text-gray-600'
              }`}
            >
              <User className={`h-5 w-5 mb-1 ${
                isActive('/mypage') ? 'text-[#222222]' : 'text-gray-600'
              }`} />
              <span className={`text-xs font-medium ${
                isActive('/mypage') ? 'text-[#222222]' : 'text-gray-600'
              }`}>
                MY
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default BottomNavigationBar
