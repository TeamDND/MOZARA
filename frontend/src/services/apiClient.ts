// TypeScript: API 클라이언트 설정
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { clearToken } from '../utils/tokenSlice';
import { clearUser } from '../utils/userSlice';

// TypeScript: API 클라이언트 인스턴스 생성
const apiClient = axios.create({
    baseURL: 'http://localhost:8080/api', // springboot는 8080 포트번호
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    timeout: 120000,
});

// TypeScript: 요청 인터셉터 - 요청 전에 실행되는 함수
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // URLSearchParams 타입 체크
        if(config.data && config.data instanceof URLSearchParams){
            config.headers = config.headers || {};
            config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        
        // JWT 토큰 추가 (Bearer 접두사 포함)
        // localStorage에서 토큰 가져오기 (순환 참조 방지)
        try {
            const persistData = localStorage.getItem('persist:root');
            if (persistData) {
                const parsedData = JSON.parse(persistData);
                const tokenData = parsedData.token ? JSON.parse(parsedData.token) : {};
                const jwtToken = tokenData.jwtToken;
                
                if (jwtToken && jwtToken !== 'null' && jwtToken !== 'undefined') {
                    config.headers = config.headers || {};
                    config.headers['authorization'] = `Bearer ${jwtToken}`;
                    // console.log('JWT 토큰 추가됨:', jwtToken.substring(0, 20) + '...'); // 보안상 주석처리
                } else {
                    console.warn('JWT 토큰이 없거나 유효하지 않음');
                }
            }
        } catch (error) {
            console.error('토큰 파싱 오류:', error);
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// TypeScript: 응답 인터셉터 - 응답 후에 실행되는 함수
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // 로그인 요청과 이메일 인증 요청은 401 처리 건너뛰기
        const isLoginRequest = originalRequest?.url?.includes('/login');
        const isEmailAuthRequest = originalRequest?.url?.includes('/email-auth');

        // 401 또는 456 에러 처리 (토큰 갱신) - 로그인 요청과 이메일 인증 요청 제외
        if((error.response?.status === 401 || error.response?.status === 456) && !originalRequest._retry && !isLoginRequest && !isEmailAuthRequest){
            originalRequest._retry = true;
            try{
                console.log('토큰 갱신 시도 중...');
                const res = await axios.post('http://localhost:8080/api/reissue', null, {
                    withCredentials: true,
                });
                const newAccessToken = res.headers['authorization'];
                if(newAccessToken){
                    // Bearer 접두사 제거 후 저장
                    const cleanToken = newAccessToken.replace(/^Bearer\s+/i, '');
                    // console.log('새 토큰 받음:', cleanToken.substring(0, 20) + '...'); // 보안상 주석처리
                    
                    // localStorage에 직접 저장 (순환 참조 방지)
                    const persistData = JSON.parse(localStorage.getItem('persist:root') || '{}');
                    persistData.token = JSON.stringify({ jwtToken: cleanToken });
                    localStorage.setItem('persist:root', JSON.stringify(persistData));
                    
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers['authorization'] = `Bearer ${cleanToken}`;
                    console.log('토큰 갱신 후 재요청:', originalRequest.url);
                    return apiClient(originalRequest);
                }else{
                    console.error('토큰 갱신 실패: 새 토큰이 없음');
                }
            }catch(refreshError){
                console.error('토큰 갱신 실패:', refreshError);
                // 토큰 갱신 실패 시 Redux 상태 정리
                try {
                    // Redux store에서 상태 정리
                    const store = require('../utils/store').default;
                    store.dispatch(clearToken());
                    store.dispatch(clearUser());
                } catch (storeError) {
                    console.error('Redux 상태 정리 실패:', storeError);
                }
                // 로그인 페이지로 리다이렉트
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        
        // 에러 로깅
        console.error('API 요청 실패:', {
            url: originalRequest?.url,
            method: originalRequest?.method,
            status: error.response?.status,
            message: error.message
        });
        
        return Promise.reject(error);
    }
);

export default apiClient;
