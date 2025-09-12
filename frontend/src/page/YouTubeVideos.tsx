import React, { useState, useEffect, useCallback } from 'react';
import { configApi } from '../api/configApi';
import Header from './Header';

interface Video {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
}

interface StageRecommendation {
  title: string;
  query: string;
}

const stageRecommendations: Record<string, StageRecommendation> = {
  stage0: { title: '0단계 (정상) - 예방 및 두피 관리', query: '탈모 예방 두피 관리' },
  stage1: { title: '1단계 (초기) - 초기 증상 및 관리법', query: '탈모 초기 증상 샴푸' },
  stage2: { title: '2단계 (중기) - 약물 치료 및 전문 관리', query: '탈모 약 미녹시딜 프로페시아' },
  stage3: { title: '3단계 (심화) - 모발이식 및 시술 정보', query: '모발이식 두피문신 SMP 후기' }
};

export default function YouTubeVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('탈모');
  const [feedTitle, setFeedTitle] = useState('⭐ 인기 급상승 영상');
  const [selectedStage, setSelectedStage] = useState('stage0');

  // YouTube API 키는 환경변수에서 가져옴 (따옴표 제거)
  const [youtubeApiKey, setYoutubeApiKey] = useState<string>('');

  // YouTube API 키 로드
  useEffect(() => {
    const loadYouTubeApiKey = async () => {
      try {
        const apiKey = await configApi.getYouTubeApiKey();
        setYoutubeApiKey(apiKey || '');
      } catch (error) {
        console.error('YouTube API 키 로드 실패:', error);
        setYoutubeApiKey('');
      }
    };
    
    loadYouTubeApiKey();
  }, []);

  const fetchVideosFromYouTube = useCallback(async (query: string, order: string = 'viewCount') => {
    if (!youtubeApiKey) {
      setError('YouTube API 키가 설정되지 않았습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&order=${order}&type=video&maxResults=12&key=${youtubeApiKey}`;
      
      console.log('API URL:', apiUrl);
      console.log('API Key:', youtubeApiKey ? 'Set' : 'Not set');
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status} Error`);
      }

      if (data.items.length === 0) {
        throw new Error('검색 결과에 해당하는 영상이 없습니다.');
      }

      const videoList: Video[] = data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.high.url
      }));

      setVideos(videoList);
    } catch (err) {
      console.error('YouTube API Error:', err);
      setError(err instanceof Error ? err.message : 'API 호출 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [youtubeApiKey]);

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      setFeedTitle(`🔍 "${query}" 검색 결과`);
      fetchVideosFromYouTube(query, 'relevance');
    } else {
      setFeedTitle('⭐ 인기 급상승 영상');
      fetchVideosFromYouTube('탈모', 'viewCount');
    }
  }, [fetchVideosFromYouTube]);

  const handleStageRecommendation = useCallback(() => {
    const recommendation = stageRecommendations[selectedStage];
    if (recommendation) {
      setFeedTitle(`✅ ${recommendation.title}`);
      fetchVideosFromYouTube(recommendation.query, 'relevance');
    }
  }, [selectedStage, fetchVideosFromYouTube]);

  // 검색 입력 debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // 초기 로드
  useEffect(() => {
    fetchVideosFromYouTube('탈모', 'viewCount');
  }, [fetchVideosFromYouTube]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "#f9f9f9" }}>
      <Header />

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

      <div className="max-w-7xl mx-auto pt-16 relative z-10">
        <main className="px-8 py-12">
          <div className="max-w-4xl mx-auto">
            {/* 로고와 검색 */}
            <section className="min-h-screen flex items-center justify-center px-4">
              <div className="container mx-auto max-w-6xl">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-8">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          📺
                        </div>
                        <h1 className="text-4xl font-bold text-gray-800">MOAMO</h1>
                      </div>
                      <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                        AI 맞춤
                        <br />
                        탈모 콘텐츠
                        <br />
                        추천 서비스
                      </h1>
                      <p className="text-lg text-gray-600 max-w-md">
                        개인맞춤화된 AI 기술로 탈모 단계별 맞춤 영상을 추천받으세요.
                      </p>
                    </div>
                    
                    <div className="max-w-2xl">
                      <div className="relative mb-4">
                        <input
                          type="text"
                          placeholder="'M자 탈모', '여성 탈모' 등 검색..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-6 py-4 text-lg border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="bg-white/70 backdrop-blur rounded-2xl p-8 shadow-lg border border-gray-200">
                      <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">AI 분석 기반 맞춤 영상 추천</h3>
                      <div className="space-y-4">
                        <select
                          value={selectedStage}
                          onChange={(e) => setSelectedStage(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="stage0">0단계 (정상)</option>
                          <option value="stage1">1단계 (초기)</option>
                          <option value="stage2">2단계 (중기)</option>
                          <option value="stage3">3단계 (심화)</option>
                        </select>
                        <button
                          onClick={handleStageRecommendation}
                          className="w-full px-6 py-3 text-white rounded-lg hover:opacity-90 transition-colors font-semibold text-base"
                          style={{ backgroundColor: "rgb(0,115,255)" }}
                        >
                          맞춤 영상 보기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 영상 피드 섹션 */}
            <section className="min-h-screen flex items-center justify-center px-4 bg-white/20">
              <div className="container mx-auto max-w-6xl">
                <div className="bg-white/70 backdrop-blur rounded-2xl p-8 shadow-lg border border-gray-200">
                  <h3 className="text-2xl font-bold mb-8 text-center text-gray-900">{feedTitle}</h3>
                  
                  {loading && (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <p className="mt-4 text-gray-600 text-lg">영상을 불러오는 중입니다...</p>
                    </div>
                  )}

                  {error && (
                    <div className="text-center py-12">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <p className="text-red-600 font-semibold text-lg">API 호출 실패: {error}</p>
                        <p className="text-sm text-gray-500 mt-2">F12를 눌러 Console 탭에서 더 자세한 오류를 확인하세요.</p>
                      </div>
                    </div>
                  )}

                  {!loading && !error && videos.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-600 text-lg">표시할 영상이 없습니다.</p>
                    </div>
                  )}

                  {!loading && !error && videos.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {videos.map((video) => (
                        <a
                          key={video.videoId}
                          href={`https://www.youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block bg-white rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                        >
                          <div className="relative">
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full aspect-video object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://placehold.co/300x168/E8E8E8/424242?text=Image+Error';
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                          </div>
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center">
                                <span className="text-gray-600 text-sm">📺</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors text-sm leading-tight">
                                  {video.title}
                                </h4>
                                <p className="text-xs text-gray-600 mt-2">{video.channelName}</p>
                              </div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

    </div>
  );
}
