import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Heart, MapPin, Youtube, Package, Building2, ExternalLink, Loader2, Map, X } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useSelector } from 'react-redux';
import { RootState } from '../../utils/store';

interface FavoriteItem {
  id: string;
  type: 'youtube' | 'hospital' | 'product' | 'map';
  title: string;
  description?: string;
  imageUrl?: string;
  link?: string;
  category?: string;
}

export default function MyFavorites() {
  const [likedItems, setLikedItems] = useState<{
    youtube: string[];
    hospital: string[];
    product: string[];
    map: string[];
  }>({
    youtube: [],
    hospital: [],
    product: [],
    map: []
  });
  const [loading, setLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{name: string; category: string} | null>(null);
  const username = useSelector((state: RootState) => state.user.username);

  // 지도보기 함수 - 맵 모달 열기
  const handleMapView = (itemId: string) => {
    // itemId에서 카테고리 추출 (예: "탈모병원-리센트클리닉" → "탈모병원")
    const category = itemId.split('-')[0];
    const name = itemId.substring(category.length + 1);

    // 모달에 전달할 정보 설정
    setSelectedLocation({
      name: name,
      category: category
    });
    setShowMapModal(true);
  };

  // 찜 목록 불러오기
  useEffect(() => {
    const fetchLikedItems = async () => {
      if (!username || username === 'guest') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 모든 찜 목록 병렬로 가져오기
        const [youtubeRes, hospitalRes, productRes, mapRes] = await Promise.all([
          apiClient.get(`/userlog/youtube/likes/${username}`).catch(() => ({ data: '' })),
          apiClient.get(`/userlog/hospital/likes/${username}`).catch(() => ({ data: '' })),
          apiClient.get(`/userlog/product/likes/${username}`).catch(() => ({ data: '' })),
          apiClient.get(`/userlog/map/likes/${username}`).catch(() => ({ data: '' }))
        ]);

        setLikedItems({
          youtube: youtubeRes.data ? youtubeRes.data.split(',').filter((id: string) => id.trim() !== '') : [],
          hospital: hospitalRes.data ? hospitalRes.data.split(',').filter((id: string) => id.trim() !== '') : [],
          product: productRes.data ? productRes.data.split(',').filter((id: string) => id.trim() !== '') : [],
          map: mapRes.data ? mapRes.data.split(',').filter((id: string) => id.trim() !== '') : []
        });
      } catch (error) {
        console.error('찜 목록 불러오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedItems();
  }, [username]);

  // 찜 취소 처리
  const handleUnlike = async (type: keyof typeof likedItems, itemId: string) => {
    try {
      let actualItemId = itemId;
      let productName = '';

      // 제품과 YouTube일 경우 "id:name" 형식에서 분리
      if ((type === 'product' || type === 'youtube') && itemId.includes(':')) {
        const [id, ...nameParts] = itemId.split(':');
        actualItemId = id;
        if (type === 'product') {
          productName = nameParts.join(':');
        }
      }

      const paramName =
        type === 'youtube' ? 'videoId' :
        type === 'hospital' ? 'hospitalId' :
        type === 'product' ? 'productId' : 'mapId';

      const params: any = {
        username,
        [paramName]: actualItemId
      };

      // 제품일 경우 productName, YouTube일 경우 videoTitle도 함께 전달
      if (type === 'product' && productName) {
        params.productName = productName;
      } else if (type === 'youtube' && itemId.includes(':')) {
        const [, ...titleParts] = itemId.split(':');
        params.videoTitle = titleParts.join(':');
      }

      await apiClient.post(`/userlog/${type}/like`, null, { params });

      // 로컬 상태 업데이트
      setLikedItems(prev => ({
        ...prev,
        [type]: prev[type].filter(id => id !== itemId)
      }));
    } catch (error) {
      console.error('찜 취소 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const totalLikes =
    likedItems.youtube.length +
    likedItems.hospital.length +
    likedItems.product.length +
    likedItems.map.length;

  return (
    <div className="space-y-4">
      {/* 찜 목록 헤더 - 리포트와 동일한 스타일 */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-gray-900">찜한 콘텐츠</h3>
        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
          {loading ? "로딩 중..." : `${totalLikes}개`}
        </Badge>
      </div>

      {/* 찜 목록 탭 */}
      <Tabs defaultValue="youtube" className="space-y-4">
        <TabsList className="flex overflow-x-auto space-x-1 pb-2 bg-transparent">
          <TabsTrigger
            value="youtube"
            className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
          >
            <Youtube className="w-3 h-3 mr-1" />
            유튜브 ({likedItems.youtube.length})
          </TabsTrigger>
          <TabsTrigger
            value="hospital"
            className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
          >
            <Building2 className="w-3 h-3 mr-1" />
            탈모병원 ({likedItems.hospital.length})
          </TabsTrigger>
          <TabsTrigger
            value="map"
            className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
          >
            <MapPin className="w-3 h-3 mr-1" />
            탈모미용실/가발전문점/두피문신 ({likedItems.map.length})
          </TabsTrigger>
          <TabsTrigger
            value="product"
            className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
          >
            <Package className="w-3 h-3 mr-1" />
            제품 ({likedItems.product.length})
          </TabsTrigger>
        </TabsList>

        {/* YouTube 찜 목록 */}
        <TabsContent value="youtube" className="space-y-3">
          {likedItems.youtube.length > 0 ? (
            likedItems.youtube.map(videoEntry => {
              // videoId:videoTitle 형식 파싱
              const [videoId, ...titleParts] = videoEntry.split(':');
              const videoTitle = titleParts.join(':') || 'YouTube 영상';

              return (
                <Card key={videoEntry} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                          {videoTitle}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">
                          Video ID: {videoId}
                        </p>
                        <a
                          href={`https://www.youtube.com/watch?v=${videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                          YouTube에서 보기
                        </a>
                      </div>
                      <button
                        onClick={() => handleUnlike('youtube', videoEntry)}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                        title="찜 취소"
                      >
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Youtube className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>찜한 YouTube 영상이 없습니다</p>
            </div>
          )}
        </TabsContent>

        {/* 병원 찜 목록 */}
        <TabsContent value="hospital" className="space-y-3">
          {likedItems.hospital.length > 0 ? (
            likedItems.hospital.map(hospitalId => (
              <Card key={hospitalId} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900 mb-1">
                        {hospitalId.replace('탈모병원-', '')}
                      </h4>
                      <p className="text-xs text-gray-500">
                        탈모병원
                      </p>
                      <button
                        onClick={() => handleMapView(hospitalId)}
                        className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 rounded-md transition-colors"
                      >
                        <Map className="w-3 h-3" />
                        지도보기
                      </button>
                    </div>
                    <button
                      onClick={() => handleUnlike('hospital', hospitalId)}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                      title="찜 취소"
                    >
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>찜한 탈모병원이 없습니다</p>
            </div>
          )}
        </TabsContent>

        {/* 지도 서비스 찜 목록 */}
        <TabsContent value="map" className="space-y-3">
          {likedItems.map.length > 0 ? (
            likedItems.map.map(mapId => (
              <Card key={mapId} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900 mb-1">
                        {mapId.split('-').slice(1).join('-')}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {mapId.split('-')[0]}
                      </p>
                      <button
                        onClick={() => handleMapView(mapId)}
                        className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 rounded-md transition-colors"
                      >
                        <Map className="w-3 h-3" />
                        지도보기
                      </button>
                    </div>
                    <button
                      onClick={() => handleUnlike('map', mapId)}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                      title="찜 취소"
                    >
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>찜한 지도 서비스가 없습니다</p>
            </div>
          )}
        </TabsContent>

        {/* 제품 찜 목록 */}
        <TabsContent value="product" className="space-y-3">
          {likedItems.product.length > 0 ? (
            likedItems.product.map(productEntry => {
              // productId:productName 형식 파싱
              const [productId, ...nameParts] = productEntry.split(':');
              const productName = nameParts.join(':') || '제품명 없음';

              return (
                <Card key={productEntry} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">
                          {productName}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">
                          제품 ID: {productId}
                        </p>
                        <a
                          href={`https://search.11st.co.kr/Search.tmall?kwd=${encodeURIComponent(productName)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                          11번가에서 검색
                        </a>
                      </div>
                      <button
                        onClick={() => handleUnlike('product', productEntry)}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                        title="찜 취소"
                      >
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>찜한 제품이 없습니다</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 지도 모달 */}
      {showMapModal && selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            {/* 모달 헤더 */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedLocation.name}</h3>
                <p className="text-sm text-gray-500">{selectedLocation.category}</p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 버튼 그룹 */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                선택하신 장소를 지도에서 확인하세요
              </p>
              <button
                onClick={() => {
                  window.open(
                    `https://map.kakao.com/link/search/${encodeURIComponent(selectedLocation.name)}`,
                    '_blank'
                  );
                }}
                className="w-full px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-lg transition-colors text-sm"
              >
                카카오맵에서 보기
              </button>
              <button
                onClick={() => {
                  window.open(
                    `https://map.naver.com/v5/search/${encodeURIComponent(selectedLocation.name)}`,
                    '_blank'
                  );
                }}
                className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors text-sm"
              >
                네이버지도에서 보기
              </button>
              <button
                onClick={() => {
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLocation.name)}`,
                    '_blank'
                  );
                }}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm"
              >
                구글맵에서 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}