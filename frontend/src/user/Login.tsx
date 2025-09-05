import React, { useState, FormEvent, ChangeEvent } from 'react';
import apiClient from '../api/apiClient';

// TypeScript: Login 컴포넌트 타입 정의
const Login: React.FC = () => {
  // TypeScript: 상태 타입 정의
  const [id, setId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  // TypeScript: 폼 제출 핸들러 (이벤트 타입 지정)
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (id === '' || password === '') {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    try {
      const res = await apiClient.post('/login', {
        "username": id,
        "password": password
      });
      console.log(res.data);
      alert('로그인 성공');
      const response = await apiClient.get("/userinfo/" + id);
      console.log(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  // TypeScript: 입력 변경 핸들러들 (이벤트 타입 지정)
  const handleIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setId(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  return (
    // Tailwind CSS: 로그인 폼 컨테이너
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">로그인</h1>
      
      {/* Tailwind CSS: 에러 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Tailwind CSS: 로그인 폼 */}
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
            onChange={handleIdChange}
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
            onChange={handlePasswordChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        {/* Tailwind CSS: 로그인 버튼 */}
        <button
          type="submit"
          className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors font-medium"
        >
          로그인
        </button>
      </form>
    </div>
  );
};

export default Login;

