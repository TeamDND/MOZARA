import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useScrollAnimation, useParallax } from "../hooks/useScrollAnimation"
import HeroSection from "../components/sections/HeroSection"
import ServicesSection from "../components/sections/ServicesSection"
import StepsSection from "../components/sections/StepsSection"
import FeaturesSection from "../components/sections/FeaturesSection"
import SectionNavigation from "../components/navigation/SectionNavigation"
import BackgroundImage from "../components/sections/BackgroundImage"

export default function HomePage() {
  const navigate = useNavigate()
  const [currentSection, setCurrentSection] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const totalSections = 4
  const containerRef = useRef<HTMLDivElement>(null)

  // 스크롤 애니메이션 훅들
  const heroAnimation = useScrollAnimation({ threshold: 0.2, triggerOnce: false })
  const servicesAnimation = useScrollAnimation({ threshold: 0.1, triggerOnce: false })
  const stepsAnimation = useScrollAnimation({ threshold: 0.1, triggerOnce: false })
  const featuresAnimation = useScrollAnimation({ threshold: 0.1, triggerOnce: false })

  // 패럴랙스 효과
  const parallaxOffset = useParallax(0.1)

  // 모바일 감지 및 초기 설정
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md 브레이크포인트
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 페이지 로드 시 첫 번째 섹션으로 이동
  useEffect(() => {
    setCurrentSection(0)
  }, [])

  // 휠 이벤트 핸들러 (데스크톱만)
  useEffect(() => {
    if (isMobile) return // 모바일에서는 휠 이벤트 비활성화
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (isScrolling) return

      setIsScrolling(true)
      
      if (e.deltaY > 0 && currentSection < totalSections - 1) {
        // 아래로 스크롤
        setCurrentSection(prev => prev + 1)
      } else if (e.deltaY < 0 && currentSection > 0) {
        // 위로 스크롤
        setCurrentSection(prev => prev - 1)
      }

      setTimeout(() => setIsScrolling(false), 1000)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel)
      }
    }
  }, [currentSection, isScrolling, totalSections, isMobile])

  // 키보드 네비게이션 (데스크톱만)
  useEffect(() => {
    if (isMobile) return // 모바일에서는 키보드 네비게이션 비활성화
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScrolling) return

      if (e.key === 'ArrowDown' && currentSection < totalSections - 1) {
        e.preventDefault()
        setIsScrolling(true)
        setCurrentSection(prev => prev + 1)
        setTimeout(() => setIsScrolling(false), 1000)
      } else if (e.key === 'ArrowUp' && currentSection > 0) {
        e.preventDefault()
        setIsScrolling(true)
        setCurrentSection(prev => prev - 1)
        setTimeout(() => setIsScrolling(false), 1000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSection, isScrolling, totalSections, isMobile])


  const scrollToSection = (sectionIndex: number) => {
    if (isScrolling) return
    setIsScrolling(true)
    setCurrentSection(sectionIndex)
    setTimeout(() => setIsScrolling(false), 1000)
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${isMobile ? 'min-h-screen' : 'h-screen overflow-hidden'}`}
      style={isMobile ? {} : { height: '100vh' }}
    >
      <SectionNavigation 
        currentSection={currentSection} 
        onScrollToSection={scrollToSection} 
      />

      <BackgroundImage parallaxOffset={parallaxOffset} />

      {/* 섹션 컨테이너 */}
      <div
        className={`relative ${isMobile ? 'space-y-0' : 'h-full transition-transform duration-1000 ease-in-out'}`}
        style={isMobile ? {} : {
          transform: `translateY(-${currentSection * 100}vh)`
        }}
      >


        <section ref={heroAnimation.ref}>
          <HeroSection 
            isVisible={heroAnimation.isVisible}
            parallaxOffset={parallaxOffset}
            onNavigate={navigate}
          />
        </section>

        <section ref={servicesAnimation.ref}>
          <ServicesSection 
            isVisible={servicesAnimation.isVisible}
            onNavigate={navigate}
          />
        </section>

        <section ref={stepsAnimation.ref}>
          <StepsSection 
            isVisible={stepsAnimation.isVisible}
          />
        </section>

        <section ref={featuresAnimation.ref}>
          <FeaturesSection 
            isVisible={featuresAnimation.isVisible}
          />
        </section>


      </div>
    </div>
  )
}
