import type React from "react"
import { Camera, ChevronRight } from "../ui/icons"
import { Button } from "../ui/Button"

interface HeroSectionProps {
  isVisible: boolean
  parallaxOffset: number
  onNavigate: (path: string) => void
}

export default function HeroSection({ isVisible, parallaxOffset, onNavigate }: HeroSectionProps) {
  return (
    <div className="min-h-screen md:h-screen flex items-center px-4 pt-16 md:pt-0 bg-black/5 relative z-10">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* 왼쪽 텍스트 영역 */}
          <div
            className={`transition-all duration-1000 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              <span style={{ color: "rgb(0,115,255)" }}>혹시 나도 탈모일까?</span>
              <br />
              혼자 고민하지 마세요.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-lg">
              누구에게도 털어놓기 어려웠던 고민, 이제 AI와 함께하세요.
              <br />
              쉽고 빠르게 나만의 맞춤 솔루션을 제공받아보세요.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                size="lg"
                className="text-sm md:text-base px-6 md:px-8 py-3 md:py-4 text-white hover:opacity-90"
                style={{ backgroundColor: "rgb(0,115,255)" }}
                onClick={() => onNavigate('/hair-check')}
              >
                <Camera className="h-4 w-4 mr-2" />
                헤어 체크
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-sm md:text-base px-6 md:px-8 py-3 md:py-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => onNavigate('/temp-main')}
              >
                전체 기능 보기
                {/* 더 알아보기(임시페이지 이동) */}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* 오른쪽 이미지 영역 */}
          <div
            className={`transition-all duration-1000 ease-out delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="space-y-4">
              {/* 첫 번째 이미지 */}
              <div className="relative">
                <img
                  src="/hair-care-1.jpg"
                  alt="헤어케어 서비스 1"
                  className="w-full h-64 md:h-80 object-cover rounded-lg shadow-lg grayscale hover:grayscale-0 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
              </div>
              
              {/* 두 번째 이미지 */}
              <div className="relative">
                <img
                  src="/hair-care-2.jpg"
                  alt="헤어케어 서비스 2"
                  className="w-full h-64 md:h-80 object-cover rounded-lg shadow-lg grayscale hover:grayscale-0 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}