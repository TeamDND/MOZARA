import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  
  const aiTools = [
    { name: "머리스타일 변경", icon: "💇", badge: "NEW" },
    { name: "탈모 PT", icon: "🏃", badge: "NEW" },
    { name: "YouTube 영상", icon: "📺", badge: "NEW" },
    { name: "제품추천", icon: "🛍️", badge: "NEW" },
    { name: "탈모 백과", icon: "📚", badge: "NEW" },
    { name: "데일리 케어", icon: "📅", badge: "NEW" },
    { name: "상가찾기", icon: "🏪", badge: null },
    { name: "BASP 탈모 진단", icon: "🔍", badge: "자가진단" },
    { name: "탈모 OX 퀴즈", icon: "⭕❌", badge: null },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Container - PC에서도 모바일 레이아웃 중앙 정렬 */}
      <div className="max-w-md mx-auto min-h-screen bg-white">
        {/* Mobile Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              M!
            </div>
            <h1 className="text-xl font-bold text-gray-800">毛자라</h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="px-4 py-6">
          {/* Search Section */}
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="무엇이든 물어보세요"
                className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
              />
              <div className="absolute right-3 top-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* AI Tools Grid - Mobile-First */}
          <div className="grid grid-cols-2 gap-4">
            {aiTools.map((tool, index) => (
              <div key={index} className="relative">
                {tool.badge && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <span className="px-1.5 py-0.5 text-xs text-white bg-blue-600 rounded-full">
                      {tool.badge}
                    </span>
                  </div>
                )}
                <div 
                  className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer active:scale-95 touch-manipulation"
                  onClick={() => {
                    if (tool.name === "머리스타일 변경") {
                      navigate('/hair-change');
                    } else if (tool.name === "탈모 PT") {
                      navigate('/hair-pt');
                    } else if (tool.name === "YouTube 영상") {
                      navigate('/youtube-videos');
                    } else if (tool.name === "제품추천") {
                      navigate('/product-search');
                    } else if (tool.name === "탈모 OX 퀴즈") {
                      navigate('/hair-quiz');
                    } else if (tool.name === "BASP 탈모 진단") {
                      navigate('/basp-check');
                    } else if(tool.name === "탈모 백과"){
                      navigate('/hair-encyclopedia')
                    } else if(tool.name === "데일리 케어"){
                      navigate('/daily-care')
                    }
                  }}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">{tool.icon}</div>
                    <div className="text-xs font-medium text-gray-800 leading-tight">
                      {tool.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Spacing for Mobile Navigation */}
          <div className="h-20"></div>
        </main>
      </div>
    </div>
  )
}
