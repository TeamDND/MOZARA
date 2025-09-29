import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ImageWithFallback } from "../hooks/ImageWithFallback"
import { useSelector } from "react-redux"
import { RootState } from "../utils/store"

export default function HomePage() {
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)
  const sliderRef = useRef<HTMLDivElement>(null)
  
  // 로그인 상태 가져오기
  const token = useSelector((state: RootState) => state.token.token)
  const isLoggedIn = !!token

  // 모든 서비스 데이터 (솔루션 + 컨텐츠)
  const allServices = [
    { 
      name: "탈모 PT", 
      description: "새싹 키우기를 통한 생활습관 챌린지로 헤어 관리 동기부여",
      badge: "NEW",
      image: "/assets/images/landing/landingslide1.png",
      category: "솔루션"
    },
    { 
      name: "탈모 맵", 
      description: "내 주변 탈모 전문 병원과 클리닉을 쉽게 찾아보세요",
      badge: "NEW",
      image: "/assets/images/landing/landingslide2.png",
      category: "솔루션"
    },
    { 
      name: "제품추천", 
      description: "AI 분석 결과에 따른 개인 맞춤 헤어케어 제품 추천",
      badge: "NEW",
      image: "/assets/images/landing/landingslide3.png",
      category: "솔루션"
    },
    { 
      name: "머리스타일 변경", 
      description: "AI를 통한 가상 헤어스타일 체험과 시뮬레이션",
      badge: "NEW",
      image: "/assets/images/landing/landingslide4.png",
      category: "컨텐츠"
    },
    { 
      name: "YouTube 영상", 
      description: "전문가가 추천하는 탈모 관리 및 헤어케어 영상 모음",
      badge: "NEW",
      image: "/assets/images/landing/landingslide5.png",
      category: "컨텐츠"
    },
    { 
      name: "탈모 백과", 
      description: "탈모에 대한 과학적 정보와 전문 지식을 한눈에",
      badge: "NEW",
      image: "/assets/images/landing/landingslide6.png",
      category: "컨텐츠"
    },
  ];


  // 슬라이더 자동 재생
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % allServices.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [allServices.length]);

  // 슬라이더 위치 업데이트
  useEffect(() => {
    if (sliderRef.current) {
      const slideWidth = sliderRef.current.offsetWidth / 3; // 한 번에 3개씩 보이도록
      sliderRef.current.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
    }
  }, [currentSlide]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 풀스크린 영상 백그라운드 */}
      <div className="fixed inset-0 z-0">
        <video
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/videos/landingvideo.mp4" type="video/mp4" />
          브라우저가 비디오를 지원하지 않습니다.
        </video>
        {/* 오버레이 */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* 상단 로고 영역 */}
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 font-serif">
              HairFit
            </h1>
            <p className="text-white text-lg md:text-xl mb-8 opacity-90">
              AI 분석 기반 맞춤형 솔루션 및 컨텐츠
            </p>

            <p className="text-white text-lg md:text-xl mb-8 opacity-90">
              셀카로 쉽게 알아보는 내 탈모 진행 상태
            </p>
            <p  className="text-white text-lg md:text-xl mb-8 opacity-90">
            나만의 탈모 로드맵을 받아보세요
            </p>
            <button
              className="bg-[#222222] text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-[#333333] transition-colors"
              onClick={() => {
                if (isLoggedIn) {
                  navigate('/daily-care')
                } else {
                  navigate('/login')
                }
              }}
            >
              시작해보기
            </button>
          </div>
        </div>

       

        {/* 서비스 슬라이더 */}
        <div className="py-8">
          <div className="max-w-6xl mx-auto px-4">
            <div className="relative overflow-hidden">
              <div 
                ref={sliderRef}
                className="flex transition-transform duration-500 ease-in-out"
                style={{ width: `${allServices.length * 33.333}%` }}
              >
                {allServices.map((service, index) => (
                  <div
                    key={index}
                    className="w-1/3 px-3 flex-shrink-0"
                  >
                    <div
                      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all overflow-hidden h-40"
                    >
                      <ImageWithFallback 
                        src={service.image}
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 슬라이더 인디케이터 */}
            <div className="flex justify-center mt-6 space-x-2">
              {Array.from({ length: Math.ceil(allServices.length / 3) }).map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    Math.floor(currentSlide / 3) === index ? 'bg-[#222222]' : 'bg-[#222222] opacity-30'
                  }`}
                  onClick={() => setCurrentSlide(index * 3)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}