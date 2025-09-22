"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useNavigate } from 'react-router-dom';
export default function MozaraLanding() {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false)
    const statsRef = useRef<HTMLElement>(null)
    const [hasAnimated, setHasAnimated] = useState(false)

    // 헤더 스크롤 효과
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 100)
        }

        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // 숫자 카운트업 애니메이션
    const animateCounter = (element: HTMLElement, target: number) => {
        let current = 0
        const increment = target / 100
        const timer = setInterval(() => {
            current += increment
            if (current >= target) {
                current = target
                clearInterval(timer)
            }

            if (target > 1000) {
                element.textContent = Math.floor(current).toLocaleString() + "+"
            } else if (target === 4.8) {
                element.textContent = current.toFixed(1)
            } else {
                element.textContent = Math.floor(current) + "%"
            }
        }, 20)
    }

    // 스크롤 시 통계 애니메이션
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !hasAnimated) {
                    const statNumbers = entry.target.querySelectorAll(".stat-number")
                    const targets = [15000, 4.8, 89, 76]
                    statNumbers.forEach((stat, index) => {
                        animateCounter(stat as HTMLElement, targets[index])
                    })
                    setHasAnimated(true)
                }
            })
        })

        if (statsRef.current) {
            observer.observe(statsRef.current)
        }

        return () => observer.disconnect()
    }, [hasAnimated])

    // 부드러운 스크롤
    const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault()
        const target = document.querySelector(href)
        if (target) {
            target.scrollIntoView({
                behavior: "smooth",
                block: "start",
            })
        }
    }

    return (
        <div className="font-sans text-gray-800 bg-gray-50">
            {/* Header
            <header
                className={`fixed top-0 w-full z-50 py-4 transition-all duration-300 ${isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg" : "bg-white shadow-md"
                    }`}
            >
                <div className="max-w-6xl mx-auto px-5">
                    <nav className="flex justify-between items-center">
                        <div className="flex items-center text-2xl font-bold text-blue-500">
                            <span className="mr-2">✦</span>
                            MOZARA
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a
                                href="#login"
                                className="text-gray-600 font-medium hover:text-gray-800 transition-colors"
                                onClick={(e) => handleSmoothScroll(e, "#login")}
                            >
                                로그인
                            </a>
                            <a
                                href="#signup"
                                className="bg-blue-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-600 transform hover:-translate-y-0.5 transition-all duration-300"
                                onClick={(e) => handleSmoothScroll(e, "#signup")}
                            >
                                무료 상담 신청
                            </a>
                        </div>
                    </nav>
                </div>
            </header> */}

            {/* Hero Section */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-100 pt-32 pb-20 text-center">
                <div className="max-w-6xl mx-auto px-5">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-5xl md:text-6xl font-bold mb-5 text-gray-900 leading-tight">
                            탈모 개선의 새로운 기준
                            <br />
                            <span className="text-blue-500 text-6xl md:text-7xl">MOZARA</span>
                        </h1>
                        <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
                            전문의와 도우가 함께 연구하고 개발 적용한, 차 깊은 탈모 치료와 관리치료, 당신의 모발을 개선을 위한 맞춤
                            찾기를 하나씩 목표로 써서
                        </p>
                        <a
                            href="#consultation"
                            className="inline-block bg-blue-500 text-white px-9 py-4 rounded-full font-semibold text-lg mb-16 hover:bg-blue-600 transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                            onClick={() => navigate('/main')}
                        >
                            무료 상담 신청하기 →
                        </a>

                        <div className="relative max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-2xl">
                            <img
                                src="https://via.placeholder.com/600x300?text=DUMMY+IMAGE"
                                alt="전문 탈모 치료"
                                className="w-full h-80 object-cover"
                            />
                            <div className="absolute bottom-5 right-5 bg-white/90 px-4 py-2 rounded-full text-sm text-gray-600">
                                1개월 후 결과
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section ref={statsRef} className="bg-white py-16">
                <div className="max-w-6xl mx-auto px-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
                        <div className="stat-item">
                            <h3 className="stat-number text-4xl font-bold text-gray-900 mb-2">0</h3>
                            <p className="text-gray-600 text-sm">누적 치료환자</p>
                        </div>
                        <div className="stat-item">
                            <h3 className="stat-number text-4xl font-bold text-gray-900 mb-2">0</h3>
                            <p className="text-gray-600 text-sm">평균 만족도</p>
                        </div>
                        <div className="stat-item">
                            <h3 className="stat-number text-4xl font-bold text-gray-900 mb-2">0</h3>
                            <p className="text-gray-600 text-sm">개선 효과율</p>
                        </div>
                        <div className="stat-item">
                            <h3 className="stat-number text-4xl font-bold text-gray-900 mb-2">0</h3>
                            <p className="text-gray-600 text-sm">추천 비율</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Section */}
            <section className="bg-blue-50 py-20 text-center">
                <div className="max-w-6xl mx-auto px-5">
                    <h2 className="text-4xl font-bold mb-5 text-gray-900">왜 MOZARA인가요?</h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-16 leading-relaxed">
                        기존의 단발성 도구들과 달리, 분석부터 관리까지 연속적인 개선 여정을 제공합니다
                    </p>

                    <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
                        <div className="bg-white p-8 rounded-2xl text-left shadow-lg hover:transform hover:-translate-y-2 transition-all duration-300">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5 text-2xl">👨‍⚕️</div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-900">전문 의료진 · 과학적 접근</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                동면 의료진이 참여 본격 원인부터 후속까지 과학적 정밀 치료
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl text-left shadow-lg hover:transform hover:-translate-y-2 transition-all duration-300">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5 text-2xl">💊</div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-900">맞춤 소재 시스템 · 실제 결과</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                전암기 사업 재상의 연구와 몸소토로 통건 시 고효율 후완환
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl text-left shadow-lg hover:transform hover:-translate-y-2 transition-all duration-300">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5 text-2xl">👥</div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-900">케어매니저제도 · 관리 체 실명</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">제품 치료 시예 한명부터 흔동 관념 치료 성능시기</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl text-left shadow-lg hover:transform hover:-translate-y-2 transition-all duration-300">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5 text-2xl">⭐</div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-900">마케 해외모제시 제품 · 전 거부건시 보증</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                사조 해외부제 제품 조 부효율 고결타 형상값 시 간 정화
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reviews Section */}
            <section className="py-20 bg-white">
                <div className="max-w-6xl mx-auto px-5">
                    <h2 className="text-center text-4xl font-bold mb-16 text-gray-900">실제 사용자들의 이야기</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-blue-50 p-8 rounded-2xl border-l-4 border-blue-500">
                            <div className="flex items-center mb-5">
                                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-4">
                                    김
                                </div>
                                <div className="font-semibold text-gray-900">김민수</div>
                            </div>
                            <div className="text-gray-600 leading-relaxed mb-4">
                                "3개월 만에 확실한 변화를 느꼈습니다. 스트레스, 목적 원과 치과 방식서 사 치료되고 것 궁금했는데
                                결굽잔다"
                            </div>
                            <div className="inline-block bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-semibold">
                                보조 원단 개선 효과
                            </div>
                        </div>
                        <div className="bg-blue-50 p-8 rounded-2xl border-l-4 border-blue-500">
                            <div className="flex items-center mb-5">
                                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-4">
                                    박
                                </div>
                                <div className="font-semibold text-gray-900">박영준</div>
                            </div>
                            <div className="text-gray-600 leading-relaxed mb-4">
                                "전문의 상담부터 개인별 맞춤 치료까지 체계적인 시스템이 정말 마음에 들어요. 도변에 관성이
                                줄어들었습니다!"
                            </div>
                            <div className="inline-block bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-semibold">
                                개인 맞춤형 관리
                            </div>
                        </div>
                        <div className="bg-blue-50 p-8 rounded-2xl border-l-4 border-blue-500">
                            <div className="flex items-center mb-5">
                                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-4">
                                    이
                                </div>
                                <div className="font-semibold text-gray-900">이준호</div>
                            </div>
                            <div className="text-gray-600 leading-relaxed mb-4">
                                "가격은 처음에 부담이 컸지만 결과를 보고나서 투자 가치가 있다고 생각합니다. 자신감이 많이 생겼어요."
                            </div>
                            <div className="inline-block bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-semibold">
                                충실 원가 개선 효과
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section id="consultation" className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-20 text-center">
                <div className="max-w-6xl mx-auto px-5">
                    <h2 className="text-4xl font-bold mb-5">지금 시작하세요</h2>
                    <p className="text-lg mb-10 opacity-90 leading-relaxed">
                        무료 상담으로 나의 탈모 상태 정확히 파악하고 시작해보세요.
                        <br />전 질문에 개인 맞춤 작성 계획을 받아보실 수 있습니다.
                    </p>
                    <a
                        href="#consultation"
                        className="inline-block bg-white text-blue-500 px-9 py-4 rounded-full font-semibold text-lg hover:transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                    >
                        무료 상담 신청하기 →
                    </a>
                </div>
            </section>

            {/* Footer
            <footer className="bg-gray-900 text-white py-10 text-center">
                <div className="max-w-6xl mx-auto px-5">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-5">
                        <div className="flex items-center text-2xl font-bold">
                            <span className="mr-2">✦</span>
                            MOZARA
                        </div>
                        <div className="flex gap-8">
                            <a href="#privacy" className="text-gray-400 text-sm hover:text-white transition-colors">
                                개인정보취급방침
                            </a>
                            <a href="#terms" className="text-gray-400 text-sm hover:text-white transition-colors">
                                이용약관
                            </a>
                            <a href="#faq" className="text-gray-400 text-sm hover:text-white transition-colors">
                                자주 묻는 질문
                            </a>
                            <a href="#contact" className="text-gray-400 text-sm hover:text-white transition-colors">
                                연락처
                            </a>
                        </div>
                    </div>
                    <div className="text-gray-500 text-sm border-t border-gray-700 pt-5">
                        © 2024 MOZARA. All rights reserved. | 사업자등록번호 | 이용약관
                    </div>
                </div>
            </footer> */}
        </div>
    )
}
