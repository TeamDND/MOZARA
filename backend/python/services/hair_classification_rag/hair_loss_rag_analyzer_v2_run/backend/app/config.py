import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Query filters (여성형 탈모 - Sinclair 5단계)
    DEFAULT_GENDER_FILTER: str = os.getenv("GENDER_FILTER", "female")
    DEFAULT_POINTVIEW_FILTER: str = os.getenv("POINTVIEW_FILTER", "top-down")

    # Pinecone 설정
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "hair-loss-rag-analysis-convnext")
    PINECONE_ENVIRONMENT: str = "us-east-1-aws"

    # FastAPI 설정
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS 설정
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    ALLOWED_HOSTS: list = ["localhost", "127.0.0.1"]

    # 데이터셋 경로
    DATASET_PATH: str = os.getenv("DATASET_PATH", "C:/Users/301/Desktop/hair_loss_rag/hair_rag_dataset_image/hair_rag_dataset_ragging")

    # 업로드 설정
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v1/backend/uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".bmp"}

    # 모델 설정
    MODEL_NAME: str = "convnext_large.fb_in22k_ft_in1k_384"
    EMBEDDING_DIMENSION: int = 1536  # ConvNeXt-L feature dimension

    # 단계 설명 (Sinclair Scale - 여성형 탈모)
    STAGE_DESCRIPTIONS: dict = {
        1: "Stage 1 (정상) - 정수리 모발 밀도 정상, 탈모 징후 없음",
        2: "Stage 2 (경증) - 가르마 부위 두피가 약간 보이기 시작, 모발 밀도 경미한 감소",
        3: "Stage 3 (중등도) - 가르마 부위 두피 노출 증가, 모발 밀도 중등도 감소",
        4: "Stage 4 (중증) - 가르마 부위 및 정수리 두피 노출 뚜렷, 모발 밀도 현저한 감소",
        5: "Stage 5 (최중증) - 정수리 전체 두피 노출, 모발 밀도 심각한 감소"
    }

settings = Settings()
