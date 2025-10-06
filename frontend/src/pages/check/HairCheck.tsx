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
    <div className="min-h-screen bg-white">

      {/* 메인 콘텐츠 */}
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
          <h1 className="text-lg font-semibold text-[#1f0101]">모발 체크</h1>
        </div>

        {/* Main Title Section */}
        <div className="px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#1f0101" }}
            >
              <Camera className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1f0101]">Hairfit</h1>
          </div>
          <h2 className="text-xl font-bold text-[#1f0101] mb-2">
            맞춤 서비스를 위한 모발 체크
          </h2>
          <p className="text-gray-600 text-sm">AI 진단과 자가 진단 중 선택하여 나만의 맞춤형 헤어케어 솔루션을 받아보세요</p>
        </div>

        {/* 체크 옵션 카드들 */}
        <div className="px-4 space-y-4">
          {/* AI 체크 카드 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
            <div className="text-center">
              <div
                className="h-16 w-16 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: "#1f0101", opacity: 0.1 }}
              >
                <Camera className="h-8 w-8" style={{ color: "#1f0101" }} />
              </div>
              <h3 className="text-lg font-bold text-[#1f0101] mb-3">AI 체크</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                최신 AI 기술로 모발 상태를 정밀 분석하고<br />
                개인맞춤형 솔루션을 제공합니다.
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" style={{ color: "#1f0101" }} />
                  <span>30초 진단</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Shield className="h-3 w-3" style={{ color: "#1f0101" }} />
                  <span>완전 익명</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Heart className="h-3 w-3" style={{ color: "#1f0101" }} />
                  <span>개인맞춤</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/hair-diagnosis')}
                className="w-full py-3 px-4 text-white font-semibold rounded-xl transition-all hover:opacity-90"
                style={{ backgroundColor: "#1f0101" }}
              >
                AI 진단 시작하기
              </button>
            </div>
          </div>

          {/* 자가 체크 카드 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
            <div className="text-center">
              <div
                className="h-16 w-16 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: "#1f0101", opacity: 0.1 }}
              >
                <CheckCircle className="h-8 w-8" style={{ color: "#1f0101" }} />
              </div>
              <h3 className="text-lg font-bold text-[#1f0101] mb-3">자가 체크</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                간단한 질문을 통해 탈모 위험도를 체크하고<br />
                예방법을 알아보세요.
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" style={{ color: "#1f0101" }} />
                  <span>2~3분 체크</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Shield className="h-3 w-3" style={{ color: "#1f0101" }} />
                  <span>완전 익명</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Heart className="h-3 w-3" style={{ color: "#1f0101" }} />
                  <span>무료 서비스</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/basp-check')}
                className="w-full py-3 px-4 text-white font-semibold rounded-xl transition-all hover:opacity-90"
                style={{ backgroundColor: "#1f0101" }}
              >
                자가 체크 시작하기
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
