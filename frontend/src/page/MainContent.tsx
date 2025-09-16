import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  
  const aiTools = [
    { name: "모발 손상 분석", icon: "🔍", badge: "NEW" },
    { name: "머리스타일 변경", icon: "💇", badge: "NEW" },
    { name: "탈모 PT", icon: "🏃", badge: "NEW" },
    { name: "YouTube 영상", icon: "📺", badge: "NEW" },
    { name: "제품추천", icon: "🛍️", badge: "NEW" },
    { name: "탈모 백과", icon: "📚", badge: "NEW" },
    { name: "데일리 케어", icon: "📅", badge: "NEW" },
    { name: "이미지 생성", icon: "🎨", badge: null },
    { name: "챗봇요약", icon: "💬", badge: null },
    { name: "상가찾기", icon: "🏪", badge: null },
    { name: "BASP 탈모 진단", icon: "🔍", badge: "자가진단" },
    { name: "고민 상담", icon: "💭", badge: null },
    { name: "탈모 OX 퀴즈", icon: "⭕❌", badge: null },
  ]

  const hairLossSearches = [
    "탈모 모발이식",
    "탈모샴푸",
    "탈모",
    "탈모약",
    "정수리 탈모",
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <div className="max-w-7xl mx-auto pt-16">
        <main className="px-8 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Logo and Search */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  M!
                </div>
                <h1 className="text-4xl font-bold text-gray-800">毛자라</h1>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="무엇이든 물어보세요"
                    className="w-full px-6 py-4 text-lg border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

              </div>
            </div>

            {/* AI Tools Grid */}
            <div className="grid grid-cols-4 gap-6 mb-12">
              {aiTools.map((tool, index) => (
                <div key={index} className="relative">
                  {tool.badge && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <span className="px-2 py-1 text-xs text-white bg-blue-600 rounded-full">{tool.badge}</span>
                    </div>
                  )}
                  <div 
                    className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      if (tool.name === "모발 손상 분석") {
                        navigate('/hair-damage');
                      } else if (tool.name === "머리스타일 변경") {
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
                      <div className="text-3xl mb-3">{tool.icon}</div>
                      <div className="text-sm font-medium text-gray-800">{tool.name}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trending Hair Loss Searches */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-blue-600">📈</span>
                <h3 className="font-semibold text-gray-800">탈모 검색어 통계 순위</h3>
              </div>
              <div className="space-y-3">
                {hairLossSearches.map((search, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                      {index + 1}
                    </span>
                    <span className="text-base text-gray-700 flex-1 font-medium">{search}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

    </div>
  )
}
