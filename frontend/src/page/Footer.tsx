export default function Footer() {
    return (
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-4 gap-8 mb-6">
            {/* Company Info */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Mozara</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    회사소개
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    채용정보
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    투자정보
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    보도자료
                  </a>
                </li>
              </ul>
            </div>
  
            {/* Services */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">서비스</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    AI 챗봇
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    이미지 생성
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    텍스트 분석
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    API 서비스
                  </a>
                </li>
              </ul>
            </div>
  
            {/* Policy */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">정책 및 약관</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    이용약관
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    개인정보처리방침
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    의료정책
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    청소년 보호정책
                  </a>
                </li>
              </ul>
            </div>
  
            {/* SNS & Contact */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">소셜 미디어</h4>
              <div className="flex gap-3 mb-4">
                <a
                  href="#"
                  className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700"
                >
                  f
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white hover:bg-blue-500"
                >
                  T
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white hover:bg-pink-600"
                >
                  📷
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                >
                  ▶
                </a>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600">
                    고객센터
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600">
                    문의하기
                  </a>
                </li>
              </ul>
            </div>
          </div>
  
          <div className="border-t border-gray-200 pt-4">
            <p className="text-center text-sm text-gray-500">© 2024 Mozara. All rights reserved.</p>
          </div>
        </div>
      </footer>
    )
  }
  