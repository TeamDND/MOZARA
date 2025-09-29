# 백엔드 시스템 분석 (Hair Loss Analysis Backend)

## 1. 프로젝트 구조 (Project Structure)

```
backend/
├── app/
│   ├── services/
│   │   ├── hair_loss_analyzer.py  # 핵심 분석 로직
│   │   ├── image_processor.py     # 이미지 처리 및 임베딩
│   │   ├── dual_pinecone_manager.py # Pinecone 벡터 DB 관리 (듀얼 모델)
│   │   └── llm_analyzer.py        # LLM 기반 결과 해석
│   ├── routers/
│   │   └── analysis.py            # API 엔드포인트 정의
│   ├── models.py                  # Pydantic 데이터 모델 (요청/응답)
│   └── per_class_config.py        # 앙상블 모델 가중치 설정
├── main.py                        # FastAPI 앱 진입점
└── requirements.txt               # Python 라이브러리 의존성
```

## 2. 핵심 기술 스택 (Core Tech Stack)

- **Web Framework**: FastAPI
- **Data Validation**: Pydantic
- **Vector Database**: Pinecone
- **AI/ML Models**:
    - `convnext_large`: 이미지 특징 추출
    - `vit_small_patch16_224`: 이미지 특징 추출
- **Core Libraries**: PyTorch, timm, numpy, scikit-learn

## 3. 실행 흐름 (Execution Flow)

프론트엔드에서 두 개의 이미지를 업로드하고 "분석하기" 버튼을 누르면 다음 과정이 실행됩니다.

1.  **API 요청 수신**:
    - `main.py`가 FastAPI 앱을 실행하고, `/api` 경로의 요청을 `app/routers/analysis.py`로 전달합니다.
    - `analysis.py`의 `/analysis/analyze-dual-upload` 엔드포인트가 `POST` 요청을 받습니다. 이 때 `primary_file`과 `secondary_file` 두 개의 이미지 파일을 입력받습니다.

2.  **분석 서비스 호출**:
    - 해당 엔드포인트는 `HairLossAnalyzer` 서비스의 `analyze_dual_images` 메소드를 호출합니다.

3.  **이미지 처리 및 임베딩**:
    - `ImageProcessor`가 두 이미지를 각각 `ConvNeXt`와 `ViT` 모델이 요구하는 형식으로 변환하고, 각 모델을 통해 임베딩(숫자 벡터)을 추출합니다. (총 4개의 임베딩 생성)

4.  **벡터 검색 (Vector Search)**:
    - `DualPineconeManager`가 4개의 임베딩을 사용하여 Pinecone 벡터 데이터베이스에서 각각 가장 유사한 이미지들의 정보를 `top_k`개 만큼 검색합니다.

5.  **확률 계산**:
    - `HairLossAnalyzer`의 `knn_to_probs` 메소드가 검색된 유사 이미지들의 '유사도 점수'를 소프트맥스와 유사한 방식으로 정규화하여, 각 탈모 레벨(1~7)에 대한 확률 분포(numpy 배열)를 계산합니다. (총 4개의 확률 분포 생성)

6.  **Late Fusion 앙상블**:
    - `late_fusion_predict` 메소드가 4개의 확률 분포를 융합합니다.
    - 먼저 각 이미지별로 ConvNeXt와 ViT의 확률 분포를 가중합하여 앙상블합니다. (2개의 앙상블된 확률 분포 생성)
    - 이 두 개의 확률 분포를 다시 가중 평균하여 최종적인 단일 확률 분포를 만듭니다.
    - 가장 높은 확률을 가진 레벨을 최종 `predicted_stage`로 결정합니다.

7.  **(선택) LLM 분석**:
    - `use_llm` 파라미터가 True일 경우, `LLMHairAnalyzer`가 최종 예측 결과와 원본 이미지를 바탕으로 자연어 형태의 상세 설명을 생성합니다.

8.  **응답 생성 및 반환**:
    - `predicted_stage`, `stage_probabilities` (딕셔너리), `norwood_description` 등 모든 분석 결과를 `AnalysisResult` 모델에 정의된 형식에 맞춰 JSON으로 변환하여 프론트엔드에 반환합니다.

## 4. 주요 파일 설명 (Key File Descriptions)

- **`main.py`**: FastAPI 애플리케이션을 생성하고, CORS 미들웨어를 설정하며, `analysis` 라우터를 포함하는 서버의 시작점입니다.
- **`app/routers/analysis.py`**: `/analyze-dual-upload`와 같은 API 엔드포인트를 정의하고, 요청을 받아 적절한 서비스 함수를 호출하는 라우터입니다.
- **`app/models.py`**: Pydantic을 사용하여 API의 요청 및 응답 데이터 구조를 정의합니다. `AnalysisResult` 모델이 핵심입니다.
- **`app/services/hair_loss_analyzer.py`**: 시스템의 핵심 두뇌입니다. 이미지 처리, 벡터 검색, 앙상블, LLM 연동 등 전체 분석 파이프라인을 총괄하는 `HairLossAnalyzer` 클래스가 정의되어 있습니다.
- **`app/services/dual_pinecone_manager.py`**: ConvNeXt와 ViT 모델에 해당하는 두 개의 Pinecone 인덱스와 상호작용하여 벡터를 검색하는 로직을 담당합니다.

## 5. API 명세 (API Specification)

- **Endpoint**: `POST /api/analysis/analyze-dual-upload`
- **Description**: 두 개의 이미지(primary, secondary)를 받아 탈모 단계를 분석합니다.
- **Request Body**:
    - `Content-Type`: `multipart/form-data`
    - **Fields**:
        - `primary_file`: Top-down 또는 Front 이미지 파일
        - `secondary_file`: Right 또는 Left 이미지 파일
- **Response Body**:
    - `Content-Type`: `application/json`
    - **Shape** (`AnalysisResult` 모델 기반):
    ```json
    {
        "success": true,
        "predicted_stage": 2,
        "confidence": 0.304,
        "stage_description": "경미한 탈모...",
        "norwood_stage": 1,
        "norwood_description": "1단계(초기 단계)",
        "stage_probabilities": {
            "stage_1": 0.300,
            "stage_2": 0.304,
            ...
        },
        "llm_analysis": "LLM 분석 결과...",
        ...
    }
    ```
