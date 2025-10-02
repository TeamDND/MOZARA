import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OAuth2Proxy: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('=== OAuth2Proxy 컴포넌트 렌더링됨 ===');
    console.log('백엔드 OAuth2 엔드포인트로 리다이렉트 시작');
    // 백엔드 OAuth2 엔드포인트로 리다이렉트
    window.location.href = 'http://hairfit.duckdns.org:8080/oauth2/authorization/google';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Google 로그인으로 이동 중...</p>
      </div>
    </div>
  );
};

export default OAuth2Proxy;
