import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Pinecone 설정
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    INDEX_NAME: str = "hair-loss-rag-analysis"
    PINECONE_ENVIRONMENT: str = "us-east-1-aws"

    # FastAPI 설정
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS 설정
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    ALLOWED_HOSTS: list = ["localhost", "127.0.0.1"]

    # 데이터셋 설정
    DATASET_PATH: str = os.getenv("DATASET_PATH", "")

    # 업로드 설정
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".bmp"}

    # 모델 설정
    CLIP_MODEL_NAME: str = "clip-ViT-B-32"
    EMBEDDING_DIMENSION: int = 512

    # 탈모 단계 설명
    STAGE_DESCRIPTIONS: dict = {
        2: "경미한 탈모 - M자 탈모가 시작되거나 이마선이 약간 후퇴",
        3: "초기 탈모 - M자 탈모가 뚜렷해지고 정수리 부분 모발 밀도 감소",
        4: "중기 탈모 - M자 탈모 진행, 정수리 탈모 본격화",
        5: "진행된 탈모 - 앞머리와 정수리 탈모가 연결되기 시작",
        6: "심한 탈모 - 앞머리와 정수리가 완전히 연결되어 하나의 큰 탈모 영역 형성",
        7: "매우 심한 탈모 - 측면과 뒷머리를 제외한 대부분의 모발 손실"
    }

settings = Settings()