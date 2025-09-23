import React, { useState, FormEvent, ChangeEvent } from 'react';
import apiClient from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../utils/userSlice';
import { setToken } from '../../utils/tokenSlice';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { Checkbox } from '../../components/ui/checkbox';
import { ArrowLeft, Sparkles, Lock, User, Phone, Mail, MapPin } from 'lucide-react';

interface SignUpFormData {
  username: string;
  password: string;
  passwordCheck: string;
  email: string;
  address: string;
  gender: '남' | '여';
  nickname: string;
  age: string;
}

interface ValidationErrors {
  username?: string;
  password?: string;
  passwordCheck?: string;
  email?: string;
  address?: string;
  nickname?: string;
  age?: string;
}

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState<SignUpFormData>({
    username: '',
    password: '',
    passwordCheck: '',
    email: '',
    address: '',
    gender: '남',
    nickname: '',
    age: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordCheck, setShowPasswordCheck] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [nicknameChecked, setNicknameChecked] = useState(false);

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
    
    if (!formData.address) {
      newErrors.address = '주소를 입력해주세요.';
    }
    
    const nicknameError = validateNickname(formData.nickname);
    if (nicknameError) newErrors.nickname = nicknameError;
    else if (!nicknameChecked) newErrors.nickname = '닉네임 중복 확인을 해주세요.';
    
    if (!formData.age) {
      newErrors.age = '나이를 입력해주세요.';
    } else if (isNaN(Number(formData.age)) || Number(formData.age) < 1 || Number(formData.age) > 120) {
      newErrors.age = '올바른 나이를 입력해주세요.';
    }
    
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
        address: formData.address,
        gender: formData.gender,
        nickname: formData.nickname,
        age: parseInt(formData.age)
      });
      
      console.log('회원가입 성공:', response.data);
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
      <div className="max-w-full md:max-w-md mx-auto min-h-screen bg-white flex flex-col items-center">
        {/* 모바일 헤더 */}
        <div className="flex items-center justify-between w-full p-4 border-b border-gray-100">
          <button 
            onClick={() => navigate('/login')}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">회원가입</h1>
          <div className="w-10"></div>
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
                      : 'bg-blue-600 text-white hover:bg-blue-700'
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
              <div className="relative">
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
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* 주소 */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                주소 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="주소를 입력하세요"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`pl-11 h-12 rounded-xl ${
                    errors.address ? 'border-red-500' : 'border-gray-200'
                  } focus:border-blue-500 focus:ring-blue-500`}
                />
              </div>
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address}</p>
              )}
            </div>

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
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } active:scale-[0.98] transition-all`}
                >
                  {nicknameChecked ? '✓ 확인됨' : '중복확인'}
                </Button>
              </div>
              {errors.nickname && (
                <p className="text-sm text-red-600">{errors.nickname}</p>
              )}
            </div>

            {/* 성별 */}
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-medium text-gray-700">
                성별 <span className="text-red-500">*</span>
              </Label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full h-12 px-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="남">남자</option>
                <option value="여">여자</option>
              </select>
            </div>

            {/* 나이 */}
            <div className="space-y-2">
              <Label htmlFor="age" className="text-sm font-medium text-gray-700">
                나이 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="age"
                name="age"
                type="number"
                placeholder="만 나이를 입력하세요"
                min="1"
                max="120"
                value={formData.age}
                onChange={handleInputChange}
                className={`h-12 rounded-xl ${
                  errors.age ? 'border-red-500' : 'border-gray-200'
                } focus:border-blue-500 focus:ring-blue-500`}
              />
              {errors.age && (
                <p className="text-sm text-red-600">{errors.age}</p>
              )}
            </div>

            {/* 회원가입 버튼 */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* 혜택 안내 */}
          <div className="mt-8 bg-blue-50 p-4 rounded-xl">
            <h4 className="text-sm font-medium text-blue-900 mb-2">🎁 회원가입 혜택</h4>
            <ul className="text-xs text-blue-700 space-y-1.5">
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                무료 AI 진단 및 개인 맞춤 분석
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                지속적인 진행 상황 추적
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                주간 챌린지 및 포인트 적립
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                미래 헤어스타일 시뮬레이션
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;