import React, { useState, FormEvent } from 'react';
import apiClient from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../utils/userSlice';
import { setToken } from '../../utils/tokenSlice';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { Sparkles, Lock, User } from 'lucide-react';

const LogIn: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // UI 상태
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // 폼 데이터
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // 폼 입력 핸들러
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 폼 제출 핸들러 (로그인)
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (!formData.username || !formData.password) {
      setError('사용자명과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // 로그인 로직
      const loginRes = await apiClient.post('/login', {
        username: formData.username,
        password: formData.password
      });

      // JWT 토큰 저장
      const token = loginRes.headers['authorization'];
      if (token) {
        const cleanToken = token.replace(/^Bearer\s+/i, '');
        dispatch(setToken(cleanToken));
      }

      // 사용자 정보 가져오기
      const userResponse = await apiClient.get(`/userinfo/${formData.username}`);

      dispatch(setUser(userResponse.data));


      navigate('/main'); // 대시보드로 이동
    } catch (error: any) {
      console.error('로그인 오류:', error);
      const errorMessage = error.response?.data?.error || '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 소셜 로그인 핸들러
  const handleSocialLogin = (provider: string) => {
    if (provider === 'google') {
      // Google OAuth2 로그인으로 이동
      navigate('/oauth2/authorization/google');
    } else if (provider === 'kakao') {
      // TODO: 카카오 로그인 구현
      navigate('/main-page');
    }
  };

  // 게스트 로그인 핸들러
  const handleGuestLogin = () => {
    // 게스트 모드로 진단 페이지로 이동
    navigate('/integrated-diagnosis');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First 컨테이너 */}
      <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col items-center">
        {/* 모바일 헤더 */}
        <h1 className="text-xl font-semibold text-center py-6">
          로그인
        </h1>

        {/* 메인 컨텐츠 */}
        <div className="w-full max-w-sm mx-auto px-6 space-y-6">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* 일반 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">아이디</Label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="아이디를 입력하세요"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="pl-11 h-12 rounded-xl border-gray-200 focus:border-[#222222] focus:ring-[#222222]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-11 h-12 rounded-xl border-gray-200 focus:border-[#222222] focus:ring-[#222222]"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#1f0101] hover:bg-[#333333] text-white text-base font-semibold rounded-xl shadow-md active:scale-[0.98] transition-all"
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인하고 진단 시작'}
            </Button>
          </form>

          <div className="relative my-6">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-4 text-sm text-gray-500">
                또는
              </span>
            </div>
          </div>

          {/* 소셜 로그인 */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 border-2 border-gray-200 hover:bg-gray-50 rounded-xl active:scale-[0.98] transition-all"
              onClick={() => handleSocialLogin('google')}
            >
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google"
                className="w-5 h-5 mr-3"
              />
              <span className="text-gray-700 font-medium">Google로 계속하기</span>
            </Button>

            {/* <Button
              variant="outline"
              className="w-full h-12 bg-[#FEE500] hover:bg-[#FDD800] border-[#FEE500] rounded-xl active:scale-[0.98] transition-all"
              onClick={() => handleSocialLogin('kakao')}
            >
              <span className="w-5 h-5 mr-3 bg-black rounded-sm text-white text-xs flex items-center justify-center">
                K
              </span>
              <span className="text-gray-900 font-medium">카카오로 계속하기</span>
            </Button> */}
          </div>

          {/* 회원가입 링크 */}
          <div className="text-center mt-6">
            <Button
              variant="link"
              onClick={() => navigate('/signup')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              계정이 없으신가요? 회원가입하기
            </Button>
          </div>

          {/* 게스트 로그인 */}
          <div className="relative mt-6">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-4 text-sm text-gray-500">
                빠른 체험
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 mt-6 border-2 border-gray-200 hover:bg-gray-50 rounded-xl active:scale-[0.98] transition-all"
            onClick={handleGuestLogin}
          >
            <Sparkles className="w-5 h-5 mr-2 text-[#222222]" />
            회원가입 없이 분석 체험하기
          </Button>

          <p className="text-xs text-gray-500 text-center mt-2">
            * 체험 모드에서는 분석 결과가 저장되지 않습니다
          </p>

        </div>
      </div>
    </div>
  );
}

export default LogIn;
