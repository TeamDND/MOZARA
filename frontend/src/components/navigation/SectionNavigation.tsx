import type React from "react"
import { Home, BarChart3, Clock, User } from "../ui/icons"
import { useNavigate, useLocation } from "react-router-dom"

interface MenuItem {
  name: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
}

interface SectionNavigationProps {
  currentSection: number
  onScrollToSection: (sectionIndex: number) => void
}

export default function SectionNavigation({ currentSection, onScrollToSection }: SectionNavigationProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  const menuItems: MenuItem[] = [
    { 
      name: "홈", 
      icon: Home, 
      action: () => {
        if (location.pathname === '/') {
          // 이미 홈화면이면 첫 번째 섹션으로 이동
          onScrollToSection(0)
        } else {
          // 다른 페이지면 홈으로 이동
          navigate('/')
        }
      }
    },
    { 
      name: "분석", 
      icon: BarChart3, 
      action: () => {
        // 아무것도 하지 않음
      }
    },
    { 
      name: "루틴", 
      icon: Clock, 
      action: () => {
        // 아무것도 하지 않음
      }
    },
    { 
      name: "마이", 
      icon: User, 
      action: () => {
        // 아무것도 하지 않음
      }
    },
  ]

  return (
    <>
      {/* 데스크톱 사이드바 */}
      <div className="hidden md:block fixed right-4 top-1/2 -translate-y-1/2 z-50">
        <div className="bg-white/80 backdrop-blur rounded-xl p-2 shadow-lg">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.name}
                onClick={item.action}
                className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 transition-all ${
                  index === 0 && location.pathname === '/'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
              </button>
            )
          })}
        </div>
      </div>

      {/* 모바일 하단 네비게이션 */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/90 backdrop-blur rounded-xl px-4 py-2 shadow-lg">
          <div className="flex space-x-4">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={item.name}
                  onClick={item.action}
                  className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                    index === 0 && location.pathname === '/'
                      ? 'text-blue-500'
                      : 'text-gray-600'
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
