import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setToken } from '../../utils/tokenSlice';
import { setUser } from '../../utils/userSlice';
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
        
        // code 파라미터가 있으면 구글 OAuth2 콜백이므로 처리하지 않음
        // 올바른 OAuth2 플로우는 /oauth2/success에서 처리됨
        if (code) {
          console.log('구글 OAuth2 콜백 파라미터 감지됨');
          console.log('이 컴포넌트는 사용하지 않는 엔드포인트입니다.');
          console.log('올바른 OAuth2 플로우를 사용해주세요.');
          
          setStatus('error');
          setErrorMessage('잘못된 OAuth2 플로우입니다. 구글 로그인 버튼을 사용해주세요.');
          return;
        }
        
        // access_token과 refresh_token이 URL에 있는 경우 (올바른 플로우)
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const success = searchParams.get('success');
        
        console.log('URL 파라미터 확인:', { accessToken, refreshToken, success });
        
        if (accessToken && refreshToken && success === 'true') {
          console.log('올바른 OAuth2 성공 플로우 감지됨');
          
          try {
            // JWT 토큰 저장
            console.log('JWT 토큰 저장 중...');
            
            dispatch(setToken({
              accessToken: accessToken,
              refreshToken: refreshToken
            }));
            
            console.log('토큰 저장 완료, 사용자 정보 조회 시작...');
            
            // 사용자 정보 조회 API 호출
            const userResponse = await apiClient.get('/user/info');
            console.log('사용자 정보 조회 응답:', userResponse.data);
            
            if (userResponse.data) {
              dispatch(setUser(userResponse.data));
              console.log('사용자 정보 저장 완료:', userResponse.data);
              
              setStatus('success');
              setTimeout(() => {
                navigate('/dashboard');
              }, 2000);
            } else {
              throw new Error('사용자 정보를 가져올 수 없습니다.');
            }
            
          } catch (userError) {
            console.error('사용자 정보 조회 실패:', userError);
            setStatus('error');
            setErrorMessage('사용자 정보를 가져오는데 실패했습니다.');
            return;
          }
        } else if (success === 'false') {
          console.log('OAuth2 로그인 실패');
          setStatus('error');
          setErrorMessage('구글 로그인에 실패했습니다.');
        } else {
          console.log('OAuth2 파라미터가 없음 - 대기 중...');
          // 파라미터가 없으면 로딩 상태 유지
        }
      } catch (error) {
        console.error('OAuth2 처리 중 오류 발생:', error);
        setStatus('error');
        setErrorMessage('OAuth2 처리 중 오류가 발생했습니다.');
      }
    };

    handleOAuth2Token();
  }, [searchParams, dispatch, navigate]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                OAuth2 처리 중...
              </h2>
              <p className="mt-2 text-gray-600">
                구글 로그인 정보를 처리하고 있습니다.
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                로그인 성공!
              </h2>
              <p className="mt-2 text-gray-600">
                구글 로그인이 성공적으로 완료되었습니다.
              </p>
              <Button 
                onClick={handleGoToDashboard}
                className="mt-4 w-full"
              >
                대시보드로 이동
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-red-600" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                로그인 실패
              </h2>
              <p className="mt-2 text-gray-600">
                {errorMessage || '로그인 처리 중 오류가 발생했습니다.'}
              </p>
              <Button 
                onClick={handleGoToLogin}
                className="mt-4 w-full"
              >
                로그인 페이지로 이동
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuth2TokenProxy;