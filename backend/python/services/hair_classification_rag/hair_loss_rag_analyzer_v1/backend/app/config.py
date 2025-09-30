import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Query filters (testing)
    DEFAULT_GENDER_FILTER: str = os.getenv("GENDER_FILTER", "male")
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

    # 단계 설명
    STAGE_DESCRIPTIONS: dict = {
        1: "정상 또는 매우 경미한 탈모 - 탈모 징후가 거의 없거나 미세함",
        2: "경미한 탈모 - M자 탈모가 시작되거나 이마 라인 약간 후퇴",
        3: "초기 탈모 - M자 탈모가 뚜렷해지며 정수리 부위 모발 밀도 감소",
        4: "중기 탈모 - M자 탈모 진행, 정수리 탈모 본격화",
        5: "진행성 탈모 - 정수리와 M자 탈모가 연결되기 시작",
        6: "심한 탈모 - 정수리와 정면부가 점점 연결되어 하나의 큰 탈모 영역 형성",
        7: "매우 심한 탈모 - 측면과 뒷머리를 제외한 대부분의 모발 소실"
    }

settings = Settings()
