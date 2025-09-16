import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 로고 및 설명 */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                M!
              </div>
              <span className="text-xl font-bold text-blue-600">毛자라</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              AI 기반 모발 관리 및 분석 서비스로 건강한 모발을 위한 맞춤형 솔루션을 제공합니다.
            </p>
          </div>

          {/* 서비스 */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">서비스</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/hair-damage" className="hover:text-blue-600 transition-colors">모발 손상 분석</a></li>
              <li><a href="/hair-change" className="hover:text-blue-600 transition-colors">머리스타일 변경</a></li>
              <li><a href="/basp-check" className="hover:text-blue-600 transition-colors">BASP 탈모 진단</a></li>
              <li><a href="/ai-tools" className="hover:text-blue-600 transition-colors">AI 도구 모음</a></li>
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">고객지원</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><button className="hover:text-blue-600 transition-colors text-left">자주 묻는 질문</button></li>
              <li><button className="hover:text-blue-600 transition-colors text-left">문의하기</button></li>
              <li><button className="hover:text-blue-600 transition-colors text-left">이용약관</button></li>
              <li><button className="hover:text-blue-600 transition-colors text-left">개인정보처리방침</button></li>
            </ul>
          </div>
        </div>

        {/* 하단 저작권 */}
        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-500">
            © 2025 毛자라. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}