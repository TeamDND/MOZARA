import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Home, Search, Layers3, User, ChevronLeft, Settings } from "lucide-react"

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  active?: boolean
  requireRole?: string
}

const sidebarItems: SidebarItem[] = [
  { icon: Home, label: "홈", href: "/", active: true },
  { icon: Search, label: "진단 바로가기", href: "/hair-check" },
  { icon: Layers3, label: "도구모음", href: "/main" },
  { icon: User, label: "마이페이지", href: "#" },
  { icon: Settings, label: "관리자 설정", href: "#", requireRole: "admin" },
]

const SquareMenuIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M9 9h6v6H9z" />
  </svg>
)

export function CollapsibleSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showText, setShowText] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(true) // 임시로 true 설정
  const [userRole, setUserRole] = useState("admin") // 임시로 admin 설정
  const navigate = useNavigate()

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => setShowText(true), 200)
      return () => clearTimeout(timer)
    } else {
      setShowText(false)
    }
  }, [isExpanded])

  return (
    <div
      className={`fixed left-4 top-20 z-[60] h-[calc(100vh-6rem)] border border-gray-200 rounded-lg transition-all duration-300 ease-in-out ${
        isExpanded ? "w-48" : "w-14"
      }`}
      style={{ backgroundColor: "#F9FAFB" }}
    >
      <div className="flex h-12 items-center justify-between px-3 border-b border-gray-200">
        {isExpanded && showText && <h2 className="text-sm font-semibold text-gray-900 truncate">메뉴</h2>}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
        >
          {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <SquareMenuIcon className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {sidebarItems
            .filter((item) => !item.requireRole || userRole === item.requireRole)
            .map((item, index) => {
              const Icon = item.icon
              return (
                <li key={index}>
                  <button
                    onClick={() => item.href !== "#" && navigate(item.href!)}
                    className={`w-full h-12 px-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded transition-colors flex items-center cursor-pointer ${
                      item.active ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : ""
                    } ${!isExpanded ? "justify-center px-0" : "justify-start"}`}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isExpanded && showText ? "mr-3" : ""}`} />
                    {isExpanded && showText && <span className="text-sm font-medium truncate">{item.label}</span>}
                  </button>
                </li>
              )
            })}
        </ul>
      </nav>

      {isLoggedIn && isExpanded && showText && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">사용자</p>
              <p className="text-xs text-gray-500 truncate">user@example.com</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
