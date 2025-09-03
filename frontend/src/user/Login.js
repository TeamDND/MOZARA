import React from 'react'
import { useState } from 'react';
import apiClient from '../api/apiClient';
const Login = () => {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const handleSubmit = async(e) => {
        e.preventDefault();
        if(id === '' || password === '') {
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
        

    }
    const handleIdChange = (e) => {
        setId(e.target.value);
    }
    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    }
    return (
        <>
          <div>
            <h1>로그인</h1>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="아이디" value={id} onChange={handleIdChange} />
                <input type="password" placeholder="비밀번호" value={password} onChange={handlePasswordChange} />
                <button type="submit">로그인</button>
            </form>
          </div>           

        </>
    )
}

export default Login