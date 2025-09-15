import React, { useState, FormEvent, ChangeEvent } from 'react';
import apiClient from '../api/apiClient';
import { useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">회원가입</h2>
            <p className="text-gray-600">새로운 계정을 만들어보세요</p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {/* 아이디 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                아이디 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="6-18자 영문, 숫자만"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={checkUsername}
                  disabled={!formData.username || usernameChecked}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    usernameChecked 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {usernameChecked ? '✓' : '중복확인'}
                </button>
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="8자 이상"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="passwordCheck" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswordCheck ? "text" : "password"}
                  id="passwordCheck"
                  name="passwordCheck"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={formData.passwordCheck}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.passwordCheck ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordCheck(!showPasswordCheck)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswordCheck ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.passwordCheck && (
                <p className="mt-1 text-sm text-red-600">{errors.passwordCheck}</p>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* 주소 */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                주소 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                placeholder="주소를 입력하세요"
                value={formData.address}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>

            {/* 닉네임 */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                닉네임 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="nickname"
                  name="nickname"
                  placeholder="한글 8자, 영문 14자까지"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nickname ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={checkNickname}
                  disabled={!formData.nickname || nicknameChecked}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    nicknameChecked 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {nicknameChecked ? '✓' : '중복확인'}
                </button>
              </div>
              {errors.nickname && (
                <p className="mt-1 text-sm text-red-600">{errors.nickname}</p>
              )}
            </div>

            {/* 성별 */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                성별 <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="남">남자</option>
                <option value="여">여자</option>
              </select>
            </div>

            {/* 나이 */}
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                나이 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="age"
                name="age"
                placeholder="만 나이를 입력하세요"
                min="1"
                max="120"
                value={formData.age}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.age ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.age && (
                <p className="mt-1 text-sm text-red-600">{errors.age}</p>
              )}
            </div>

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '회원가입 중...' : '회원가입'}
            </button>

            {/* 로그인 링크 */}
            <div className="text-center">
              <p className="text-gray-600">
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  로그인하기
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;