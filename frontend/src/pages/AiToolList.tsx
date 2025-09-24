import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Star 아이콘 컴포넌트
const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

// 아이콘 컴포넌트들
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const HairIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const StoreIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const BookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const HeartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

export default function AiToolList() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const aiTools = [
    { 
      id: "hair-change", 
      name: "머리스타일 변경", 
      icon: HairIcon, 
      color: "bg-purple-500",
      description: "다양한 머리스타일로 변신해보세요.",
      category: "hair"
    },
    { 
      id: "image-gen", 
      name: "이미지 생성", 
      icon: ImageIcon, 
      color: "bg-green-500",
      description: "AI로 창의적인 이미지를 생성합니다.",
      category: "creative"
    },
    { 
      id: "chat-summary", 
      name: "챗봇요약", 
      icon: ChatIcon, 
      color: "bg-orange-500",
      description: "긴 대화를 간단하게 요약해드립니다.",
      category: "productivity"
    },
    { 
      id: "store-finder", 
      name: "상가찾기", 
      icon: StoreIcon, 
      color: "bg-red-500",
      description: "원하는 상가를 쉽게 찾아보세요.",
      category: "utility"
    },
    { 
      id: "basp-check", 
      name: "BASP 탈모 진단", 
      icon: SearchIcon, 
      color: "bg-indigo-500",
      description: "전문적인 탈모 진단을 받아보세요.",
      category: "hair"
    },
    { 
      id: "counseling", 
      name: "고민 상담", 
      icon: HeartIcon, 
      color: "bg-pink-500",
      description: "AI와 함께 고민을 나누어보세요.",
      category: "wellness"
    },
    { 
      id: "generative-tools", 
      name: "생성형 도구", 
      icon: EditIcon, 
      color: "bg-teal-500",
      description: "다양한 콘텐츠를 생성하는 도구들입니다.",
      category: "creative"
    },
    { 
      id: "hair-encyclopedia", 
      name: "탈모 백과", 
      icon: BookIcon, 
      color: "bg-emerald-500",
      description: "탈모 관련 정보와 논문을 검색할 수 있습니다.",
      category: "knowledge"
    },
  ];

  const filteredTools = aiTools; // 필터링 기능은 나중에 추가 가능

  const toggleFavorite = (toolId: string) => {
    setFavorites(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  return (
    <div className="max-w-7xl mx-auto pt-16">
        <main className="px-8 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Page Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">AI 도구 모음</h1>
              <p className="text-lg text-gray-600">다양한 AI 도구들을 만나보세요</p>
            </div>

            {/* AI Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredTools.map((tool) => {
                const IconComponent = tool.icon
                return (
                  <div
                    key={tool.id}
                    className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => {
                      if (tool.id === "hair-change") {
                        navigate('/hair-change');
                      } else if (tool.id === "basp-check") {
                        navigate('/basp-check');
                      } else if (tool.id === "hair-encyclopedia") {
                        navigate('/hair-encyclopedia');
                      } else if (tool.id === "store-finder") {
                        navigate('/store-finder');
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${tool.color} flex items-center justify-center text-white`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(tool.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <StarIcon
                          className={`w-5 h-5 ${
                            favorites.includes(tool.id)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-400 hover:text-yellow-400"
                          }`}
                        />
                      </button>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-2">{tool.name}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{tool.description}</p>
                  </div>
                )
              })}
            </div>

            {filteredTools.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">선택한 카테고리에 도구가 없습니다.</p>
              </div>
            )}
          </div>
        </main>
    </div>
  )
}
