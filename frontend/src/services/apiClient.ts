// TypeScript: API 클라이언트 설정
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// TypeScript: API 클라이언트 인스턴스 생성
const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api', // 환경 변수에서 읽어오기
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
        
        // TODO: JWT 토큰 관련 로직은 나중에 구현 예정
        
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
        // 에러 로깅
        console.error('API 요청 실패:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.message
        });
        
        // TODO: JWT 토큰 갱신 및 에러 처리 로직은 나중에 구현 예정
        
        return Promise.reject(error);
    }
);

export default apiClient;

