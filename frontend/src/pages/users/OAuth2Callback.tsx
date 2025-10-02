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
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        console.log('OAuth2 콜백 처리 시작');
        console.log('전체 URL:', window.location.href);
        console.log('URL 파라미터:', { 
          success, 
          accessToken: accessToken ? '있음' : '없음', 
          refreshToken: refreshToken ? '있음' : '없음', 
          error,
          code: code ? '있음' : '없음',
          state: state ? '있음' : '없음'
        });
        console.log('실제 accessToken 값:', accessToken);
        console.log('실제 refreshToken 값:', refreshToken);
        console.log('실제 code 값:', code);
        
        // code 파라미터가 있으면 구글이 직접 콜백한 것 (임시 처리)
        if (code && !accessToken) {
          console.log('구글에서 직접 콜백됨 - 임시로 프론트엔드에서 처리');
          console.log('Google OAuth2 Code:', code);
          
          // 임시로 성공 메시지 표시
          setStatus('success');
          setErrorMessage('');
          
          // 2초 후 대시보드로 이동
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
          
          return;
        }

        if (success === 'false' || error) {
          setStatus('error');
          setErrorMessage(error || '로그인에 실패했습니다.');
          return;
        }

        if (accessToken && refreshToken) {
          console.log('토큰 확인 완료 - AccessToken과 RefreshToken 모두 존재');
          
          // JWT 토큰에서 사용자 정보 추출 (간단한 방법)
          try {
            const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
            const username = tokenPayload.username;
            
            console.log('JWT 토큰 파싱 성공');
            console.log('토큰 페이로드:', tokenPayload);
            console.log('사용자명:', username);
            
            // 사용자 정보 가져오기
            const userResponse = await apiClient.get(`/userinfo/${username}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            
            console.log('OAuth2 로그인 성공!');
            console.log('사용자 정보:', userResponse.data);
            console.log('토큰:', accessToken);
            
            // Redux에 저장
            dispatch(setUser(userResponse.data));
            dispatch(setToken({
              accessToken: accessToken,
              refreshToken: refreshToken
            }));
            
            // Redux 상태 확인
            console.log('Redux 저장 완료 - 사용자 정보:', userResponse.data);
            console.log('Redux 저장 완료 - 토큰:', accessToken);
            
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
          // 토큰이 없는 경우 - Google OAuth2 인증 정보를 직접 사용
          console.log('토큰이 없음 - Google OAuth2 인증 정보 직접 사용');
          
          try {
            // Google OAuth2 인증 정보에서 사용자 정보 추출
            const state = searchParams.get('state');
            const code = searchParams.get('code');
            const scope = searchParams.get('scope');
            
            console.log('Google OAuth2 파라미터:', { state, code, scope });
            
            if (code) {
              // 백엔드의 OAuth2 토큰 생성 엔드포인트에 직접 요청 (프록시 사용)
              const response = await fetch('/oauth2/token', {
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
