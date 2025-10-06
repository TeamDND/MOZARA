import type React from "react"
import { Home, Sprout, Bot, Search, Layers3, Calendar } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useSelector } from "react-redux"
import { RootState } from "../utils/store"
import { openChatBotModal, closeChatBotModal } from "../pages/ChatBot/ChatBotModal"

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
    <nav className="fixed bottom-0 left-0 right-0 z-[9999]">
      <div className="relative bg-white/90 backdrop-blur">
        {/* 상단 둥근 모서리 */}
        <div className="bg-white/90 backdrop-blur rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">

          <div className="flex items-center justify-around pt-2 pb-2 px-4">
            {/* 분석 */}
            <button
              onClick={() => {
                closeChatBotModal();
                if (isLoggedIn) {
                  navigate('/integrated-diagnosis')
                } else {
                  navigate('/login')
                }
              }}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                location.pathname.startsWith('/integrated-diagnosis') || location.pathname.startsWith('/diagnosis')
                  ? 'bg-[#1f0101]/10' 
                  : ''
              }`}
            >
              <Search className={`h-5 w-5 mb-1 ${
                location.pathname.startsWith('/integrated-diagnosis') || location.pathname.startsWith('/diagnosis')
                  ? 'text-[#1f0101]' 
                  : 'text-gray-600'
              }`} />
              <span className={`text-xs font-medium ${
                location.pathname.startsWith('/integrated-diagnosis') || location.pathname.startsWith('/diagnosis')
                  ? 'text-[#1f0101]' 
                  : 'text-gray-600'
              }`}>
                분석
              </span>
            </button>

            {/* 기능 */}
            <button
              onClick={() => {
                closeChatBotModal();
                if (isLoggedIn) {
                  navigate('/main-contents')
                } else {
                  navigate('/login')
                }
              }}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                location.pathname.startsWith('/main-contents') || location.pathname.startsWith('/hair-change') || location.pathname.startsWith('/hair-product')
                  ? 'bg-[#1f0101]/10' 
                  : ''
              }`}
            >
              <Layers3 className={`h-5 w-5 mb-1 ${
                location.pathname.startsWith('/main-contents') || location.pathname.startsWith('/hair-change') || location.pathname.startsWith('/hair-product')
                  ? 'text-[#1f0101]' 
                  : 'text-gray-600'
              }`} />
              <span className={`text-xs font-medium ${
                location.pathname.startsWith('/main-contents') || location.pathname.startsWith('/hair-change') || location.pathname.startsWith('/hair-product')
                  ? 'text-[#1f0101]' 
                  : 'text-gray-600'
              }`}>
                기능
              </span>
            </button>

            {/* 홈 (가운데) */}
            <button
              onClick={() => {
                closeChatBotModal();
                if (isLoggedIn) {
                  navigate('/main-page')
                } else {
                  navigate('/')
                }
              }}
              className="flex flex-col items-center py-2 px-3 bg-[#1f0101] rounded-full w-12 h-12 justify-center"
            >
              <Home className="h-6 w-6 text-white" />
            </button>

            {/* 데일리케어 */}
            <button
              onClick={() => {
                closeChatBotModal();
                if (isLoggedIn) {
                  navigate('/d-care')
                } else {
                  navigate('/login')
                }
              }}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                location.pathname.startsWith('/d-care') || location.pathname.startsWith('/hair_dailycare')
                  ? 'bg-[#1f0101]/10' 
                  : ''
              }`}
            >
              <Calendar className={`h-5 w-5 mb-1 ${
                location.pathname.startsWith('/d-care') || location.pathname.startsWith('/hair_dailycare')
                  ? 'text-[#1f0101]' 
                  : 'text-gray-600'
              }`} />
              <span className={`text-xs font-medium ${
                location.pathname.startsWith('/d-care') || location.pathname.startsWith('/hair_dailycare')
                  ? 'text-[#1f0101]' 
                  : 'text-gray-600'
              }`}>
                케어
              </span>
            </button>

            {/* 챗봇 */}
            <button
              onClick={() => openChatBotModal()}
              className="flex flex-col items-center py-2 px-3 rounded-lg transition-all"
            >
              <Bot className="h-5 w-5 mb-1 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">
                챗봇
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default BottomNavigationBar
