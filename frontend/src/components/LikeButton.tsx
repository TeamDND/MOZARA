import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import { useSelector } from 'react-redux';
import { RootState } from '../utils/store';

type LikeType = 'youtube' | 'hospital' | 'product' | 'map';

interface LikeButtonProps {
  type: LikeType;
  itemId: string;
  itemName?: string; // 제품 이름 추가 (product type일 때 사용)
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  initialLiked?: boolean;
  onToggle?: (liked: boolean) => void;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  type,
  itemId,
  itemName,
  className = '',
  size = 'md',
  showCount = false,
  initialLiked = false,
  onToggle
}) => {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isLoading, setIsLoading] = useState(false);
  const username = useSelector((state: RootState) => state.user.username);

  // 크기별 스타일
  const sizeStyles = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  // 초기 찜 상태 확인
  useEffect(() => {
    const fetchLikeStatus = async () => {
      if (!username || username === 'guest') return;

      try {
        const response = await apiClient.get(`/userlog/${type}/likes/${username}`);
        const likedItems = response.data ? response.data.split(',').filter((id: string) => id.trim() !== '') : [];

        // 제품의 경우 "productId:productName" 형식이므로 productId만 추출해서 비교
        if (type === 'product') {
          const isLiked = likedItems.some((item: string) => item.startsWith(itemId + ':'));
          setIsLiked(isLiked);
        } else {
          setIsLiked(likedItems.includes(itemId));
        }
      } catch (error) {
        console.error('찜 상태 확인 실패:', error);
      }
    };

    fetchLikeStatus();
  }, [username, type, itemId]);

  // 찜 토글
  const handleToggle = useCallback(async () => {
    if (!username || username === 'guest') {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      const params: any = {
        username: username,
        [`${type === 'youtube' ? 'videoId' : type === 'hospital' ? 'hospitalId' : type === 'product' ? 'productId' : 'mapId'}`]: itemId
      };

      // 제품일 경우 제품 이름도 함께 전달
      if (type === 'product' && itemName) {
        params.productName = itemName;
      }

      const response = await apiClient.post(`/userlog/${type}/like`, null, {
        params
      });

      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);

      if (onToggle) {
        onToggle(newIsLiked);
      }

      console.log(`${type} 찜 ${newIsLiked ? '추가' : '제거'}:`, itemId);
    } catch (error) {
      console.error('찜 토글 실패:', error);
      alert('찜 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [username, type, itemId, itemName, isLiked, isLoading, onToggle]);

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading || !username || username === 'guest'}
      className={`
        ${sizeStyles[size]}
        rounded-full
        flex items-center justify-center
        transition-all duration-200
        ${isLiked
          ? 'bg-red-50 hover:bg-red-100'
          : 'bg-gray-50 hover:bg-gray-100'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        ${className}
      `}
      title={isLiked ? '찜 해제' : '찜하기'}
    >
      <span className={`${size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'}`}>
        {isLiked ? '❤️' : '🤍'}
      </span>
    </button>
  );
};

export default LikeButton;