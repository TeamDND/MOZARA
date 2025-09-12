import type React from "react"
import { MapPin, Clock, Heart, BookOpen, Camera } from "../ui/icons"
import { Button } from "../ui/Button"

interface FeaturesSectionProps {
  isVisible: boolean
}

export default function FeaturesSection({ isVisible }: FeaturesSectionProps) {
  const features = [
    {
      icon: MapPin,
      title: "맞춤 장소 추천",
      description: "탈모미용실, 두피문신, 병원을 추천해드립니다"
    },
    {
      icon: Clock,
      title: "탈모 PT",
      description: "생활습관 개선에 도전하세요"
    },
    {
      icon: Heart,
      title: "개인 맞춤 제품 추천",
      description: "나에게 맞는 제품을 추천받아보세요"
    },
    {
      icon: BookOpen,
      title: "유튜브 컨텐츠 추천",
      description: "관련 유튜브 컨텐츠를 추천합니다"
    },
    {
      icon: Camera,
      title: "AI 헤어 경험",
      description: "내 머리 사진 위에 AI를 적용해 다양한 경험을 누리세요"
    }
  ]

  return (
    <div className="min-h-screen md:h-screen flex items-center justify-center px-4 bg-black/5 relative z-10">
      <div className="container mx-auto max-w-6xl">
        <div
          className={`text-center mb-8 md:mb-12 transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6">맞춤 솔루션</h3>
          <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
            분석한 결과를 통해 맞춤 솔루션 및 컨텐츠를 제공 받으세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={`text-center transition-all duration-1000 ease-out delay-${index * 100} ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
              >
                <div
                  className="h-16 w-16 md:h-20 md:w-20 rounded-lg flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                >
                  <Icon className="h-8 w-8 md:h-10 md:w-10" style={{ color: "rgb(0,115,255)" }} />
                </div>
                <h4 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">{feature.title}</h4>
                <p className="text-gray-700 text-sm md:text-base">{feature.description}</p>
              </div>
            )
          })}
        </div>

        <div
          className={`text-center transition-all duration-1000 ease-out delay-500 mb-8 md:mb-12 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <Button
            size="lg"
            className="text-sm md:text-base px-8 md:px-10 py-4 md:py-5 text-white hover:opacity-90"
            style={{ backgroundColor: "rgb(0,115,255)" }}
          >
            분석하기
          </Button>
        </div>
      </div>
    </div>
  )
}