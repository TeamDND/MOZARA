import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ImageWithFallback } from '../hooks/ImageWithFallback';

export default function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("solutions");
  
  // 솔루션 카테고리
  const solutions = [
    { 
      name: "탈모 PT", 
      description: "새싹 키우기를 통한 생활습관 챌린지로 헤어 관리 동기부여",
      badge: "NEW",
      image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=300&h=300&fit=crop&crop=center" // 운동/습관 느낌
    },
    { 
      name: "탈모 맵", 
      description: "내 주변 탈모 전문 병원과 클리닉을 쉽게 찾아보세요",
      badge: "NEW",
      image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&h=300&fit=crop&crop=center" // 지도 썸네일
    },
    { 
      name: "제품추천", 
      description: "AI 분석 결과에 따른 개인 맞춤 헤어케어 제품 추천",
      badge: "NEW",
      image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=300&h=300&fit=crop&crop=center" // 화장품/제품
    },
  ];

  // 컨텐츠 카테고리
  const contents = [
    { 
      name: "머리스타일 변경", 
      description: "AI를 통한 가상 헤어스타일 체험과 시뮬레이션",
      badge: "NEW",
      image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=300&fit=crop&crop=center" // 헤어/살롱
    },
    { 
      name: "YouTube 영상", 
      description: "전문가가 추천하는 탈모 관리 및 헤어케어 영상 모음",
      badge: "NEW",
      image: "https://images.unsplash.com/photo-1497551060073-4c5ab6435f12?w=300&h=300&fit=crop&crop=center" // 동영상/미디어
    },
    { 
      name: "탈모 백과", 
      description: "탈모에 대한 과학적 정보와 전문 지식을 한눈에",
      badge: "NEW",
      useIcon: true
    },
  ];

  // 도구 클릭 핸들러
  const handleToolClick = (toolName: string) => {
    switch (toolName) {
      case "머리스타일 변경":
        navigate('/hair-change');
        break;
      case "탈모 PT":
        navigate('/hair-pt');
        break;
      case "YouTube 영상":
        navigate('/youtube-videos');
        break;
      case "제품추천":
        navigate('/product-search');
        break;
      case "탈모 백과":
        navigate('/hair-encyclopedia');
        break;
      case "탈모 맵":
        navigate('/store-finder');
        break;
      default:
        break;
    }
  };

  // 도구 카드 렌더링 함수 (배너 스타일)
  const renderToolCard = (tool: any, index: number) => (
    <div key={index} className="relative">
      {tool.badge && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] leading-none text-white bg-[#222222]/90 rounded-full shadow-sm">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-300">
              <path d="M12 2l1.9 5.8h6.1l-4.9 3.6 1.9 5.8-5-3.6-5 3.6 1.9-5.8L4 7.8h6.1L12 2z"/>
            </svg>
            {tool.badge}
          </span>
        </div>
      )}
      <div 
        className="bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer active:scale-[0.98] touch-manipulation overflow-hidden"
        onClick={() => handleToolClick(tool.name)}
      >
        <div className="flex items-center p-4">
          {/* 이미지 영역 */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 mr-4 flex items-center justify-center">
            {tool.useIcon ? (
              <svg viewBox="0 0 24 24" width="28" height="28" className="text-[#1F0101]" fill="currentColor" aria-hidden>
                <path d="M4 5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.8.4l-1.2-.9a4 4 0 0 0-2.4-.8H6a2 2 0 0 0-2 2V5z"/>
                <path d="M17 3h1a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.8.4l-1.2-.9a4 4 0 0 0-2.4-.8H8" fill="none" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            ) : (
              <ImageWithFallback 
                src={tool.image}
                alt={tool.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          
          {/* 텍스트 영역 */}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">{tool.name}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{tool.description}</p>
          </div>
          
          {/* 화살표 */}
          <div className="flex-shrink-0 ml-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Container - PC에서도 모바일 레이아웃 중앙 정렬 */}
      <div className="max-w-md mx-auto min-h-screen bg-white">
        {/* Main Content */}
        <main className="px-4 py-6">
          {/* 탭 네비게이션 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
            <div className="space-y-3">
              <div className="flex gap-6 w-full pb-2">
                <button
                  onClick={() => setActiveTab("solutions")}
                  className={`text-sm font-medium transition-colors ${
                    activeTab === "solutions" 
                      ? "text-gray-900 border-b-2 border-gray-900" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  솔루션
                </button>
                <button
                  onClick={() => setActiveTab("contents")}
                  className={`text-sm font-medium transition-colors ${
                    activeTab === "contents" 
                      ? "text-gray-900 border-b-2 border-gray-900" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  컨텐츠
                </button>
              </div>
              {/* 구분선 */}
              <div className="border-b border-gray-200"></div>
            </div>

            {/* 솔루션 탭 */}
            <TabsContent value="solutions" className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 mb-2">솔루션</h2>
                <p className="text-sm text-gray-600">탈모 개선을 위한 실용적인 솔루션들</p>
              </div>
              <div className="space-y-3">
                {solutions.map((tool, index) => renderToolCard(tool, index))}
              </div>
            </TabsContent>

            {/* 컨텐츠 탭 */}
            <TabsContent value="contents" className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 mb-2">컨텐츠</h2>
                <p className="text-sm text-gray-600">유익하고 재미있는 헤어 관련 컨텐츠들</p>
              </div>
              <div className="space-y-3">
                {contents.map((tool, index) => renderToolCard(tool, index))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Bottom Spacing for Mobile Navigation */}
          <div className="h-20"></div>
        </main>
      </div>
    </div>
  )
}

