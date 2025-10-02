import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setToken } from '../../utils/tokenSlice';
import { setUser } from '../../utils/userSlice';
import { RootState } from '../../utils/store';
import apiClient from '../../services/apiClient';
import { Button } from '../../components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const OAuth2TokenProxy: React.FC = () => {
  console.log('=== OAuth2TokenProxy 컴포넌트 시작 ===');
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Redux 상태 확인
  const user = useSelector((state: RootState) => state.user);
  const token = useSelector((state: RootState) => state.token);
  
  console.log('OAuth2TokenProxy 컴포넌트 초기화 완료');
  console.log('현재 경로:', window.location.pathname);
  console.log('경로 매칭 확인: /login/oauth2/code/google');

  useEffect(() => {
    console.log('=== OAuth2TokenProxy 컴포넌트 렌더링됨 ===');
    console.log('현재 URL:', window.location.href);
    console.log('searchParams:', searchParams.toString());
    
    const handleOAuth2Token = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const scope = searchParams.get('scope');
        
        console.log('OAuth2 토큰 프록시 처리 시작');
        console.log('OAuth2 파라미터:', { code, state, scope });
        
        if (code) {
          console.log('백엔드 OAuth2 토큰 생성 요청 시작...');
          
          // 백엔드의 OAuth2 토큰 생성 엔드포인트에 직접 요청 (apiClient 사용)
          const response = await apiClient.post('/oauth2/token', {
            code: code,
            state: state,
            scope: scope
          });
          
          console.log('백엔드 OAuth2 토큰 생성 응답:', response);
          console.log('응답 상태:', response.status);
          console.log('응답 헤더:', response.headers);
          console.log('백엔드에서 받은 토큰 데이터:', response.data);
          
          const { accessToken, refreshToken, user } = response.data;
            
            if (accessToken && user) {
              console.log('OAuth2 로그인 성공!');
              console.log('사용자 정보:', user);
              console.log('토큰:', accessToken);
              
              // Redux에 저장
              dispatch(setUser(user));
              dispatch(setToken(accessToken));
              
              // Redux 저장 후 상태 확인
              console.log('Redux 저장 완료 - 사용자 정보:', user);
              console.log('Redux 저장 완료 - 토큰:', accessToken);
              
              // Redux store에서 실제 저장된 값 확인
              setTimeout(() => {
                console.log('=== Redux Store 상태 확인 ===');
                console.log('저장된 사용자 정보:', user);
                console.log('저장된 토큰:', token);
                console.log('사용자 ID:', user.userId);
                console.log('토큰 존재 여부:', token ? '있음' : '없음');
              }, 100);
              
              setStatus('success');
              
              // 즉시 대시보드로 이동 (2초 대기 제거)
              console.log('대시보드로 이동 중...');
              navigate('/daily-care');
            } else {
              setStatus('error');
              setErrorMessage('백엔드에서 사용자 정보를 생성하지 못했습니다.');
            }
        } else {
          console.log('Google OAuth2 인증 코드가 없음');
          setStatus('error');
          setErrorMessage('Google OAuth2 인증 코드를 받지 못했습니다.');
        }
      } catch (backendError) {
        console.error('백엔드 토큰 생성 요청 실패:', backendError);
        console.error('에러 상세:', backendError);
        setStatus('error');
        const errorMessage = backendError instanceof Error ? backendError.message : '알 수 없는 오류';
        setErrorMessage('백엔드와의 통신에 실패했습니다. 에러: ' + errorMessage);
      }
    };

    handleOAuth2Token();
  }, [searchParams, dispatch, navigate]);

  const handleRetry = () => {
    console.log('다시 시도 버튼 클릭 - 현재 URL:', window.location.href);
    // 현재 페이지 새로고침하여 다시 시도
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoToLogin = () => {
    navigate('/login');
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
                onClick={handleGoToLogin}
                variant="outline"
                className="w-full"
              >
                로그인 페이지로
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
