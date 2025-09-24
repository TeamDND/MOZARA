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
        
        // JWT 토큰 추가 (Bearer 접두사 포함)
        // localStorage에서 토큰 가져오기 (순환 참조 방지)
        const jwtToken = localStorage.getItem('persist:root') 
            ? JSON.parse(JSON.parse(localStorage.getItem('persist:root') || '{}').token || '{}').jwtToken
            : null;
        if(jwtToken){
            config.headers = config.headers || {};
            config.headers['authorization'] = `Bearer ${jwtToken}`;
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
        
        // 401 에러 처리 (토큰 갱신)
        if(error.response?.status === 401 && !originalRequest._retry){
            originalRequest._retry = true;
            try{
                const res = await axios.post('/api/reissue', null, {
                    withCredentials: true,
                });
                const newAccessToken = res.headers['authorization'];
                if(newAccessToken){
                    // Bearer 접두사 제거 후 저장
                    const cleanToken = newAccessToken.replace(/^Bearer\s+/i, '');
                    // localStorage에 직접 저장 (순환 참조 방지)
                    const persistData = JSON.parse(localStorage.getItem('persist:root') || '{}');
                    persistData.token = JSON.stringify({ jwtToken: cleanToken });
                    localStorage.setItem('persist:root', JSON.stringify(persistData));
                    
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers['authorization'] = `Bearer ${cleanToken}`;
                    return apiClient(originalRequest);
                }else{
                    console.error('토큰 갱신 실패:', error);
                }
            }catch(refreshError){
                console.error('토큰 갱신 실패:', refreshError);
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

