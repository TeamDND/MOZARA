"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg"
  children: React.ReactNode
}

const Button = ({ variant = "default", size = "default", className = "", children, ...props }: ButtonProps) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"

  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  }

  const sizes = {
    sm: "h-9 px-3 text-sm",
    default: "h-10 py-2 px-4",
    lg: "h-11 px-8",
  }

  return (
    <button className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

interface CardProps {
  className?: string
  children: React.ReactNode
}

const Card = ({ className = "", children }: CardProps) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>{children}</div>
)

const CardHeader = ({ className = "", children }: CardProps) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
)

const CardTitle = ({ className = "", children }: CardProps) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
)

const CardDescription = ({ className = "", children }: CardProps) => (
  <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
)

interface BadgeProps {
  className?: string
  children: React.ReactNode
  style?: React.CSSProperties
}

const Badge = ({ className = "", children, style }: BadgeProps) => (
  <div
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
    style={style}
  >
    {children}
  </div>
)

// Lucide React Icons 정의
const Shield = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2L2 22h20L12 2z"></path>
  </svg>
)
const Camera = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="13" width="18" height="8"></rect>
    <line x1="3" y1="13" x2="3" y2="17"></line>
    <line x1="21" y1="13" x2="21" y2="17"></line>
    <path d="M13 17h3a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h3"></path>
    <line x1="10" y1="9" x2="10" y2="9.01"></line>
    <line x1="14" y1="9" x2="14" y2="9.01"></line>
  </svg>
)
const TrendingUp = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="23 6 23 12 17 12"></polyline>
    <polyline points="1 18 1 12 7 12"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
    <polyline points="7 18 1 18 1 12"></polyline>
    <line x1="17" y1="6" x2="23" y2="12"></line>
    <line x1="7" y1="18" x2="1" y2="12"></line>
  </svg>
)
const Lock = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
)
const Clock = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
)
const Users = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v2"></path>
  </svg>
)
const Heart = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
)
const MapPin = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
)
const BookOpen = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H2a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z"></path>
    <path d="M18 2h.01"></path>
    <path d="M18 22h.01"></path>
  </svg>
)
const CheckCircle = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 9"></polyline>
  </svg>
)
const ChevronLeft = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
)
const ChevronRight = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
)
const Home = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
)
const BarChart3 = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    <path d="M12 22v-5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z"></path>
    <path d="M2 12h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z"></path>
    <path d="M22 12h-5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2z"></path>
  </svg>
)
const Sprout = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="8" y1="12" x2="12" y2="12"></line>
    <line x1="16" y1="12" x2="12" y2="12"></line>
    <line x1="12" y1="12" x2="12" y2="16"></line>
    <line x1="12" y1="12" x2="16" y2="12"></line>
    <line x1="12" y1="12" x2="12" y2="8"></line>
    <line x1="12" y1="12" x2="8" y2="12"></line>
  </svg>
)
const User = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
)

export default function HomePage() {
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [activeMenu, setActiveMenu] = useState("홈")
  const totalSlides = 3

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const menuItems = [
    { name: "홈", icon: Home },
    { name: "분석", icon: BarChart3 },
    { name: "루틴", icon: Sprout },
    { name: "마이", icon: User },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "#f9f9f9" }}>
      <aside className="hidden lg:block fixed right-6 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-200 p-4">
          <nav className="space-y-4">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              const isActive = activeMenu === item.name
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveMenu(item.name)}
                  className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all relative group ${
                    isActive ? "text-white shadow-md" : "text-gray-600 hover:text-white"
                  }`}
                  style={{
                    backgroundColor: isActive ? "rgb(0,115,255)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "rgba(0,115,255,0.8)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }
                  }}
                >
                  {index === 0 ? (
                    <span className="text-xs font-medium">홈</span>
                  ) : (
                    <>
                      <Icon className="h-4 w-4 mb-1" />
                      <span className="text-xs font-medium">{item.name}</span>
                    </>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200">
        <div className="flex items-center justify-around py-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isActive = activeMenu === item.name
            return (
              <button
                key={item.name}
                onClick={() => setActiveMenu(item.name)}
                className={`flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all ${
                  isActive ? "text-white" : "text-gray-600"
                }`}
                style={{
                  backgroundColor: isActive ? "rgb(0,115,255)" : "transparent",
                }}
                onTouchStart={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "rgba(0,115,255,0.8)"
                  }
                }}
                onTouchEnd={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }
                }}
              >
                {index === 0 ? <span className="text-xs font-medium mb-1">홈</span> : <Icon className="h-5 w-5 mb-1" />}
                <span className="text-xs font-medium">{item.name}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="pb-20 lg:pb-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-20 left-10 w-32 h-32 rounded-full blur-xl"
            style={{ backgroundColor: "rgba(0,115,255,0.2)" }}
          ></div>
          <div
            className="absolute top-40 right-20 w-24 h-24 rounded-full blur-lg"
            style={{ backgroundColor: "rgba(0,115,255,0.3)" }}
          ></div>
          <div
            className="absolute bottom-40 left-1/4 w-40 h-40 rounded-full blur-2xl"
            style={{ backgroundColor: "rgba(0,115,255,0.2)" }}
          ></div>
          <div
            className="absolute bottom-20 right-1/3 w-28 h-28 rounded-full blur-xl"
            style={{ backgroundColor: "rgba(0,115,255,0.25)" }}
          ></div>
          <div
            className="absolute top-1/3 left-1/2 w-20 h-20 rounded-full blur-lg"
            style={{ backgroundColor: "rgba(0,115,255,0.3)" }}
          ></div>
        </div>


        <section className="min-h-screen flex items-center justify-center px-4 relative z-10">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-6">
                  <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                    AI
                    <br />
                    당신의 헤어를
                    <br />
                                        지켜 드립니다
                  </h1>
                  <p className="text-lg text-gray-600 max-w-md">
                    개인맞춤화된 AI 기술로 탈모 진단부터 관리까지, 완전 익명으로 안전하게 시작하세요.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="text-white hover:opacity-90 px-8 py-4 text-base font-medium border-2"
                  style={{ backgroundColor: "rgb(0,115,255)", borderColor: "rgb(0,115,255)" }}
                  onClick={() => navigate('/hair-check')}
                >
                  나만의 맞춤 서비스 시작하기
                </Button>
                <Button
                  size="lg"
                  className="text-white hover:opacity-90 px-8 py-4 text-base font-medium border-2"
                  style={{ backgroundColor: "rgb(0,115,255)", borderColor: "rgb(0,115,255)" }}
                  onClick={() => navigate('/temp-main')}
                >
                  메인페이지 이동
                </Button>
              </div>

              <div className="relative">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src="/----------.jpg"
                        alt="헤어케어 이미지 1"
                        className="w-full h-full object-cover grayscale"
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="aspect-[4/5] bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src="/-------------.jpg"
                        alt="헤어케어 이미지 2"
                        className="w-full h-full object-cover grayscale"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="min-h-screen flex items-center justify-center px-4 bg-white/20 relative z-10">
          <div className="container mx-auto max-w-4xl text-center">
            <Badge className="mb-6 text-white border-0 hover:opacity-90" style={{ backgroundColor: "rgb(0,115,255)" }}>
              <Lock className="h-3 w-3 mr-1" />
              100% 익명 보장
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">
              개인맞춤화된
              <br />
              <span style={{ color: "rgb(0,115,255)" }}>AI 탈모 솔루션</span>
            </h2>
            <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto text-pretty">
              20-30대 남녀를 위한 완전 익명 탈모 진단 서비스. 얼굴 노출 없이 머리 부분만 촬영하여 개인에게 최적화된
              맞춤형 관리 솔루션을 제공합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-base px-8 text-white hover:opacity-90"
                style={{ backgroundColor: "rgb(0,115,255)" }}
                onClick={() => navigate('/hair-diagnosis')}
              >
                <Camera className="h-4 w-4 mr-2" />
                무료 진단 시작하기
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 bg-transparent hover:bg-opacity-10"
                style={{ borderColor: "rgb(0,115,255)", color: "rgb(0,115,255)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,115,255,0.8)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                서비스 둘러보기
              </Button>
            </div>
          </div>
        </section>

        <section className="min-h-screen flex items-center justify-center px-4 bg-white/30 relative z-10">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">HairAI의 핵심 가치</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                >
                  <Shield className="h-6 w-6" style={{ color: "rgb(0,115,255)" }} />
                </div>
                <h4 className="text-lg font-semibold mb-2 text-gray-900">완전 익명</h4>
                <p className="text-gray-700 text-sm">얼굴 노출 없이 안전하게</p>
              </div>

              <div className="text-center">
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                >
                  <Users className="h-6 w-6" style={{ color: "rgb(0,115,255)" }} />
                </div>
                <h4 className="text-lg font-semibold mb-2 text-gray-900">개인맞춤</h4>
                <p className="text-gray-700 text-sm">나만의 맞춤형 솔루션</p>
              </div>

              <div className="text-center">
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                >
                  <TrendingUp className="h-6 w-6" style={{ color: "rgb(0,115,255)" }} />
                </div>
                <h4 className="text-lg font-semibold mb-2 text-gray-900">지속 관리</h4>
                <p className="text-gray-700 text-sm">꾸준한 변화 추적</p>
              </div>
            </div>
          </div>
        </section>

        <section className="min-h-screen flex items-center justify-center px-4 bg-white/20 relative z-10">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">간단한 3단계로 완료</h3>
              <p className="text-gray-700">복잡한 절차 없이 바로 시작할 수 있습니다.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="text-center">
                <div
                  className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "rgb(0,115,255)" }}
                >
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h4 className="text-lg font-semibold mb-2 text-gray-900">사진 촬영</h4>
                <p className="text-gray-700 text-sm">머리 부분만 촬영하여 업로드합니다.</p>
              </div>

              <div className="text-center">
                <div
                  className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "rgb(0,115,255)" }}
                >
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h4 className="text-lg font-semibold mb-2 text-gray-900">AI 분석</h4>
                <p className="text-gray-700 text-sm">최신 AI 기술로 탈모 상태를 정밀 분석합니다.</p>
              </div>

              <div className="text-center">
                <div
                  className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "rgb(0,115,255)" }}
                >
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h4 className="text-lg font-semibold mb-2 text-gray-900">맞춤 솔루션</h4>
                <p className="text-gray-700 text-sm">개인 최적화된 관리 방법을 제공합니다.</p>
              </div>
            </div>

            <div className="text-center mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">부가 기능</h4>
              <p className="text-gray-700 mb-6">더 전문적인 탈모 관리를 위한 추가 서비스</p>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-lg">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  <Card className="w-full border-gray-200 bg-white/70 backdrop-blur flex-shrink-0 mx-2">
                    <CardHeader className="text-center py-8">
                      <div
                        className="h-16 w-16 rounded-lg flex items-center justify-center mx-auto mb-6"
                        style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                      >
                        <CheckCircle className="h-8 w-8" style={{ color: "rgb(0,115,255)" }} />
                      </div>
                      <CardTitle className="text-xl text-gray-900 mb-4">탈모 OX</CardTitle>
                      <CardDescription className="text-gray-700 text-base mb-6 max-w-md mx-auto">
                        간단한 질문으로 탈모 위험도를 체크하고 예방법을 알아보세요.
                      </CardDescription>
                      <Button
                        className="mt-4 text-white hover:opacity-90 shadow-md px-8 py-3 text-base"
                        style={{ backgroundColor: "rgb(0,115,255)" }}
                        onClick={() => navigate('/hair-quiz')}
                      >
                        체크하기
                      </Button>
                    </CardHeader>
                  </Card>

                  <Card className="w-full border-gray-200 bg-white/70 backdrop-blur flex-shrink-0 mx-2">
                    <CardHeader className="text-center py-8">
                      <div
                        className="h-16 w-16 rounded-lg flex items-center justify-center mx-auto mb-6"
                        style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                      >
                        <MapPin className="h-8 w-8" style={{ color: "rgb(0,115,255)" }} />
                      </div>
                      <CardTitle className="text-xl text-gray-900 mb-4">탈모 병원추천</CardTitle>
                      <CardDescription className="text-gray-700 text-base mb-6 max-w-md mx-auto">
                        내 위치 기반으로 신뢰할 수 있는 탈모 전문 병원을 추천받으세요.
                      </CardDescription>
                      <Button
                        className="mt-4 text-white hover:opacity-90 shadow-md px-8 py-3 text-base"
                        style={{ backgroundColor: "rgb(0,115,255)" }}
                      >
                        병원 찾기
                      </Button>
                    </CardHeader>
                  </Card>

                  <Card className="w-full border-gray-200 bg-white/70 backdrop-blur flex-shrink-0 mx-2">
                    <CardHeader className="text-center py-8">
                      <div
                        className="h-16 w-16 rounded-lg flex items-center justify-center mx-auto mb-6"
                        style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                      >
                        <BookOpen className="h-8 w-8" style={{ color: "rgb(0,115,255)" }} />
                      </div>
                      <CardTitle className="text-xl text-gray-900 mb-4">탈모 백과</CardTitle>
                      <CardDescription className="text-gray-700 text-base mb-6 max-w-md mx-auto">
                        탈모에 대한 모든 정보와 관리법을 한 곳에서 확인하세요.
                      </CardDescription>
                      <Button
                        className="mt-4 text-white hover:opacity-90 shadow-md px-8 py-3 text-base"
                        style={{ backgroundColor: "rgb(0,115,255)" }}
                      >
                        정보 보기
                      </Button>
                    </CardHeader>
                  </Card>
                </div>
              </div>

              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
              >
                <ChevronLeft className="h-5 w-5" style={{ color: "rgb(0,115,255)" }} />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
              >
                <ChevronRight className="h-5 w-5" style={{ color: "rgb(0,115,255)" }} />
              </button>

              <div className="flex justify-center mt-6 space-x-2">
                {[...Array(totalSlides)].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className="w-3 h-3 rounded-full transition-all"
                    style={{
                      backgroundColor: currentSlide === index ? "rgb(0,115,255)" : "#d1d5db",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="min-h-screen flex items-center justify-center px-4 bg-white/30 relative z-10">
          <div className="container mx-auto max-w-3xl text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">지금 바로 시작해보세요</h3>
            <p className="text-gray-700 mb-8">
              무료 진단으로 현재 상태를 확인하고, 개인맞춤형 전문 관리 방법을 알아보세요.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" style={{ color: "rgb(0,115,255)" }} />
                30초 진단
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-1" style={{ color: "rgb(0,115,255)" }} />
                완전 익명
              </div>
              <div className="flex items-center">
                <Heart className="h-4 w-4 mr-1" style={{ color: "rgb(0,115,255)" }} />
                개인맞춤
              </div>
            </div>
            <Button
              size="lg"
              className="text-base px-12 text-white hover:opacity-90"
              style={{ backgroundColor: "rgb(0,115,255)" }}
              onClick={() => navigate('/hair-diagnosis')}
            >
              무료로 진단받기
            </Button>
          </div>
        </section>

      </div>
    </div>
  )
}
