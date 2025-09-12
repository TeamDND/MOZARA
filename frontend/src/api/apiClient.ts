// TypeScript: API 클라이언트 설정
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { setToken } from '../store/tokenSlice';
import { store } from '../store/store';

// TypeScript: API 클라이언트 인스턴스 생성
const apiClient = axios.create({
    baseURL: 'http://localhost:8080/api', // 기본값, 동적으로 변경 가능
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    timeout: 5000,
});

// TypeScript: 요청 인터셉터 - 요청 전에 실행되는 함수
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // URLSearchParams 타입 체크
        if(config.data && config.data instanceof URLSearchParams){
            config.headers = config.headers || {};
            config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        
        // JWT 토큰 추가
        const jwtToken = store.getState().token.jwtToken;
        if(jwtToken){
            config.headers = config.headers || {};
            config.headers['authorization'] = jwtToken;
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
        
        // 401 에러이고 재시도하지 않은 경우 토큰 갱신 시도
        if(error.response?.status === 401 && !originalRequest._retry){
            originalRequest._retry = true;
            try{
                const res = await axios.post('/api/refresh', null, {
                    withCredentials: true,
                });
                const newAccessToken = res.headers['authorization'];
                if(newAccessToken){
                    store.dispatch(setToken(newAccessToken));
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers['authorization'] = newAccessToken;
                    return apiClient(originalRequest);
                }else{
                    console.error('토큰 갱신 실패:', error);
                }
            }catch(refreshError){
                console.error('토큰 갱신 실패:', refreshError);
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;

