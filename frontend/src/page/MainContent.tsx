export default function Home() {
  const aiTools = [
    { name: "GPT-5", icon: "🤖", badge: "무료일 무료" },
    { name: "AI 힙", icon: "⚡", badge: null },
    { name: "이미지 생성", icon: "🎨", badge: null },
    { name: "챗봇요약", icon: "💬", badge: null },
    { name: "상가찾기", icon: "🏪", badge: null },
    { name: "워드스피킹", icon: "📞", badge: "한국어 출시" },
    { name: "고민 상담", icon: "💭", badge: null },
    { name: "생성형 도구", icon: "✏️", badge: null },
  ]

  const trendingSearches = [
    "APEC 정상회의 준비 상황",
    "김동률 톡톡 사태",
    "김예지 4타수 무안타 경기",
    "스톤시 가맹 사이트 피해",
    "센터로 초등생 우리미수 영상 실시",
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}

      {/* Main Content */}
      <div className="flex max-w-7xl mx-auto pt-16">
        <aside className="w-16 bg-white border-r border-gray-200 py-4">
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-1 text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">💬</div>
              <span className="text-xs">채팅</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">🛠️</div>
              <span className="text-xs">도구</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">🎯</div>
              <span className="text-xs">해커</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">📚</div>
              <span className="text-xs">자료실</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-8 py-12">
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

                <div className="flex items-center justify-center gap-4">
                  <button className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                    <span className="text-2xl">+</span>
                  </button>
                  <button className="flex items-center gap-2 px-6 py-3 bg-gray-100 rounded-full hover:bg-gray-200">
                    <span className="text-sm">🌐</span>
                    <span className="text-sm text-gray-700">검색</span>
                  </button>
                  <button className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                    <span className="text-xl">↑</span>
                  </button>
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
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="text-center">
                      <div className="text-3xl mb-3">{tool.icon}</div>
                      <div className="text-sm font-medium text-gray-800">{tool.name}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Content Cards */}
            <div className="grid grid-cols-2 gap-6">
              {/* AI Animation Card */}
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl p-6 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">AI 및 필터</h3>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">감성 애니메이션</h4>
                  <p className="text-sm text-gray-600">AI 최고 유형, 설정하는 감성</p>
                </div>
                <div className="absolute right-4 top-4 w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl">?</span>
                </div>
              </div>

              {/* Trending Searches */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-blue-600">⚡</span>
                  <h3 className="font-semibold text-gray-800">실시간 검색어 순위</h3>
                </div>
                <div className="space-y-3">
                  {trendingSearches.map((search, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-700 flex-1">{search}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
    </div>
  )
}
