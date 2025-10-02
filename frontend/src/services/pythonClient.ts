// Python FastAPI 전용 클라이언트
import axios from 'axios';

const pythonClient = axios.create({
    baseURL: 'http://localhost:8000', // Python FastAPI 서버
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 120000,
});

export default pythonClient;
