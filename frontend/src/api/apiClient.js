// 임시 페이지
import axios from 'axios';
import { setToken } from '../store/tokenSlice';
import { store } from '../store/store';

const apiClient = axios.create({
    baseURL: 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    timeout: 5000,
});
apiClient.interceptors.request.use(
    (config) =>{
        if(config.data && config.data instanceof URLSearchParams){
            config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    // const jwtToken = store.getState().token.jwtToken;
    // if(jwtToken){
    //     config.headers['authorization'] = jwtToken;
    // }
    return config;
},
(error) => {
    return Promise.reject(error);
});
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
       const originalRequest = error.config;
       if(error.response.status === 401 && !originalRequest._retry){
        originalRequest._retry = true;
        try{
            const res = await axios.post('/api/refresh', null,{
                withCredentials: true,
            });
            const newAccessToken = res.headers['authorization'];
            if(newAccessToken){
                store.dispatch(setToken(newAccessToken));
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