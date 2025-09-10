import React, { useState, FormEvent, ChangeEvent } from 'react';
import apiClient from '../api/apiClient';
import { useNavigate } from 'react-router-dom';

// TypeScript: SignUp 컴포넌트 타입 정의
const SignUp: React.FC = () => {
  const navigate = useNavigate();
  
  // TypeScript: 상태 타입 정의
  const [error, setError] = useState<string>('');
  const [id, setId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordCheck, setPasswordCheck] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'man' | 'woman'>('man');

  // TypeScript: 폼 제출 핸들러 (이벤트 타입 지정)
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (id === '' || password === '' || passwordCheck === '' || nickname === '' || email === '' || age === '') {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    if (password !== passwordCheck) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      const res = await apiClient.post('/signup', {
        "username": id,
        "password": password,
        "nickname": nickname,
        "email": email,
        "age": age,
        "gender": gender
      });
      console.log(res.data);
      alert('회원가입 성공');
      navigate('/');
    } catch (error) {
      console.log(error);
    }
  };

  return (
    // Tailwind CSS: 회원가입 폼 컨테이너
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">회원가입</h1>
      
      {/* Tailwind CSS: 에러 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Tailwind CSS: 회원가입 폼 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
            아이디
          </label>
          <input
            type="text"
            id="id"
            placeholder="아이디를 입력하세요"
            value={id}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            type="password"
            id="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div>
          <label htmlFor="passwordCheck" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호 확인
          </label>
          <input
            type="password"
            id="passwordCheck"
            placeholder="비밀번호를 다시 입력하세요"
            value={passwordCheck}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordCheck(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
            닉네임
          </label>
          <input
            type="text"
            id="nickname"
            placeholder="닉네임을 입력하세요"
            value={nickname}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            type="email"
            id="email"
            placeholder="이메일을 입력하세요"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
            나이
          </label>
          <input
            type="number"
            id="age"
            placeholder="나이를 입력하세요"
            value={age}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setAge(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            성별
          </label>
          <select
            id="gender"
            value={gender}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setGender(e.target.value as 'man' | 'woman')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="man">남자</option>
            <option value="woman">여자</option>
          </select>
        </div>
        
        {/* Tailwind CSS: 회원가입 버튼 */}
        <button
          type="submit"
          className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors font-medium"
        >
          회원가입
        </button>
      </form>
    </div>
  );
};

export default SignUp;

