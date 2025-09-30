import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setToken } from '../../utils/tokenSlice';
import { setUser } from '../../utils/userSlice';
import apiClient from '../../services/apiClient';
import { Button } from '../../components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const OAuth2Callback: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleOAuth2Callback = async () => {
      try {
        const success = searchParams.get('success');
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const error = searchParams.get('error');

        if (success === 'false' || error) {
          setStatus('error');
          setErrorMessage(error || '로그인에 실패했습니다.');
          return;
        }

        if (accessToken && refreshToken) {
          // 토큰 저장
          dispatch(setToken(accessToken));
          
          // JWT 토큰에서 사용자 정보 추출 (간단한 방법)
          try {
            const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
            const username = tokenPayload.username;
            
            // 사용자 정보 가져오기
            const userResponse = await apiClient.get(`/userinfo/${username}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            
            dispatch(setUser(userResponse.data));
            setStatus('success');
            
            // 2초 후 대시보드로 이동
            setTimeout(() => {
              navigate('/daily-care');
            }, 2000);
          } catch (userError) {
            console.error('사용자 정보 가져오기 실패:', userError);
            setStatus('error');
            setErrorMessage('사용자 정보를 가져오는데 실패했습니다.');
          }
        } else {
          setStatus('error');
          setErrorMessage('인증 토큰을 받지 못했습니다.');
        }
      } catch (error) {
        console.error('OAuth2 콜백 처리 오류:', error);
        setStatus('error');
        setErrorMessage('로그인 처리 중 오류가 발생했습니다.');
      }
    };

    handleOAuth2Callback();
  }, [searchParams, dispatch, navigate]);

  const handleRetry = () => {
    navigate('/login');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">로그인 처리 중...</h2>
            <p className="text-gray-600">잠시만 기다려주세요.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">로그인 성공!</h2>
            <p className="text-gray-600 mb-4">잠시 후 대시보드로 이동합니다.</p>
            <Button
              onClick={() => navigate('/daily-care')}
              className="w-full bg-[#222222] hover:bg-[#333333] text-white"
            >
              바로 이동하기
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">로그인 실패</h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <div className="space-y-2">
              <Button
                onClick={handleRetry}
                className="w-full bg-[#222222] hover:bg-[#333333] text-white"
              >
                다시 시도하기
              </Button>
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="w-full"
              >
                홈으로 이동
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuth2Callback;
