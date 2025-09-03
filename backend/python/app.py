#임시파일
from fastapi import FastAPI
import weaviate

app = FastAPI()

@app.get("/")
def home():
    client = weaviate.Client("http://weaviate:8080")  # docker 네트워크 내부 주소
    return {"weaviate_ready": client.is_ready()}