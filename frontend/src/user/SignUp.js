import React from 'react'
import { useState } from 'react';
import apiClient from '../api/apiClient';
import { useNavigate } from 'react-router-dom';


const SignUp = () => {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [passwordCheck, setPasswordCheck] = useState('');
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('man');
    const handleSubmit = async(e) => {
        e.preventDefault();
        if(id === '' || password === '' || passwordCheck === '' || nickname === '' || email === '' || age === '' ) {
            alert('모든 필드를 입력해주세요.');
            return;
        }
        if(password !== passwordCheck) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }
        try {
            const res = await apiClient.post('/join', {
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
    }
  return (
    <>
    <form onSubmit={handleSubmit}>
    <input type="text" placeholder='아이디' value={id} onChange={(e) => setId(e.target.value)} />
    <input type="password" placeholder='비밀번호' value={password} onChange={(e) => setPassword(e.target.value)} />
    <input type="password" placeholder='비밀번호 확인' value={passwordCheck} onChange={(e) => setPasswordCheck(e.target.value)} />
    <input type="text" placeholder='닉네임' value={nickname} onChange={(e) => setNickname(e.target.value)} />
    <input type="text" placeholder='이메일' value={email} onChange={(e) => setEmail(e.target.value)} />
    <input type="text" placeholder='나이' value={age} onChange={(e) => setAge(e.target.value)} />
    <select value={gender} onChange={(e) => setGender(e.target.value)}>
        <option value="man">남자</option>
        <option value="woman">여자</option>
    </select>
    <button type='submit'>회원가입</button>
    </form>
    </>
  )
}

export default SignUp