import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/apiClient';
import { useSelector } from 'react-redux';
import { RootState } from '../../utils/store';
import LikeButton from '../../components/LikeButton';

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
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  
  // Redux에서 현재 로그인된 사용자 정보 가져오기
  const username = useSelector((state: RootState) => state.user.username) || 'testuser';

  const fetchVideosFromYouTube = useCallback(async (query: string, order: string = 'viewCount') => {
    setLoading(true);
    setError(null);

    try {
      // Spring Boot를 통해 YouTube 데이터 가져오기
      const response = await apiClient.get(`/ai/youtube/search?q=${encodeURIComponent(query)}&order=${order}&max_results=12`);
      const data = response.data;

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
      console.log('더미 데이터로 대체합니다.');
      
      // YouTube API 오류 시 더미 데이터 사용 (메인 컬러 #1F0101과 어울리는 색상)
      const dummyVideos: Video[] = [
        {
          videoId: 'dummy1',
          title: '탈모 예방을 위한 올바른 샴푸 사용법',
          channelName: '헤어케어 채널',
          thumbnailUrl: 'https://placehold.co/300x168/5B1010/FFFFFF?text=탈모+예방+샴푸'
        },
        {
          videoId: 'dummy2',
          title: '모발이식 수술 후 관리 방법',
          channelName: '의료 정보 채널',
          thumbnailUrl: 'https://placehold.co/300x168/7F1D1D/FFFFFF?text=모발이식+관리'
        },
        {
          videoId: 'dummy3',
          title: '탈모 원인과 치료법 완벽 가이드',
          channelName: '건강 정보 채널',
          thumbnailUrl: 'https://placehold.co/300x168/991B1B/FFFFFF?text=탈모+원인+치료'
        },
        {
          videoId: 'dummy4',
          title: '두피 마사지로 탈모 예방하기',
          channelName: '뷰티 케어 채널',
          thumbnailUrl: 'https://placehold.co/300x168/450A0A/FFFFFF?text=두피+마사지'
        },
        {
          videoId: 'dummy5',
          title: '영양제로 탈모 개선하기',
          channelName: '건강 관리 채널',
          thumbnailUrl: 'https://placehold.co/300x168/6B1515/FFFFFF?text=영양제+탈모개선'
        },
        {
          videoId: 'dummy6',
          title: '탈모 전문의가 알려주는 진실',
          channelName: '의료 전문 채널',
          thumbnailUrl: 'https://placehold.co/300x168/8B1F1F/FFFFFF?text=탈모+전문의+진실'
        }
      ];
      
      setVideos(dummyVideos);
      setError('YouTube API 할당량 초과로 인해 샘플 데이터를 표시합니다.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  // 찜 토글 기능
  const toggleLike = useCallback(async (videoId: string) => {
    if (username === 'guest') {
      alert('로그인이 필요한 기능입니다.');
      return;
    }
    
    try {
      console.log('찜 토글 요청:', { username, videoId });
      const response = await apiClient.post('/userlog/youtube/like', null, {
        params: {
          username: username,
          videoId: videoId
        }
      });
      console.log('찜 토글 응답:', response.data);
      
      setLikedVideos(prev => {
        const newSet = new Set(prev);
        if (newSet.has(videoId)) {
          newSet.delete(videoId);
          console.log('찜 취소:', videoId);
        } else {
          newSet.add(videoId);
          console.log('찜 추가:', videoId);
        }
        return newSet;
      });
    } catch (error) {
      console.error('찜 토글 실패:', error);
    }
  }, [username]);

  // 사용자의 찜한 영상 목록 불러오기
  const fetchLikedVideos = useCallback(async () => {
    if (username === 'guest') {
      return; // 게스트 사용자는 찜한 영상 목록을 불러오지 않음
    }
    
    try {
      const response = await apiClient.get(`/userlog/youtube/likes/${username}`);
      console.log('찜한 영상 응답:', response.data);
      const likedVideoIds = response.data ? response.data.split(',').filter((id: string) => id.trim() !== '') : [];
      console.log('찜한 영상 ID 목록:', likedVideoIds);
      setLikedVideos(new Set(likedVideoIds));
    } catch (error) {
      console.error('찜한 영상 목록 불러오기 실패:', error);
    }
  }, [username]);

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
    fetchLikedVideos();
  }, [fetchVideosFromYouTube, fetchLikedVideos]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Container - PC에서도 모바일 레이아웃 중앙 정렬 */}
      <div className="max-w-md mx-auto min-h-screen bg-white">
        {/* Main Content */}
        <main className="px-4 py-6">
          {/* 페이지 헤더 */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">YouTube 영상</h2>
            <p className="text-sm text-gray-600">탈모 단계별 맞춤 영상 추천</p>
          </div>

          {/* 검색 입력 */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="'M자 탈모', '여성 탈모' 등 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#222222] focus:border-transparent text-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 단계별 추천 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">AI 분석 기반 맞춤 추천</h3>
            <div className="space-y-2">
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#222222] focus:border-transparent bg-white text-gray-700 text-sm"
              >
                <option value="stage0">0단계 (정상) - 예방 및 두피 관리</option>
                <option value="stage1">1단계 (초기) - 초기 증상 및 관리법</option>
                <option value="stage2">2단계 (중기) - 약물 치료 및 전문 관리</option>
                <option value="stage3">3단계 (심화) - 모발이식 및 시술 정보</option>
              </select>
              <button
                onClick={handleStageRecommendation}
                className="w-full bg-[#222222] text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-800 transition-all active:scale-[0.98]"
              >
                맞춤 영상 보기
              </button>
            </div>
          </div>

          {/* 피드 타이틀 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">{feedTitle}</h3>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-yellow-500 text-xl flex-shrink-0">ℹ️</span>
                <div>
                  <p className="text-sm text-yellow-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 로딩 상태 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#222222] border-t-transparent mb-4"></div>
              <p className="text-sm text-gray-600">영상을 불러오는 중입니다...</p>
            </div>
          )}

          {/* 영상 없음 */}
          {!loading && !error && videos.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📺</div>
              <p className="text-sm text-gray-600">표시할 영상이 없습니다.</p>
            </div>
          )}

          {/* 영상 그리드 */}
          {!loading && videos.length > 0 && (
            <div className="space-y-3">
              {videos
                .sort((a, b) => {
                  const aIsLiked = likedVideos.has(a.videoId);
                  const bIsLiked = likedVideos.has(b.videoId);
                  if (aIsLiked && !bIsLiked) return -1;
                  if (!aIsLiked && bIsLiked) return 1;
                  return 0;
                })
                .map((video) => (
                  <div
                    key={video.videoId}
                    className="bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all overflow-hidden"
                  >
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="relative">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full aspect-video object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://placehold.co/400x225/E8E8E8/424242?text=Image+Error';
                          }}
                        />
                        {/* 찜 버튼 */}
                        <div
                          className="absolute top-2 right-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <LikeButton
                            type="youtube"
                            itemId={video.videoId}
                            size="sm"
                            className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-white"
                          />
                        </div>
                        {/* 찜한 영상 배지 */}
                        {likedVideos.has(video.videoId) && (
                          <div className="absolute top-2 left-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] leading-none text-white bg-red-500/90 rounded-full">
                              ❤️ 찜
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-tight mb-2">
                          {video.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs">📺</span>
                          </div>
                          <p className="text-xs text-gray-600 truncate">{video.channelName}</p>
                        </div>
                      </div>
                    </a>
                  </div>
                ))}
            </div>
          )}

          {/* Bottom Spacing for Mobile Navigation */}
          <div className="h-20"></div>
        </main>
      </div>
    </div>
  );
}
