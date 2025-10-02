import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setToken } from '../../utils/tokenSlice';
import { setUser } from '../../utils/userSlice';
import apiClient from '../../services/apiClient';
import { Button } from '../../components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const OAuth2TokenProxy: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleOAuth2Token = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const scope = searchParams.get('scope');
        
        console.log('OAuth2 토큰 프록시 처리 시작');
        console.log('OAuth2 파라미터:', { code, state, scope });
        
        if (code) {
          // 백엔드의 OAuth2 토큰 생성 엔드포인트에 직접 요청
          const response = await fetch('http://hairfit.duckdns.org:8080/oauth2/token', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: code,
              state: state,
              scope: scope
            })
          });
          
          console.log('백엔드 OAuth2 토큰 생성 응답:', response);
          
          if (response.ok) {
            const tokenData = await response.json();
            console.log('백엔드에서 받은 토큰 데이터:', tokenData);
            
            const { accessToken, refreshToken, user } = tokenData;
            
            if (accessToken && user) {
              console.log('OAuth2 로그인 성공!');
              console.log('사용자 정보:', user);
              console.log('토큰:', accessToken);
              
              // Redux에 저장
              dispatch(setUser(user));
              dispatch(setToken(accessToken));
              
              setStatus('success');
              
              // 2초 후 대시보드로 이동
              setTimeout(() => {
                navigate('/daily-care');
              }, 2000);
            } else {
              setStatus('error');
              setErrorMessage('백엔드에서 사용자 정보를 생성하지 못했습니다.');
            }
          } else {
            setStatus('error');
            setErrorMessage('백엔드 OAuth2 토큰 생성에 실패했습니다.');
          }
        } else {
          setStatus('error');
          setErrorMessage('Google OAuth2 인증 코드를 받지 못했습니다.');
        }
      } catch (backendError) {
        console.error('백엔드 토큰 생성 요청 실패:', backendError);
        setStatus('error');
        setErrorMessage('백엔드와의 통신에 실패했습니다.');
      }
    };

    handleOAuth2Token();
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
            <h2 className="text-xl font-semibold text-gray-800 mb-2">토큰 생성 중...</h2>
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

export default OAuth2TokenProxy;
