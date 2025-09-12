import React from 'react';
import { useNavigate } from 'react-router-dom';

// 아이콘 컴포넌트들
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

export default function HairCheck() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "#f9f9f9" }}>

      {/* 배경 효과 */}
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

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 pt-20 pb-20">
        <div className="container mx-auto px-4">
          {/* 헤더 섹션 */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-8">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "rgb(0,115,255)" }}
              >
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">毛자라</h1>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              맞춤 서비스를 위한
              <br />
              <span style={{ color: "rgb(0,115,255)" }}>모발 체크</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              AI 진단과 자가 진단 중 선택하여 나만의 맞춤형 헤어케어 솔루션을 받아보세요.
            </p>
          </div>

          {/* 체크 옵션 카드들 */}
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              {/* AI 체크 카드 */}
              <div className="bg-white/70 backdrop-blur rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                <div className="text-center">
                  <div
                    className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                  >
                    <Camera className="h-10 w-10" style={{ color: "rgb(0,115,255)" }} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">AI 체크</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    최신 AI 기술로 모발 상태를 정밀 분석하고<br />
                    개인맞춤형 솔루션을 제공합니다.
                  </p>
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" style={{ color: "rgb(0,115,255)" }} />
                      <span>30초 진단</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Shield className="h-4 w-4" style={{ color: "rgb(0,115,255)" }} />
                      <span>완전 익명</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Heart className="h-4 w-4" style={{ color: "rgb(0,115,255)" }} />
                      <span>개인맞춤</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/hair-diagnosis')}
                    className="w-full py-4 px-6 text-white font-semibold rounded-xl transition-all hover:opacity-90"
                    style={{ backgroundColor: "rgb(0,115,255)" }}
                  >
                    AI 진단 시작하기
                  </button>
                </div>
              </div>

              {/* 자가 체크 카드 */}
              <div className="bg-white/70 backdrop-blur rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                <div className="text-center">
                  <div
                    className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                  >
                    <CheckCircle className="h-10 w-10" style={{ color: "rgb(0,115,255)" }} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">자가 체크</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    간단한 질문을 통해 탈모 위험도를 체크하고<br />
                    예방법을 알아보세요.
                  </p>
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" style={{ color: "rgb(0,115,255)" }} />
                      <span>2~3분 체크</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Shield className="h-4 w-4" style={{ color: "rgb(0,115,255)" }} />
                      <span>완전 익명</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Heart className="h-4 w-4" style={{ color: "rgb(0,115,255)" }} />
                      <span>무료 서비스</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/basp-check')}
                    className="w-full py-4 px-6 text-white font-semibold rounded-xl transition-all hover:opacity-90"
                    style={{ backgroundColor: "rgb(0,115,255)" }}
                  >
                    자가 체크 시작하기
                  </button>
                </div>
              </div>
            </div>

            {/* 추가 정보 섹션
            <div className="bg-white/50 backdrop-blur rounded-2xl p-8 border border-gray-200">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">서비스 특징</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                    >
                      <Shield className="h-6 w-6" style={{ color: "rgb(0,115,255)" }} />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">완전 익명</h4>
                    <p className="text-sm text-gray-600">개인정보 보호를 최우선으로 합니다</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                    >
                      <Heart className="h-6 w-6" style={{ color: "rgb(0,115,255)" }} />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">개인맞춤</h4>
                    <p className="text-sm text-gray-600">나만의 맞춤형 솔루션을 제공합니다</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: "rgba(0,115,255,0.1)" }}
                    >
                      <Clock className="h-6 w-6" style={{ color: "rgb(0,115,255)" }} />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">빠른 진단</h4>
                    <p className="text-sm text-gray-600">복잡한 절차 없이 바로 시작하세요</p>
                  </div>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>

    </div>
  );
}
