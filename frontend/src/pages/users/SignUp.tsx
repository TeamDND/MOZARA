import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { emailAuthService } from '../../services/emailAuthService';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

import { ArrowLeft, Sparkles, Lock, User, Mail, Clock, CheckCircle } from 'lucide-react';

interface SignUpFormData {
  username: string;
  password: string;
  passwordCheck: string;
  email: string;
  nickname: string;
}

interface ValidationErrors {
  username?: string;
  password?: string;
  passwordCheck?: string;
  email?: string;
  nickname?: string;
  authCode?: string;
}

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState<SignUpFormData>({
    username: '',
    password: '',
    passwordCheck: '',
    email: '',
    nickname: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordCheck, setShowPasswordCheck] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [nicknameChecked, setNicknameChecked] = useState(false);
  
  // 이메일 인증 관련 상태
  const [authCode, setAuthCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailAuthLoading, setEmailAuthLoading] = useState(false);
  const [authCodeSent, setAuthCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 입력값 변경 핸들러
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 입력값 변경 시 해당 필드의 에러와 중복 확인 상태 초기화
    if (name === 'username') {
      setUsernameChecked(false);
      setErrors(prev => ({ ...prev, username: undefined }));
    } else if (name === 'nickname') {
      setNicknameChecked(false);
      setErrors(prev => ({ ...prev, nickname: undefined }));
    } else {
      setErrors(prev => ({ ...prev, [name]: undefined }));
      
    }
  };

  // 아이디 유효성 검사
  const validateUsername = (username: string): string | undefined => {
    if (!username) return '아이디를 입력해주세요.';
    if (username.length < 6 || username.length > 18) {
      return '아이디는 6-18자 사이여야 합니다.';
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return '아이디는 영문, 숫자만 사용 가능합니다.';
    }
    return undefined;
  };

  // 비밀번호 유효성 검사
  const validatePassword = (password: string): string | undefined => {
    if (!password) return '비밀번호를 입력해주세요.';
    if (password.length < 8) {
      return '비밀번호는 8자 이상이어야 합니다.';
    }
    return undefined;
  };

  // 이메일 유효성 검사
  const validateEmail = (email: string): string | undefined => {
    if (!email) return '이메일을 입력해주세요.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return '올바른 이메일 형식을 입력해주세요.';
    }
    return undefined;
  };

  // 닉네임 유효성 검사
  const validateNickname = (nickname: string): string | undefined => {
    if (!nickname) return '닉네임을 입력해주세요.';
    if (nickname.includes(' ')) {
      return '닉네임에는 공백을 사용할 수 없습니다.';
    }
    if (/[^가-힣a-zA-Z0-9]/.test(nickname)) {
      return '닉네임에는 특수문자를 사용할 수 없습니다.';
    }
    const koreanCount = (nickname.match(/[가-힣]/g) || []).length;
    const englishCount = (nickname.match(/[a-zA-Z]/g) || []).length;
    if (koreanCount > 8 || englishCount > 14) {
      return '한글 8자, 영문 14자까지 입력 가능합니다.';
    }
    return undefined;
  };

  // 아이디 중복 확인
  const checkUsername = async () => {
    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      setErrors(prev => ({ ...prev, username: usernameError }));
      return;
    }

    try {
      const response = await apiClient.get(`/check-username/${formData.username}`);
      const { available } = response.data;
      if (available) {
        setUsernameChecked(true);
        setErrors(prev => ({ ...prev, username: undefined }));
      } else {
        setErrors(prev => ({ ...prev, username: '이미 사용 중인 아이디입니다.' }));
      }
    } catch (error) {
      console.error('아이디 중복 확인 오류:', error);
      setErrors(prev => ({ ...prev, username: '아이디 확인 중 오류가 발생했습니다.' }));
    }
  };

  // 닉네임 중복 확인
  const checkNickname = async () => {
    const nicknameError = validateNickname(formData.nickname);
    if (nicknameError) {
      setErrors(prev => ({ ...prev, nickname: nicknameError }));
      return;
    }

    try {
      const response = await apiClient.get(`/check-nickname/${formData.nickname}`);
      const { available } = response.data;
      if (available) {
        setNicknameChecked(true);
        setErrors(prev => ({ ...prev, nickname: undefined }));
      } else {
        setErrors(prev => ({ ...prev, nickname: '이미 사용 중인 닉네임입니다.' }));
      }
    } catch (error) {
      console.error('닉네임 중복 확인 오류:', error);
      setErrors(prev => ({ ...prev, nickname: '닉네임 확인 중 오류가 발생했습니다.' }));
    }
  };

  // 이메일 인증코드 발송
  const sendAuthCode = async () => {
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setErrors(prev => ({ ...prev, email: emailError }));
      return;
    }

    setEmailAuthLoading(true);
    try {
      const response = await emailAuthService.sendAuthCode(formData.email);
      if (response.success) {
        setAuthCodeSent(true);
        setCountdown(300); // 5분 = 300초
        setResendCooldown(60); // 1분 = 60초
        alert('인증코드가 발송되었습니다.');
      } else {
        alert(response.message);
        if (response.remainingTime) {
          setResendCooldown(response.remainingTime);
        }
      }
    } catch (error: any) {
      console.error('인증코드 발송 오류:', error);
      const errorMessage = error.response?.data?.message || error.message || '인증코드 발송 중 오류가 발생했습니다.';
      alert(`인증코드 발송 실패: ${errorMessage}`);
    } finally {
      setEmailAuthLoading(false);
    }
  };

  // 인증코드 검증
  const verifyAuthCode = async () => {
    if (!authCode) {
      setErrors(prev => ({ ...prev, authCode: '인증코드를 입력해주세요.' }));
      return;
    }

    setEmailAuthLoading(true);
    try {
      const response = await emailAuthService.verifyAuthCode(formData.email, authCode);
      if (response.success) {
        setEmailVerified(true);
        setErrors(prev => ({ ...prev, authCode: undefined }));
        alert('이메일 인증이 완료되었습니다.');
      } else {
        setErrors(prev => ({ ...prev, authCode: response.message }));
      }
    } catch (error) {
      console.error('인증코드 검증 오류:', error);
      setErrors(prev => ({ ...prev, authCode: '인증코드 검증 중 오류가 발생했습니다.' }));
    } finally {
      setEmailAuthLoading(false);
    }
  };

  // 카운트다운 타이머
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 재발송 쿨다운 타이머
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // 폼 제출 핸들러
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 모든 필드 유효성 검사
    const newErrors: ValidationErrors = {};
    
    const usernameError = validateUsername(formData.username);
    if (usernameError) newErrors.username = usernameError;
    else if (!usernameChecked) newErrors.username = '아이디 중복 확인을 해주세요.';
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    if (!formData.passwordCheck) {
      newErrors.passwordCheck = '비밀번호 확인을 입력해주세요.';
    } else if (formData.password !== formData.passwordCheck) {
      newErrors.passwordCheck = '비밀번호가 일치하지 않습니다.';
    }
    
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    else if (!emailVerified) newErrors.email = '이메일 인증을 완료해주세요.';
    
    const nicknameError = validateNickname(formData.nickname);
    if (nicknameError) newErrors.nickname = nicknameError;
    else if (!nicknameChecked) newErrors.nickname = '닉네임 중복 확인을 해주세요.';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiClient.post('/signup', {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        nickname: formData.nickname
      });
      
      alert('회원가입이 완료되었습니다!');
      navigate('/login');
    } catch (error: any) {
      console.error('회원가입 오류:', error);
      const errorMessage = error.response?.data?.error || '회원가입 중 오류가 발생했습니다.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First 컨테이너 */}
      <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col items-center">
        {/* 모바일 헤더 */}
        <div className="flex items-center justify-center w-full p-4 border-b border-gray-100">
          <h1 className="text-lg font-semibold">회원가입</h1>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="w-full max-w-sm mx-auto px-6 py-6 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* 아이디 */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                아이디 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="6-18자 영문, 숫자만"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`pl-11 h-12 rounded-xl ${
                      errors.username ? 'border-red-500' : 'border-gray-200'
                    } focus:border-blue-500 focus:ring-blue-500`}
                  />
                </div>
                <Button
                  type="button"
                  onClick={checkUsername}
                  disabled={!formData.username || usernameChecked}
                  className={`min-w-[90px] h-12 rounded-xl ${
                    usernameChecked 
                      ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-50' 
                      : !formData.username || usernameChecked
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1f0101] text-white hover:bg-[#2a0202]'
                  } active:scale-[0.98] transition-all`}
                >
                  {usernameChecked ? '✓ 확인됨' : '중복확인'}
                </Button>
              </div>
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                비밀번호 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="8자 이상"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`pl-11 h-12 rounded-xl ${
                    errors.password ? 'border-red-500' : 'border-gray-200'
                  } focus:border-blue-500 focus:ring-blue-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3.5 3.5m6.378 6.378L21.5 21.5" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div className="space-y-2">
              <Label htmlFor="passwordCheck" className="text-sm font-medium text-gray-700">
                비밀번호 확인 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  id="passwordCheck"
                  name="passwordCheck"
                  type={showPasswordCheck ? "text" : "password"}
                  placeholder="비밀번호를 다시 입력하세요"
                  value={formData.passwordCheck}
                  onChange={handleInputChange}
                  className={`pl-11 h-12 rounded-xl ${
                    errors.passwordCheck ? 'border-red-500' : 'border-gray-200'
                  } focus:border-blue-500 focus:ring-blue-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordCheck(!showPasswordCheck)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPasswordCheck ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3.5 3.5m6.378 6.378L21.5 21.5" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.passwordCheck && (
                <p className="text-sm text-red-600">{errors.passwordCheck}</p>
              )}
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                이메일 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`pl-11 h-12 rounded-xl ${
                      errors.email ? 'border-red-500' : 'border-gray-200'
                    } focus:border-blue-500 focus:ring-blue-500`}
                  />
                </div>
                <Button
                  type="button"
                  onClick={sendAuthCode}
                  disabled={!formData.email || emailAuthLoading || resendCooldown > 0}
                  className={`min-w-[90px] h-12 rounded-xl ${
                    emailVerified 
                      ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-50' 
                      : !formData.email || emailAuthLoading || resendCooldown > 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1f0101] text-white hover:bg-[#2a0202]'
                  } active:scale-[0.98] transition-all`}
                >
                  {emailVerified ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : emailAuthLoading ? (
                    '발송중...'
                  ) : resendCooldown > 0 ? (
                    `${resendCooldown}초`
                  ) : (
                    '인증발송'
                  )}
                </Button>
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* 이메일 인증코드 */}
            {authCodeSent && !emailVerified && (
              <div className="space-y-2">
                <Label htmlFor="authCode" className="text-sm font-medium text-gray-700">
                  인증코드 <span className="text-red-500">*</span>
                  {countdown > 0 && (
                    <span className="ml-2 text-xs text-orange-600">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="authCode"
                      type="text"
                      placeholder="6자리 인증코드"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      maxLength={6}
                      className={`h-12 rounded-xl ${
                        errors.authCode ? 'border-red-500' : 'border-gray-200'
                      } focus:border-blue-500 focus:ring-blue-500`}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={verifyAuthCode}
                    disabled={!authCode || emailAuthLoading || countdown === 0}
                    className={`min-w-[90px] h-12 rounded-xl ${
                      !authCode || emailAuthLoading || countdown === 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } active:scale-[0.98] transition-all`}
                  >
                    {emailAuthLoading ? '확인중...' : '인증확인'}
                  </Button>
                </div>
                {errors.authCode && (
                  <p className="text-sm text-red-600">{errors.authCode}</p>
                )}
                {countdown === 0 && authCodeSent && !emailVerified && (
                  <p className="text-sm text-red-600">인증코드가 만료되었습니다. 다시 발송해주세요.</p>
                )}
              </div>
            )}


            {/* 닉네임 */}
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-sm font-medium text-gray-700">
                닉네임 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <Input
                    id="nickname"
                    name="nickname"
                    type="text"
                    placeholder="한글 8자, 영문 14자까지"
                    value={formData.nickname}
                    onChange={handleInputChange}
                    className={`pl-11 h-12 rounded-xl ${
                      errors.nickname ? 'border-red-500' : 'border-gray-200'
                    } focus:border-blue-500 focus:ring-blue-500`}
                  />
                </div>
                <Button
                  type="button"
                  onClick={checkNickname}
                  disabled={!formData.nickname || nicknameChecked}
                  className={`min-w-[90px] h-12 rounded-xl ${
                    nicknameChecked 
                      ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-50' 
                      : !formData.nickname || nicknameChecked
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1f0101] text-white hover:bg-[#2a0202]'
                  } active:scale-[0.98] transition-all`}
                >
                  {nicknameChecked ? '✓ 확인됨' : '중복확인'}
                </Button>
              </div>
              {errors.nickname && (
                <p className="text-sm text-red-600">{errors.nickname}</p>
              )}
            </div>


            {/* 회원가입 버튼 */}
            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full h-12 text-white text-base font-semibold rounded-xl shadow-md active:scale-[0.98] transition-all ${
                isLoading 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-[#1f0101] hover:bg-[#2a0202]'
              }`}
            >
              {isLoading ? '회원가입 중...' : '회원가입하고 진단 시작'}
            </Button>

            {/* 로그인 링크 */}
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/login')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                이미 계정이 있으신가요? 로그인하기
              </Button>
            </div>
          </form>

          
        </div>
      </div>
    </div>
  );
};

export default SignUp;