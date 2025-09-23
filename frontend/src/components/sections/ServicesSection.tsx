import type React from "react"
import { Camera, Shield, User } from "../ui/icons"
import { Button } from "../ui/button"

interface ServicesSectionProps {
  isVisible: boolean
  onNavigate: (path: string) => void
}

export default function ServicesSection({ isVisible, onNavigate }: ServicesSectionProps) {
  const values = [
    {
      icon: Camera,
      title: "빠른 분석",
      description: "사진으로 빠르게 탈모 상태 분석",
      delay: "delay-100"
    },
    {
      icon: Shield,
      title: "개인 정보 보호",
      description: "프라이버시 보호를 최우선으로 합니다",
      delay: "delay-200"
    },
    {
      icon: User,
      title: "개인 맞춤형 솔루션",
      description: "개인별 최적화된 관리법 제공",
      delay: "delay-300"
    }
  ]

  return (
    <div className="min-h-screen md:h-screen flex items-center justify-center px-4 bg-black/5 relative z-10">
      <div className="container mx-auto max-w-4xl">
        <div
          className={`text-center mb-8 md:mb-12 transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">
            AI 탈모 분석
          </h2>
          <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl mx-auto text-pretty">
          당신이 겪는 어려움을 해결하세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          {values.map((value, index) => {
            const Icon = value.icon
            return (
              <div
                key={value.title}
                className={`text-center transition-all duration-1500 ease-out ${value.delay} ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
              >
                <div
                  className="h-12 w-12 md:h-16 md:w-16 rounded-lg flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                >
                  <Icon className="h-6 w-6 md:h-8 md:w-8" style={{ color: "rgb(0,115,255)" }} />
                </div>
                <h4 className="text-lg md:text-xl font-semibold mb-2 text-gray-900">{value.title}</h4>
                <p className="text-gray-700 text-sm md:text-base">{value.description}</p>
              </div>
            )
          })}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            className="text-sm md:text-base px-6 md:px-8 py-3 md:py-4 text-white hover:opacity-90"
            style={{ backgroundColor: "rgb(0,115,255)" }}
            onClick={() => onNavigate('/hair-check')}
          >
            <Camera className="h-4 w-4 mr-2" />
            분석하기
          </Button>
        </div>
      </div>
    </div>
  )
}
