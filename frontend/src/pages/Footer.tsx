import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-7">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            H!
          </div>
          <span className="text-xl font-bold text-blue-600">Hairfit</span>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          AI 기반 모발 관리 및 분석 서비스로 건강한 모발을 위한 맞춤형 솔루션을 제공합니다.
        </p>
        <div className="text-gray-500 text-xs mb-3 space-y-1">
          {/* <p>본 페이지의 정보는 전문적 의학적 소견이 아니며, 참고용으로만 활용해 주시기 바랍니다.</p> */}
          <p>본 서비스는 의료법 제56조(무면허 의료행위 등 금지)를 준수하며, 어떠한 진단이나 치료를 대체하지 않습니다.</p>
          <p>의료법 제27조에 따라 의료행위는 면허를 받은 의료인만이 할 수 있으며, 질병의 진단 및 치료는 반드시 전문의와 상담하시기 바랍니다.</p>
          
        </div>
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            © 2025 Hairfit. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}