# Backend Architecture - Hair Loss RAG Analyzer v2

## Overview

여성형 탈모 분석 시스템 (Sinclair Scale 5단계 분류)

**핵심 기술 스택:**
- ROI BiSeNet 세그멘테이션 (두피 영역 추출)
- ConvNeXt-Large (1536d) + ViT-S/16 (384d) 듀얼 임베딩
- Pinecone Vector Database (Dual Index)
- 신뢰도 기반 동적 가중치 앙상블 (Confidence-Weighted Ensemble)
- GPT-4o-mini LLM 분석 (선택적)

## Architecture Diagram

```
[User Image Upload]
        ↓
[Image Preprocessing & Enhancement]
        ↓
[BiSeNet ROI Extraction (Center 70%)]
        ↓
    ┌───────────────────────┐
    │  Dual Embedding       │
    │                       │
    │  ConvNeXt-L (1536d)  │  ViT-S/16 (384d)
    │        ↓             │        ↓
    │   L2 Normalize       │   L2 Normalize
    └───────────────────────┘
            ↓
    ┌───────────────────────┐
    │  Pinecone Dual Search │
    │                       │
    │  Index: ConvNeXt     │  Index: ViT-S/16
    │  Filter:             │  Filter:
    │  - gender=female     │  - gender=female
    │  - embedding_type=roi│  - embedding_type=roi
    │                      │
    │  Top-K: 10           │  Top-K: 10
    └───────────────────────┘
            ↓
    ┌───────────────────────┐
    │  KNN to Probs         │
    │                       │
    │  T_CONV = 0.15       │  T_VIT = 0.20
    │  Softmax with        │  Softmax with
    │  Temperature         │  Temperature
    └───────────────────────┘
            ↓
    ┌───────────────────────────────────────┐
    │  Confidence-Weighted Dynamic Ensemble │
    │                                       │
    │  w_conv = conf_conv / (conf_conv + conf_vit)
    │  w_vit = conf_vit / (conf_conv + conf_vit)
    │                                       │
    │  P_ensemble = w_conv * P_conv + w_vit * P_vit
    └───────────────────────────────────────┘
            ↓
    ┌───────────────────────┐
    │  LLM Analysis         │
    │  (Optional)           │
    │                       │
    │  GPT-4o-mini          │
    │  Vision + RAG Context │
    └───────────────────────┘
            ↓
    [Final Prediction: Stage 1-5 + Confidence + Similar Images]
```

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI 애플리케이션 진입점
│   ├── config.py                  # 환경 설정 (Sinclair Scale, Gender Filter)
│   ├── per_class_config.py        # 앙상블 설정 (NUM_CLASSES=5, 온도 파라미터)
│   ├── models.py                  # Pydantic 모델 정의
│   │
│   ├── routers/
│   │   └── analysis.py            # API 엔드포인트 (/analyze-upload, /health)
│   │
│   └── services/
│       ├── image_processor.py     # 이미지 전처리 + ROI BiSeNet + 듀얼 임베딩
│       ├── dual_pinecone_manager.py # Pinecone 듀얼 인덱스 검색
│       ├── ensemble_manager.py    # KNN to Probs + 신뢰도 기반 앙상블
│       ├── llm_analyzer.py        # GPT-4o-mini 분석
│       └── hair_loss_analyzer.py  # 메인 분석 오케스트레이터
│
├── .env                           # 환경 변수 (GENDER_FILTER=female)
├── requirements.txt
└── README.md
```

## Core Components

### 1. Image Processor (`services/image_processor.py`)

**역할:** 이미지 전처리, BiSeNet ROI 추출, ConvNeXt + ViT 듀얼 임베딩 생성

**주요 메서드:**

#### `simulate_bisenet_segmentation(image: Image.Image) -> Image.Image`
두피 영역 추출 (중앙 70% ROI)
```python
# 좌우상하 15% 크롭 → 중앙 70% 영역
left = int(width * 0.15)
top = int(height * 0.15)
right = int(width * 0.85)
bottom = int(height * 0.85)
roi_img = image.crop((left, top, right, bottom))
roi_img = roi_img.resize((width, height), Image.Resampling.LANCZOS)
```

#### `extract_roi_dual_embeddings(image: Image.Image) -> Tuple[np.ndarray, np.ndarray]`
ROI 처리 후 듀얼 임베딩 추출
```python
# 1. BiSeNet ROI 추출
roi_image = self.simulate_bisenet_segmentation(image)

# 2. ConvNeXt-L 임베딩 (1536차원)
conv_embedding = self.extract_embedding(roi_image, self.conv_model, self.transform_conv)

# 3. ViT-S/16 임베딩 (384차원)
vit_embedding = self.extract_embedding(roi_image, self.vit_model, self.transform_vit)

# 4. L2 Normalization
conv_embedding = conv_embedding / np.linalg.norm(conv_embedding)
vit_embedding = vit_embedding / np.linalg.norm(vit_embedding)
```

**이미지 증강:**
- Sharpness: 1.05
- Contrast: 1.05
- Brightness: 1.03
- Color: 1.03

### 2. Dual Pinecone Manager (`services/dual_pinecone_manager.py`)

**역할:** ConvNeXt와 ViT 두 개의 Pinecone 인덱스에서 병렬 검색

**주요 메서드:**

#### `dual_search(conv_embedding, vit_embedding, top_k=10, use_roi=False)`
두 인덱스에서 동시 검색
```python
# Pinecone 필터 구성
search_filter = {
    "gender": {"$eq": "female"}  # 여성형 탈모 데이터만
}

if use_roi:
    search_filter["embedding_type"] = {"$eq": "roi"}  # ROI 임베딩만

# ConvNeXt 인덱스 검색
res_conv = idx_conv.query(
    vector=conv_embedding.tolist(),
    top_k=top_k,
    include_metadata=True,
    filter=search_filter
)

# ViT 인덱스 검색
res_vit = idx_vit.query(
    vector=vit_embedding.tolist(),
    top_k=top_k,
    include_metadata=True,
    filter=search_filter
)
```

#### `predict_ensemble_stage(conv_embedding, vit_embedding, top_k, viewpoint, use_roi)`
앙상블 예측 수행
```python
# 1. 듀얼 검색
conv_matches, vit_matches = self.dual_search(...)

# 2. 앙상블 매니저로 예측
ensemble = EnsembleManager()
result = ensemble.predict_from_dual_results(conv_matches, vit_matches)
```

**Pinecone 인덱스 설정:**
- ConvNeXt Index: `hair-loss-rag-analyzer` (1536차원)
- ViT Index: `hair-loss-vit-s16` (384차원)
- Total Vectors: 35,634 (ConvNeXt), 29,307 (ViT)

### 3. Ensemble Manager (`services/ensemble_manager.py`)

**역할:** KNN 결과를 확률 분포로 변환 → 신뢰도 기반 동적 가중치 앙상블

**주요 메서드:**

#### `knn_to_probs(matches, num_classes=5, T=0.20) -> np.ndarray`
KNN 검색 결과를 확률 분포로 변환
```python
# 1. 유사도 점수 추출
sims = np.array([m["score"] for m in matches], float)

# 2. 온도 파라미터로 Softmax
w = np.exp(sims / T)
w = w / (w.sum() + 1e-12)

# 3. 클래스별 확률 집계
probs = np.zeros(num_classes, float)
for wi, m in zip(w, matches):
    stage = extract_stage_from_metadata(m["metadata"])
    if 1 <= stage <= num_classes:
        probs[stage-1] += wi

# 4. 정규화
return probs / probs.sum()
```

**온도 파라미터:**
- `T_CONV = 0.15` (ConvNeXt, 더 sharp한 분포)
- `T_VIT = 0.20` (ViT, 더 smooth한 분포)

#### `apply_ensemble(p_conv, p_vit) -> Tuple[int, np.ndarray, Dict]`
신뢰도 기반 동적 가중치 앙상블
```python
# 1. 각 모델의 최대 확률을 신뢰도로 사용
conf_conv = np.max(p_conv)
conf_vit = np.max(p_vit)

# 2. 신뢰도 합으로 정규화하여 가중치 계산
total_conf = conf_conv + conf_vit + 1e-12
w_conv = conf_conv / total_conf
w_vit = conf_vit / total_conf

# 3. 동적 가중치로 앙상블
P_ens = w_conv * p_conv + w_vit * p_vit

# 4. 정규화
s = P_ens.sum()
if s > 0:
    P_ens = P_ens / s

# 5. 최종 예측
pred = int(np.argmax(P_ens)) + 1  # 1-based indexing

# 6. 가중치 정보 반환
weights_info = {
    'conv_weight': float(w_conv),
    'vit_weight': float(w_vit),
    'conv_confidence': float(conf_conv),
    'vit_confidence': float(conf_vit),
}

return pred, P_ens, weights_info
```

**Per-class 가중치 방식 (주석 처리):**
```python
# ============================================================================
# Per-class 가중치 방식 (추후 최적화 후 사용)
# 가중치 파일: result_log/tester/weight/weight(female_full+1)/ensemble_config.json
# ============================================================================
# def apply_ensemble_perclass(self, p_conv, p_vit):
#     w_conv = np.array(self.config["weights"]["conv"], float)
#     w_vit = np.array(self.config["weights"]["vit"], float)
#     P_ens = w_conv * p_conv + w_vit * p_vit
#     ...
```

### 4. LLM Analyzer (`services/llm_analyzer.py`)

**역할:** GPT-4o-mini 비전 모델을 사용한 시각적 분석 + RAG 결과 통합

**주요 메서드:**

#### `async analyze_with_llm(image: Image.Image, faiss_results: Dict) -> Dict`
LLM 기반 탈모 분석
```python
# 1. 이미지를 base64로 인코딩
base64_image = self.encode_image_to_base64(image)

# 2. RAG 결과 기반 프롬프트 생성
prompt = self.create_analysis_prompt(faiss_results)

# 3. GPT-4o-mini API 호출
response = self.client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {
                "url": f"data:image/jpeg;base64,{base64_image}",
                "detail": "high"
            }}
        ]
    }],
    max_tokens=1000,
    temperature=0.1
)

# 4. JSON 응답 파싱
llm_result = json.loads(response.choices[0].message.content)
```

**Sinclair Scale 분류 기준:**
```python
self.sinclair_descriptions = {
    1: "Stage 1 (정상) - 정수리 모발 밀도 정상, 가르마 부위 두피 노출 없음",
    2: "Stage 2 (경증) - 가르마 부위 두피가 약간 보이기 시작, 모발 밀도 경미한 감소",
    3: "Stage 3 (중등도) - 가르마 부위 두피 노출 증가, 모발 밀도 중등도 감소",
    4: "Stage 4 (중증) - 가르마 부위 및 정수리 두피 노출 뚜렷, 모발 밀도 현저한 감소",
    5: "Stage 5 (최중증) - 정수리 전체 두피 노출, 모발 밀도 심각한 감소"
}
```

#### `combine_results(faiss_results: Dict, llm_results: Dict) -> Dict`
RAG 앙상블 결과와 LLM 분석 결합
```python
# LLM 결과를 우선으로 하되, RAG 앙상블 결과도 포함
final_stage = llm_analysis.get('final_stage', faiss_results.get('predicted_stage'))

# 단계 값 안전 보정: 1~5로 클램프 (Sinclair Scale)
final_stage = max(1, min(5, int(final_stage)))

return {
    'success': True,
    'method': 'llm_enhanced',
    'predicted_stage': final_stage,
    'confidence': final_confidence,
    'stage_description': self.sinclair_descriptions.get(final_stage),
    'analysis_details': {
        'llm_analysis': llm_analysis.get('analysis_details'),
        'llm_reasoning': llm_analysis.get('reasoning'),
        'rag_comparison': llm_analysis.get('rag_comparison')
    },
    'ensemble_results': {
        'predicted_stage': faiss_results.get('predicted_stage'),
        'confidence': faiss_results.get('confidence'),
        'stage_scores': faiss_results.get('stage_scores'),
        'similar_images': faiss_results.get('similar_images')[:3]
    }
}
```

### 5. Hair Loss Analyzer (`services/hair_loss_analyzer.py`)

**역할:** 전체 분석 파이프라인 오케스트레이션

**주요 메서드:**

#### `async analyze_image(image, filename, top_k=10, use_llm=True, viewpoint=None, use_roi=True)`
이미지 분석 전체 플로우
```python
# 1. ROI 듀얼 임베딩 추출 (BiSeNet 세그멘테이션 적용)
if use_roi:
    conv_embedding, vit_embedding = self.image_processor.extract_roi_dual_embeddings(image)
else:
    conv_embedding, vit_embedding = self.image_processor.extract_dual_embeddings(image)

# 2. 앙상블 예측 수행 (ROI 임베딩으로 검색)
ensemble_result = self.dual_manager.predict_ensemble_stage(
    conv_embedding, vit_embedding, top_k, viewpoint, use_roi=use_roi
)

if ensemble_result['predicted_stage'] is None:
    return {'success': False, 'error': '유사한 이미지를 찾을 수 없습니다'}

# 3. LLM 분석 (선택적)
if use_llm:
    llm_result = await self.llm_analyzer.analyze_with_llm(image, ensemble_result)
    final_result = self.llm_analyzer.combine_results(ensemble_result, llm_result)
else:
    final_result = {
        'success': True,
        'method': 'ensemble_only',
        'predicted_stage': ensemble_result['predicted_stage'],
        'confidence': ensemble_result['confidence'],
        'stage_scores': ensemble_result['stage_scores'],
        'similar_images': ensemble_result['similar_images']
    }

return final_result
```

## API Endpoints

### POST `/analysis/analyze-upload`

업로드된 이미지 파일 분석 (ROI 기반)

**Request:**
```http
POST /analysis/analyze-upload
Content-Type: multipart/form-data

file: <binary image data>
use_llm: true (optional, default: true)
use_roi: true (optional, default: true)
```

**Response:**
```json
{
  "success": true,
  "method": "llm_enhanced",
  "predicted_stage": 2,
  "confidence": 0.693,
  "stage_description": "Stage 2 (경증) - 가르마 부위 두피가 약간 보이기 시작, 모발 밀도 경미한 감소",
  "analysis_details": {
    "llm_analysis": {
      "part_line_condition": "가르마 부위 상태 설명",
      "crown_density": "정수리 모발 밀도 평가",
      "overall_density": "전체 모발 밀도 평가",
      "key_indicators": ["주요 탈모 징후 1", "주요 탈모 징후 2"]
    },
    "llm_reasoning": "최종 판단 근거",
    "rag_comparison": "RAG 검색 결과와의 비교 분석",
    "token_usage": {
      "prompt_tokens": 1234,
      "completion_tokens": 567,
      "total_tokens": 1801
    }
  },
  "ensemble_results": {
    "predicted_stage": 2,
    "confidence": 0.693,
    "stage_scores": {
      "1": 0.123,
      "2": 0.693,
      "3": 0.184,
      "4": 0.000,
      "5": 0.000
    },
    "similar_images": [
      {
        "filename": "data_117_png.rf.716a8a481b39dee43f68691a60ff47c8.jpg",
        "stage": 2,
        "similarity": 0.857,
        "source": "convnext"
      },
      ...
    ]
  },
  "raw_llm_response": "..."
}
```

### GET `/analysis/health`

시스템 헬스 체크

**Response:**
```json
{
  "status": "healthy",
  "components": {
    "image_processor": "ok",
    "dual_pinecone_manager": "ok",
    "llm_analyzer": "ok"
  },
  "timestamp": "2025-10-01T12:00:00"
}
```

## Configuration

### `config.py`

Sinclair Scale 및 Gender Filter 설정

```python
class Settings:
    # Query filters (여성형 탈모 - Sinclair 5단계)
    DEFAULT_GENDER_FILTER: str = "female"
    DEFAULT_POINTVIEW_FILTER: str = "top-down"

    # 단계 설명 (Sinclair Scale - 여성형 탈모)
    STAGE_DESCRIPTIONS: dict = {
        1: "Stage 1 (정상) - 정수리 모발 밀도 정상, 탈모 징후 없음",
        2: "Stage 2 (경증) - 가르마 부위 두피가 약간 보이기 시작, 모발 밀도 경미한 감소",
        3: "Stage 3 (중등도) - 가르마 부위 두피 노출 증가, 모발 밀도 중등도 감소",
        4: "Stage 4 (중증) - 가르마 부위 및 정수리 두피 노출 뚜렷, 모발 밀도 현저한 감소",
        5: "Stage 5 (최중증) - 정수리 전체 두피 노출, 모발 밀도 심각한 감소"
    }
```

### `per_class_config.py`

앙상블 파라미터 설정

```python
# Pinecone 인덱스 설정
INDEX_CONV = "hair-loss-rag-analyzer"  # ConvNeXt용 인덱스
INDEX_VIT = "hair-loss-vit-s16"        # ViT-S/16용 인덱스

# 검색 파라미터
TOP_K = 10
T_CONV = 0.15  # ConvNeXt 온도 파라미터
T_VIT = 0.20   # ViT 온도 파라미터

# 앙상블 설정 (여성형 탈모 - Sinclair 5단계)
USE_OVERRIDE = False  # 신뢰도 기반 동적 가중치 사용 중
NUM_CLASSES = 5  # Stage 1-5
```

### `.env`

환경 변수 설정

```bash
# Pinecone API
PINECONE_API_KEY=your-api-key-here

# OpenAI API (LLM 분석용)
OPENAI_API_KEY=your-openai-api-key

# Gender Filter (여성형 탈모)
GENDER_FILTER=female

# Viewpoint Filter
POINTVIEW_FILTER=top-down
```

## Key Differences: v2 vs v1

| Feature | v1 (Norwood Scale) | v2 (Sinclair Scale) |
|---------|-------------------|---------------------|
| **대상** | 남성형 탈모 (Norwood 7단계) | 여성형 탈모 (Sinclair 5단계) |
| **Gender Filter** | `male` | `female` |
| **NUM_CLASSES** | 7 | 5 |
| **ROI 방식** | BiSeNet 세그멘테이션 | BiSeNet 세그멘테이션 (동일) |
| **임베딩** | ConvNeXt-L + ViT-S/16 | ConvNeXt-L + ViT-S/16 (동일) |
| **앙상블 방식** | Per-class 가중치 | 신뢰도 기반 동적 가중치 |
| **Pinecone Index** | 별도 인덱스 | 별도 인덱스 (female ROI 데이터) |

## Sinclair Scale vs Norwood Scale

### Sinclair Scale (여성형 탈모, 5단계)
- **Stage 1 (정상)**: 정수리 모발 밀도 정상, 가르마 부위 두피 노출 없음
- **Stage 2 (경증)**: 가르마 부위 두피가 약간 보이기 시작, 모발 밀도 경미한 감소
- **Stage 3 (중등도)**: 가르마 부위 두피 노출 증가, 모발 밀도 중등도 감소
- **Stage 4 (중증)**: 가르마 부위 및 정수리 두피 노출 뚜렷, 모발 밀도 현저한 감소
- **Stage 5 (최중증)**: 정수리 전체 두피 노출, 모발 밀도 심각한 감소

**특징:**
- 정수리와 가르마 부위에서 시작
- 헤어라인은 대부분 유지됨
- 전체적인 모발 밀도 감소가 특징

### Norwood Scale (남성형 탈모, 7단계)
- **Stage 1**: 헤어라인 정상
- **Stage 2-3**: 헤어라인 후퇴 시작
- **Stage 4-5**: 헤어라인 후퇴 + 정수리 탈모
- **Stage 6-7**: 광범위한 탈모 (측두부와 후두부만 남음)

**특징:**
- 헤어라인 후퇴가 뚜렷함
- M자형 또는 U자형 패턴
- 정수리와 전두부에서 진행

## Testing

### Single Image Test

```python
# test/test_single_image.py
python test_single_image.py
```

### Frontend Flow Simulation

```python
# test/test_frontend_flow.py
python test_frontend_flow.py
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
  Stage 4: 0.0%
  Stage 5: 0.0%

유사 이미지 개수: 10개
```

## Error Handling

### Common Issues

1. **"유사한 이미지를 찾을 수 없습니다" (No similar images found)**
   - **원인**: Gender filter 불일치 또는 Pinecone에 ROI 데이터 없음
   - **해결**: `.env` 파일에서 `GENDER_FILTER=female` 확인, Pinecone 데이터 확인

2. **"'EnsembleManager' object has no attribute 'predict_with_dual_search'"**
   - **원인**: `dual_pinecone_manager.py`에서 잘못된 메서드 호출
   - **해결**: `predict_from_dual_results()` 메서드 사용 (v2에서 수정 완료)

3. **NUM_CLASSES 불일치**
   - **원인**: `per_class_config.py`에서 `NUM_CLASSES=7` (Norwood) 설정
   - **해결**: `NUM_CLASSES=5` (Sinclair)로 변경 (v2에서 수정 완료)

4. **LLM JSON 파싱 실패**
   - **원인**: GPT-4o-mini가 마크다운 코드 블록으로 감싼 JSON 반환
   - **해결**: `llm_analyzer.py`에서 자동으로 JSON 추출 처리

## Performance

- **이미지 전처리**: ~200ms
- **ROI BiSeNet 세그멘테이션**: ~50ms
- **듀얼 임베딩 추출**: ~500ms (ConvNeXt + ViT)
- **Pinecone 듀얼 검색**: ~300ms
- **앙상블 예측**: ~10ms
- **LLM 분석 (선택적)**: ~2000ms

**Total**: ~1060ms (LLM 없음), ~3060ms (LLM 포함)

## Dependencies

```txt
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6
pillow==10.1.0
torch==2.1.0
torchvision==0.16.0
timm==0.9.12
pinecone-client==3.0.0
openai==1.3.0
python-dotenv==1.0.0
numpy==1.24.3
```

## Deployment

### Local Development

```bash
# 1. 환경 변수 설정
cp .env.example .env
# Edit .env with your API keys

# 2. 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
# 1. Gunicorn + Uvicorn worker
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# 2. Docker (optional)
docker build -t hair-loss-analyzer-v2 .
docker run -p 8000:8000 --env-file .env hair-loss-analyzer-v2
```

## Monitoring

### Health Check

```bash
curl http://localhost:8000/analysis/health
```

### Logs

```python
# 로그 레벨 설정 (main.py)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Future Improvements

1. **Per-class 가중치 최적화**
   - 현재: 신뢰도 기반 동적 가중치
   - 목표: 여성형 탈모 데이터셋 기반 per-class 가중치 최적화
   - 저장 위치: `result_log/tester/weight/weight(female_full+1)/ensemble_config.json`

2. **BiSeNet 실제 모델 적용**
   - 현재: 중앙 70% 크롭으로 시뮬레이션
   - 목표: BiSeNet v2 실제 모델로 두피 영역 정밀 세그멘테이션

3. **캐싱 레이어 추가**
   - Pinecone 검색 결과 캐싱 (Redis)
   - 임베딩 캐싱 (동일 이미지 재분석 방지)

4. **배치 처리**
   - 다중 이미지 동시 분석
   - 임베딩 추출 배치 처리

5. **모델 업데이트**
   - ConvNeXt-L → ConvNeXt-XXL
   - ViT-S/16 → ViT-B/16 또는 ViT-L/14

## References

- **Sinclair Scale**: Ludwig E. Classification of female pattern hair loss. Br J Dermatol. 1977;97(3):247-254.
- **ConvNeXt**: Liu Z, et al. A ConvNet for the 2020s. CVPR 2022.
- **ViT**: Dosovitskiy A, et al. An Image is Worth 16x16 Words. ICLR 2021.
- **BiSeNet**: Yu C, et al. BiSeNet: Bilateral Segmentation Network for Real-time Semantic Segmentation. ECCV 2018.
- **Pinecone**: https://www.pinecone.io/
- **OpenAI GPT-4**: https://platform.openai.com/docs/models/gpt-4
