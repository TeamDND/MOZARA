// Python FastAPI 전용 클라이언트
import axios from 'axios';

// 환경변수에서 Python API URL 가져오기 (배포 환경 대응)
const PYTHON_API_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:8000';

const pythonClient = axios.create({
    baseURL: PYTHON_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 120000,
});

export default pythonClient;
