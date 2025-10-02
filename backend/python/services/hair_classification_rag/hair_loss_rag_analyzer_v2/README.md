# Hair Loss RAG Analyzer v2 (Female - Sinclair Scale)

여성형 탈모 분석 시스템 - ROI BiSeNet + ConvNeXt-Large + ViT-S/16 듀얼 앙상블 + Pinecone RAG

## Features

- **ROI BiSeNet 세그멘테이션**: 두피 영역 추출 (중앙 70%)
- **듀얼 임베딩 모델**: ConvNeXt-Large (1536d) + ViT-S/16 (384d)
- **Pinecone 벡터 검색**: 듀얼 인덱스 (ConvNeXt + ViT)
- **신뢰도 기반 동적 가중치 앙상블**: 각 모델의 신뢰도에 따라 가중치 자동 조정
- **LLM 분석 (선택적)**: GPT-4o-mini 비전 모델로 세부 분석
- **Sinclair Scale**: 여성형 탈모 5단계 분류

## Architecture

```
[Upload Image]
      ↓
[ROI BiSeNet] → Extract scalp region (center 70%)
      ↓
[Dual Embedding] → ConvNeXt-L (1536d) + ViT-S/16 (384d)
      ↓
[Pinecone Search] → Top-10 similar images from each index
      ↓
[KNN to Probs] → Temperature-based softmax (T_CONV=0.15, T_VIT=0.20)
      ↓
[Confidence-Weighted Ensemble] → Dynamic weights based on model confidence
      ↓
[LLM Analysis (Optional)] → GPT-4o-mini vision analysis
      ↓
[Result] → Predicted Stage 1-5 + Confidence + Similar Images
```

## Prerequisites

- **Python**: 3.10+
- **Node.js**: 18+
- **API Keys**:
  - Pinecone API Key
  - OpenAI API Key (선택적, LLM 분석용)

## Quick Start

### 1. Backend Setup

#### Windows PowerShell:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# .env 파일 생성 후 API 키 입력
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Linux/Mac:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# .env 파일 생성 후 API 키 입력
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Backend URL**: `http://localhost:8000`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

**Frontend URL**: `http://localhost:3000`

## Environment Configuration

### Backend `.env` File

Create `backend/.env`:
```bash
# Pinecone API
PINECONE_API_KEY=your-pinecone-api-key-here

# OpenAI API (LLM 분석용, 선택적)
OPENAI_API_KEY=your-openai-api-key-here

# Gender Filter (여성형 탈모)
GENDER_FILTER=female

# Viewpoint Filter
POINTVIEW_FILTER=top-down

# CORS (Frontend URL)
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env` File (Optional)

Create `frontend/.env`:
```bash
REACT_APP_API_BASE_URL=http://localhost:8000
```

## Directory Structure

```
hair_loss_rag_analyzer_v2/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   └── analysis.py           # API 엔드포인트
│   │   ├── services/
│   │   │   ├── image_processor.py    # ROI BiSeNet + 듀얼 임베딩
│   │   │   ├── dual_pinecone_manager.py  # Pinecone 듀얼 검색
│   │   │   ├── ensemble_manager.py   # 신뢰도 기반 앙상블
│   │   │   ├── llm_analyzer.py       # GPT-4o-mini 분석
│   │   │   └── hair_loss_analyzer.py # 메인 분석기
│   │   ├── config.py                 # 환경 설정
│   │   ├── per_class_config.py       # 앙상블 파라미터
│   │   └── models.py                 # Pydantic 모델
│   ├── main.py                       # FastAPI 앱
│   ├── .env                          # 환경 변수
│   └── requirements.txt              # Python 의존성
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageUpload.tsx      # 이미지 업로드
│   │   │   └── AnalysisResult.tsx   # 결과 표시
│   │   ├── services/
│   │   │   └── api.ts                # Backend API 통신
│   │   ├── App.tsx                   # 메인 컴포넌트
│   │   └── index.tsx                 # 엔트리포인트
│   ├── public/
│   └── package.json                  # Node.js 의존성
│
├── test/
│   ├── test_single_image.py         # 단일 이미지 테스트
│   ├── test_frontend_flow.py        # Frontend 플로우 시뮬레이션
│   └── check_pinecone_data.py       # Pinecone 데이터 확인
│
├── BACKEND.md                        # Backend 상세 문서
├── FRONTEND.md                       # Frontend 상세 문서
└── README.md                         # 이 문서
```

## API Documentation

### POST `/api/analysis/analyze-upload`

이미지 업로드 및 탈모 분석

**Request:**
```http
POST /api/analysis/analyze-upload
Content-Type: multipart/form-data

file: <binary image data>
use_llm: true (optional)
use_roi: true (optional)
```

**Response:**
```json
{
  "success": true,
  "method": "llm_enhanced",
  "predicted_stage": 2,
  "confidence": 0.693,
  "stage_description": "Stage 2 (경증) - 가르마 부위 두피가 약간 보이기 시작",
  "analysis_details": {
    "llm_analysis": {
      "part_line_condition": "가르마 부위 상태 설명",
      "crown_density": "정수리 모발 밀도 평가",
      "overall_density": "전체 모발 밀도 평가"
    },
    "llm_reasoning": "최종 판단 근거"
  },
  "ensemble_results": {
    "stage_scores": {
      "1": 0.123,
      "2": 0.693,
      "3": 0.184
    },
    "similar_images": [...]
  }
}
```

### GET `/api/analysis/health`

시스템 헬스 체크

**Response:**
```json
{
  "status": "healthy",
  "components": {
    "image_processor": "ok",
    "dual_pinecone_manager": "ok",
    "llm_analyzer": "ok"
  }
}
```

## Sinclair Scale (여성형 탈모 5단계)

- **Stage 1 (정상)**: 정수리 모발 밀도 정상, 가르마 부위 두피 노출 없음
- **Stage 2 (경증)**: 가르마 부위 두피가 약간 보이기 시작, 모발 밀도 경미한 감소
- **Stage 3 (중등도)**: 가르마 부위 두피 노출 증가, 모발 밀도 중등도 감소
- **Stage 4 (중증)**: 가르마 부위 및 정수리 두피 노출 뚜렷, 모발 밀도 현저한 감소
- **Stage 5 (최중증)**: 정수리 전체 두피 노출, 모발 밀도 심각한 감소

## Performance

- **이미지 전처리**: ~200ms
- **ROI 추출**: ~50ms
- **듀얼 임베딩 추출**: ~500ms
- **Pinecone 검색**: ~300ms
- **앙상블 예측**: ~10ms
- **LLM 분석 (선택적)**: ~2000ms

**Total**: ~1060ms (LLM 없음), ~3060ms (LLM 포함)

## Testing

### Backend Tests

```bash
cd test

# 단일 이미지 테스트
python test_single_image.py

# Frontend 플로우 시뮬레이션
python test_frontend_flow.py

# Pinecone 데이터 확인
python check_pinecone_data.py
```

**Test Result Example:**
```
=== 앙상블 예측 결과 ===
예측 단계: Stage 2
신뢰도: 69.3%

단계별 점수:
  Stage 1: 12.3%
  Stage 2: 69.3%
  Stage 3: 18.4%

유사 이미지 개수: 10개
```

## Troubleshooting

### 1. "유사한 이미지를 찾을 수 없습니다" 오류

**원인**: Gender filter 불일치 또는 Pinecone에 ROI 데이터 없음

**해결**:
```bash
# .env 파일 확인
GENDER_FILTER=female  # male이 아닌 female로 설정

# Pinecone 데이터 확인
python test/check_pinecone_data.py
```

### 2. Import 오류

**원인**: 의존성 패키지 미설치

**해결**:
```bash
pip install -r requirements.txt
```

### 3. Port 충돌

**원인**: 8000번 포트가 이미 사용 중

**해결**:
```bash
# 다른 포트로 실행
uvicorn main:app --host 0.0.0.0 --port 8080 --reload

# Frontend .env도 업데이트
REACT_APP_API_BASE_URL=http://localhost:8080
```

### 4. CORS 오류

**원인**: Frontend URL이 CORS 허용 목록에 없음

**해결**:
```python
# backend/app/config.py
FRONTEND_URL = "http://localhost:3000"  # Frontend URL과 일치하는지 확인
```

## Notes

### v2 vs v1 차이점

| Feature | v1 (Norwood Scale) | v2 (Sinclair Scale) |
|---------|-------------------|---------------------|
| **대상** | 남성형 탈모 (Norwood 7단계) | 여성형 탈모 (Sinclair 5단계) |
| **Gender Filter** | `male` | `female` |
| **NUM_CLASSES** | 7 | 5 |
| **앙상블 방식** | Per-class 가중치 | 신뢰도 기반 동적 가중치 |
| **ROI 방식** | BiSeNet 세그멘테이션 | BiSeNet 세그멘테이션 (동일) |

### Pinecone 데이터 요구사항

- **ConvNeXt Index**: `hair-loss-rag-analyzer` (1536차원)
- **ViT Index**: `hair-loss-vit-s16` (384차원)
- **필수 메타데이터**:
  - `gender`: "female"
  - `embedding_type`: "roi"
  - `stage`: 1-5 (Sinclair Scale)
  - `filename`: 파일명
  - `pointview`: "top-down" (선택적)

### Per-class 가중치 (향후 적용 예정)

현재 v2는 **신뢰도 기반 동적 가중치 앙상블**을 사용합니다. Per-class 가중치 최적화 완료 후 적용 예정:

- 가중치 파일 위치: `result_log/tester/weight/weight(female_full+1)/ensemble_config.json`
- `ensemble_manager.py`에 주석 처리된 코드 참고
- `per_class_config.py`에서 `USE_OVERRIDE = True`로 변경 시 활성화

## Deployment

### Production Checklist

1. **Environment Variables**
   - [ ] Pinecone API Key 설정
   - [ ] OpenAI API Key 설정 (LLM 사용 시)
   - [ ] GENDER_FILTER=female 확인
   - [ ] CORS 설정 확인

2. **Backend**
   ```bash
   # Gunicorn으로 프로덕션 실행
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

3. **Frontend**
   ```bash
   npm run build
   # build/ 디렉토리를 웹 서버로 서빙
   ```

4. **Nginx 설정 예시**
   ```nginx
   server {
     listen 80;
     server_name example.com;

     # Frontend
     root /var/www/frontend/build;
     index index.html;

     location / {
       try_files $uri /index.html;
     }

     # Backend API
     location /api {
       proxy_pass http://localhost:8000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

## Documentation

- **[BACKEND.md](./BACKEND.md)**: Backend 상세 아키텍처 및 API 문서
- **[FRONTEND.md](./FRONTEND.md)**: Frontend 상세 구조 및 컴포넌트 문서

## License

MIT License

## Contributors

- Hair Loss Analysis Team

## Support

이슈 및 문의사항은 GitHub Issues에 등록해주세요.

---

**Version**: 2.0.0
**Last Updated**: 2025-10-01
**Target**: Female Pattern Hair Loss (Sinclair Scale 5 Stages)
