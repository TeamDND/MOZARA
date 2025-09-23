import React, { useState, FormEvent, ChangeEvent } from 'react';
import apiClient from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../utils/userSlice';
import { setToken } from '../../utils/tokenSlice';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { Checkbox } from '../../components/ui/checkbox';
import { ArrowLeft, Sparkles, Lock, User, Phone } from 'lucide-react';

const LogIn: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // UI 상태
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    username: '', // email에서 username으로 변경
    password: '',
    name: '',
    phone: '',
    agreeTerms: false,
    agreePrivacy: false
  });

  // 폼 입력 핸들러
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 폼 제출 핸들러 (로그인/회원가입)
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (isSignup) {
      if (!formData.name || !formData.username || !formData.password || !formData.agreeTerms) {
        setError('필수 정보를 모두 입력해주세요.');
        return;
      }
    } else {
      if (!formData.username || !formData.password) {
        setError('사용자명과 비밀번호를 입력해주세요.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isSignup) {
        // 회원가입 로직 (기존 회원가입 API 사용)
        const signupRes = await apiClient.post('/signup', {
          username: formData.username,
          password: formData.password,
          name: formData.name,
          phone: formData.phone
        });
        
        console.log('회원가입 성공:', signupRes.data);
        alert('회원가입이 완료되었습니다. 로그인해주세요.');
        setIsSignup(false); // 로그인 모드로 전환
      } else {
        // 로그인 로직 (기존 로직 사용)
        const loginRes = await apiClient.post('/login', {
          username: formData.username,
          password: formData.password
        });

        console.log('로그인 성공:', loginRes.data);

        // JWT 토큰 저장
        const token = loginRes.headers['authorization'];
        if (token) {
          const cleanToken = token.replace(/^Bearer\s+/i, '');
          dispatch(setToken(cleanToken));
        }

        // 사용자 정보 가져오기
        const userResponse = await apiClient.get(`/userinfo/${formData.username}`);
        console.log('사용자 정보:', userResponse.data);

        dispatch(setUser(userResponse.data));
        navigate('/dashboard'); // 대시보드로 이동
      }
    } catch (error: any) {
      console.error(isSignup ? '회원가입 오류:' : '로그인 오류:', error);
      const errorMessage = error.response?.data?.error || 
        (isSignup ? '회원가입 중 오류가 발생했습니다.' : '로그인 중 오류가 발생했습니다.');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 소셜 로그인 핸들러
  const handleSocialLogin = (provider: string) => {
    // TODO: 소셜 로그인 API 구현
    console.log(`${provider} 로그인 시도`);
    // 임시로 대시보드로 이동
    navigate('/dashboard');
  };

  // 게스트 로그인 핸들러
  const handleGuestLogin = () => {
    // 게스트 모드로 진단 페이지로 이동
    navigate('/integrated-diagnosis');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="border-b p-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            홈으로
          </Button>
          
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-lg">MOZARA</span>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {isSignup ? '회원가입' : '로그인'}
              </CardTitle>
              <p className="text-muted-foreground">
                {isSignup 
                  ? 'MOZARA와 함께 탈모 개선 여정을 시작하세요' 
                  : 'AI 맞춤 탈모 진단을 받아보세요'
                }
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* 소셜 로그인 */}
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleSocialLogin('google')}
                >
                  <img 
                    src="https://developers.google.com/identity/images/g-logo.png" 
                    alt="Google" 
                    className="w-5 h-5 mr-2"
                  />
                  Google로 {isSignup ? '회원가입' : '로그인'}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400"
                  onClick={() => handleSocialLogin('kakao')}
                >
                  <span className="w-5 h-5 mr-2 bg-black rounded text-white text-xs flex items-center justify-center">
                    K
                  </span>
                  카카오로 {isSignup ? '회원가입' : '로그인'}
                </Button>
              </div>

              <div className="relative">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-background px-2 text-sm text-muted-foreground">
                    또는
                  </span>
                </div>
              </div>

              {/* 이메일 로그인/회원가입 폼 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="홍길동"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">사용자명</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="사용자명을 입력하세요"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">연락처 (선택)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="010-1234-5678"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                {isSignup && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="terms"
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked) => handleInputChange('agreeTerms', checked)}
                      />
                      <Label htmlFor="terms" className="text-sm">
                        <span className="text-red-500">*</span> 이용약관에 동의합니다
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="privacy"
                        checked={formData.agreePrivacy}
                        onCheckedChange={(checked) => handleInputChange('agreePrivacy', checked)}
                      />
                      <Label htmlFor="privacy" className="text-sm">
                        개인정보 처리방침에 동의합니다 (선택)
                      </Label>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full bg-gray-800 hover:bg-gray-700 text-white" disabled={isLoading}>
                  {isLoading 
                    ? (isSignup ? '회원가입 중...' : '로그인 중...') 
                    : (isSignup ? '회원가입하고 진단 시작' : '로그인하고 진단 시작')
                  }
                </Button>
              </form>

              {/* 로그인/회원가입 전환 */}
              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={() => setIsSignup(!isSignup)}
                  className="p-0"
                >
                  {isSignup 
                    ? '이미 계정이 있으신가요? 로그인하기' 
                    : '계정이 없으신가요? 회원가입하기'
                  }
                </Button>
              </div>

              {/* 게스트 로그인 */}
              <div className="relative">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-background px-2 text-sm text-muted-foreground">
                    빠른 체험
                  </span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleGuestLogin}
              >
                회원가입 없이 진단 체험하기
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                * 체험 모드에서는 진단 결과가 저장되지 않습니다
              </p>

              {/* 혜택 안내 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm mb-2">🎁 회원가입 혜택</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 무료 AI 진단 및 개인 맞춤 분석</li>
                  <li>• 지속적인 진행 상황 추적</li>
                  <li>• 주간 챌린지 및 포인트 적립</li>
                  <li>• 미래 헤어스타일 시뮬레이션</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LogIn;
