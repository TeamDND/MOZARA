import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../utils/store';
import { fetchSeedlingInfo, updateSeedlingNickname, setSeedling } from '../utils/seedlingSlice';
import { hairProductApi, HairProduct } from '../services/hairProductApi';
import apiClient from '../services/apiClient';
import { Button } from '../components/ui/button';
import { Target, Camera, Award, Sprout, MapPin, Video, HelpCircle } from 'lucide-react';
import { locationService, Location } from '../services/locationService';
import MapPreview from '../components/ui/MapPreview';
import LikeButton from '../components/LikeButton';

// YouTube 영상 타입 정의
interface YouTubeVideo {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
}

// 분석 결과 타입 정의
interface HairAnalysisResponse {
  success: boolean;
  analysis?: {
    primary_category: string;
    primary_severity: string;
    average_confidence: number;
    category_distribution: Record<string, number>;
    severity_distribution: Record<string, number>;
    diagnosis_scores: Record<string, number>;
    recommendations: string[];
  };
  similar_cases: Array<{
    id: string;
    score: number;
    metadata: {
      image_id: string;
      image_file_name: string;
      category: string;
      severity: string;
    };
  }>;
  total_similar_cases: number;
  model_info: Record<string, any>;
  preprocessing_used?: boolean;
  preprocessing_info?: {
    enabled: boolean;
    description: string;
  };
  error?: string;
}

// TypeScript: MainPage 페이지 컴포넌트
const MainPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { seedlingId, seedlingName, currentPoint, loading: seedlingLoading, error: seedlingError } = useSelector((state: RootState) => state.seedling);
  const { username, userId, createdAt } = useSelector((state: RootState) => state.user);
  
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // YouTube 영상 관련 상태
  const [todayVideo, setTodayVideo] = useState<YouTubeVideo | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);


  // 다음 액션 결정 함수 (Dashboard에서 가져옴)
  const getNextAction = () => {
    if (!progress.lastPhotoDate) {
      return {
        title: "AI 탈모 분석",
        description: "AI 분석과 설문을 통한 종합적인 두피 상태 파악",
        action: "diagnosis",
        buttonText: "분석하기",
        urgent: true
      };
    }
    
    const daysSincePhoto = progress.lastPhotoDate 
      ? Math.floor((Date.now() - new Date(progress.lastPhotoDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    if (daysSincePhoto >= 7) {
      return {
        title: "주간 변화 기록하기",
        description: "지난주와 비교하여 개선 상황을 확인해보세요",
        action: "tracking",
        buttonText: "변화 기록",
        urgent: false
      };
    }
    
    return {
      title: "이번 주 챌린지 완료하기",
      description: "새싹 포인트를 얻고 레벨업 하세요",
      action: "challenges",
      buttonText: "챌린지 보기",
      urgent: false
    };
  };

  // 사용자 진행 상황 상태 (Dashboard에서 가져옴)
  const [userProgress, setUserProgress] = useState({
    weeksSinceStart: 4,
    currentPoints: 240,
    overallImprovement: 15,
    lastPhotoDate: null as string | null,
    completedChallenges: 8,
    level: 'bronze',
    hasCompletedInitialAnalysis: false // 최초 탈모분석 완료 여부
  });

  const progress = userProgress;
  const nextAction = getNextAction();

  // YouTube 영상 가져오기 함수
  const fetchTodayVideo = useCallback(async () => {
    setVideoLoading(true);
    setVideoError(null);

    try {
      // 탈모 관련 키워드로 YouTube 검색
      const response = await apiClient.get(`/ai/youtube/search?q=${encodeURIComponent('탈모 예방 두피 관리')}&order=viewCount&max_results=1`);
      const data = response.data;

      if (data.items && data.items.length > 0) {
        const video = data.items[0];
        const todayVideoData: YouTubeVideo = {
          videoId: video.id.videoId,
          title: video.snippet.title,
          channelName: video.snippet.channelTitle,
          thumbnailUrl: video.snippet.thumbnails.high.url
        };
        setTodayVideo(todayVideoData);
      } else {
        throw new Error('영상을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('YouTube API Error:', error);
      setVideoError('영상을 불러오는데 실패했습니다.');
      
      // API 실패 시 기본 영상으로 fallback
      const defaultVideo: YouTubeVideo = {
        videoId: '6rWONn6Yo7A',
        title: '탈모 예방을 위한 올바른 두피 관리법',
        channelName: '헤어케어 전문 채널',
        thumbnailUrl: 'https://placehold.co/400x225/1F0101/FFFFFF?text=탈모+예방+두피+관리'
      };
      setTodayVideo(defaultVideo);
    } finally {
      setVideoLoading(false);
    }
  }, []);


  // 위치 정보 가져오기
  React.useEffect(() => {
    const initializeLocation = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              setCurrentLocation(location);
              setLocationError(null);
            },
            (error) => {
              console.error('위치 정보를 가져올 수 없습니다:', error);
              setLocationError('위치 정보를 가져올 수 없습니다.');
            }
          );
        } else {
          setLocationError('이 브라우저는 위치 정보를 지원하지 않습니다.');
        }
      } catch (error) {
        console.error('위치 초기화 오류:', error);
        setLocationError('위치 정보 초기화에 실패했습니다.');
      }
    };

    initializeLocation();
  }, []);

  // 최초 분석 상태 확인 (DB 기반)
  React.useEffect(() => {

    // DB에서 최초 분석 완료 상태 확인
    const checkInitialAnalysis = async () => {
      if (!userId) {
        console.log('사용자 ID가 없습니다.');
        return;
      }

      try {
        console.log('=== 탈모 분석 완료 여부 확인 시작 ===');
        console.log('userId:', userId);
        console.log('API URL:', `/has-analysis/${userId}/hairloss`);
        
        const response = await apiClient.get(`/has-analysis/${userId}/hairloss`);
        console.log('API 응답 전체:', response);
        console.log('API 응답 데이터:', response.data);
        
        const hasAnalysis = response.data.hasAnalysis;
        console.log('탈모 분석 완료 여부:', hasAnalysis);
        console.log('타입:', typeof hasAnalysis);
        
        setUserProgress(prev => ({
          ...prev,
          hasCompletedInitialAnalysis: hasAnalysis
        }));
        
        console.log('=== 상태 업데이트 완료 ===');
      } catch (error: any) {
        console.error('=== 분석 결과 확인 실패 ===');
        console.error('에러 전체:', error);
        console.error('에러 응답:', error.response);
        console.error('에러 메시지:', error.message);
        
        // 에러 시 기본값은 false (최초 분석 안내 표시)
        setUserProgress(prev => ({
          ...prev,
          hasCompletedInitialAnalysis: false
        }));
      }
    };

    checkInitialAnalysis();
    
    // YouTube 영상 로드
    fetchTodayVideo();
  }, [userId, createdAt, fetchTodayVideo]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First 컨테이너 */}
      <div className="max-w-full md:max-w-md mx-auto min-h-screen bg-white flex flex-col">
        
        {/* 메인 컨텐츠 */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* 0. 탈모분석 (최초 기준이고 한번이라도 분석하면 안보임) */}
          {!userProgress.hasCompletedInitialAnalysis && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border-2 border-red-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-red-800">최초 탈모 분석</h3>
                </div>
                <p className="text-sm text-red-700">AI 분석과 설문을 통한 종합적인 두피 상태 파악을 시작해보세요</p>
                <Button 
                  onClick={() => navigate('/integrated-diagnosis')}
                  className="w-full h-12 bg-[#1F0101] hover:bg-[#2A0202] text-white rounded-xl font-semibold active:scale-[0.98] transition-all"
                >
                  지금 분석하기
                </Button>
              </div>
            </div>
          )}


          {/* 3. 탈모 맵 (내 위치기반 지도 화면) */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#1F0101]" />
                <h3 className="text-lg font-semibold text-gray-800">탈모 맵</h3>
              </div>
              <p className="text-sm text-gray-600">내 위치 기반 근처 탈모 관련 장소들을 찾아보세요</p>
              
              {/* 지도 영역 */}
              {currentLocation ? (
                <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ zIndex: 1 }}>
                  <MapPreview
                    latitude={currentLocation.latitude}
                    longitude={currentLocation.longitude}
                    hospitals={[]}
                    userLocation={currentLocation}
                    zoom={13}
                    className="h-48"
                  />
                </div>
              ) : locationError ? (
                <div className="relative bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{locationError}</p>
                  </div>
                </div>
              ) : (
                <div className="relative bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">위치 정보를 가져오는 중...</p>
                  </div>
                </div>
              )}
              
              <Button 
                variant="outline"
                className="w-full h-12 border-2 border-[#1F0101] hover:border-[#2A0202] text-[#1F0101] rounded-xl font-semibold active:scale-[0.98] transition-all"
                onClick={() => navigate('/store-finder')}
              >
                더 알아보기
              </Button>
            </div>
          </div>

          

          {/* 4. 탈모 OX (오늘의 퀴즈) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-5 h-5 text-[#1F0101]" />
              <h3 className="text-lg font-semibold text-gray-800">오늘의 탈모 OX 퀴즈</h3>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <p className="text-sm font-medium text-gray-800 mb-4">
                탈모를 예방하기 위해 매일 샴푸를 하는 것이 좋다.
              </p>
              <div className="flex gap-2">
                <button className="flex-1 h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] font-semibold active:scale-[0.98] transition-all">
                  O
                </button>
                <button className="flex-1 h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] font-semibold active:scale-[0.98] transition-all">
                  X
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">정답 해설을 보려면 버튼을 눌러보세요!</p>
          </div>

          {/* 5. 탈모 영상 (오늘의 영상) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-5 h-5 text-[#1F0101]" />
              <h3 className="text-lg font-semibold text-gray-800">오늘의 탈모 영상</h3>
            </div>
            
            {/* 로딩 상태 */}
            {videoLoading && (
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video mb-3">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent mb-2"></div>
                    <p className="text-sm font-medium">영상을 불러오는 중...</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* 에러 상태 */}
            {videoError && !todayVideo && (
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video mb-3">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-4xl mb-2">⚠️</div>
                    <p className="text-sm font-medium">영상 로드 실패</p>
                    <p className="text-xs opacity-75 mt-1">기본 영상으로 대체됩니다</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* 실제 YouTube 영상 */}
            {todayVideo && !videoLoading && (
              <>
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video mb-3">
                  <a
                    href={`https://www.youtube.com/watch?v=${todayVideo.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <img
                      src={todayVideo.thumbnailUrl}
                      alt={todayVideo.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://placehold.co/400x225/1F0101/FFFFFF?text=탈모+예방+두피+관리';
                      }}
                    />
                    {/* 재생 버튼 오버레이 */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-20 transition-all">
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-all">
                        <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  </a>
                </div>
                
                {/* 영상 정보 */}
                <div className="mb-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1">
                      {todayVideo.title}
                    </h4>
                    <LikeButton
                      type="youtube"
                      itemId={todayVideo.videoId}
                      itemName={todayVideo.title}
                      size="sm"
                    />
                  </div>
                  <p className="text-xs text-gray-600">{todayVideo.channelName}</p>
                </div>
              </>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (todayVideo) {
                    window.open(`https://www.youtube.com/watch?v=${todayVideo.videoId}`, '_blank');
                  }
                }}
                className="flex-1 h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] font-semibold active:scale-[0.98] transition-all"
                disabled={!todayVideo}
              >
                영상 보기
              </Button>
              <Button 
                onClick={fetchTodayVideo}
                className="flex-1 h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] font-semibold active:scale-[0.98] transition-all"
                disabled={videoLoading}
              >
                {videoLoading ? '로딩...' : '다른 영상'}
              </Button>
            </div>
          </div>

          {/* 6. 헤어스타일 바꾸기 */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="text-2xl">💇‍♀️</div>
                <h3 className="text-lg font-semibold text-gray-800">헤어스타일 바꾸기</h3>
              </div>
              <p className="text-sm text-gray-600">새로운 헤어스타일을 시도해보세요</p>
              
              {/* 물음표 그림 영역 */}
              <div className="relative bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-2">❓</div>
                  <p className="text-sm">새로운 스타일을 찾아보세요</p>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate('/hair-change')}
                className="w-full h-12 bg-[#1F0101] hover:bg-[#2A0202] text-white rounded-xl font-semibold active:scale-[0.98] transition-all"
              >
                페이지 이동하기
              </Button>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default MainPage;
