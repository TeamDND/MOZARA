"""
탈모 백과 데이터를 Pinecone에 업로드하는 스크립트
C:\Users\301\Desktop\data의 TypeScript 파일을 파싱하여 임베딩 생성 후 업로드
"""
import os
import re
import json
from typing import List, Dict
from dotenv import load_dotenv
from pathlib import Path

# 환경변수 로드
project_root = Path(__file__).parent.parent.parent.parent
env_path = project_root / ".env"
load_dotenv(str(env_path))

from pinecone import Pinecone
from openai import OpenAI

# API 클라이언트 초기화
pinecone_api_key = os.getenv("PINECONE_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

pc = Pinecone(api_key=pinecone_api_key)
openai_client = OpenAI(api_key=openai_api_key)

# Pinecone 인덱스
index_name = "hair-encyclopedia"
index = pc.Index(index_name)

def parse_typescript_articles(file_path: str) -> List[Dict]:
    """TypeScript 파일에서 아티클 데이터 추출"""
    print(f"Parsing TypeScript file: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # hairLossArticles 배열 찾기
    pattern = r'export const hairLossArticles.*?=\s*\[(.*?)\];'
    match = re.search(pattern, content, re.DOTALL)

    if not match:
        print("Could not find hairLossArticles array")
        return []

    articles_text = match.group(1)

    # 개별 아티클 객체 추출 (간단한 파싱)
    articles = []

    # { 로 시작하는 객체들 찾기
    article_pattern = r'\{[^}]*id:\s*[\'"]([^\'"]+)[\'"][^}]*title:\s*[\'"]([^\'"]+)[\'"][^}]*content:\s*`([^`]+)`[^}]*\}'

    for match in re.finditer(article_pattern, articles_text, re.DOTALL):
        article_id = match.group(1)
        title = match.group(2)
        content = match.group(3).strip()

        # 간단한 정리
        content = content.replace('\\n', '\n')
        content = re.sub(r'\s+', ' ', content)  # 여러 공백을 하나로

        articles.append({
            'id': article_id,
            'title': title,
            'content': content
        })

    print(f"Found {len(articles)} articles")
    return articles

def chunk_text(text: str, max_length: int = 1000) -> List[str]:
    """긴 텍스트를 적절한 크기로 분할"""
    # 줄바꿈 기준으로 먼저 분리
    paragraphs = text.split('\n')

    chunks = []
    current_chunk = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(current_chunk) + len(para) < max_length:
            current_chunk += para + "\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para + "\n"

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

def create_embeddings(texts: List[str]) -> List[List[float]]:
    """OpenAI API로 임베딩 생성"""
    print(f"Creating embeddings for {len(texts)} texts...")

    embeddings = []
    batch_size = 100

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")

        response = openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=batch
        )

        for item in response.data:
            embeddings.append(item.embedding)

    return embeddings

def upload_to_pinecone(articles: List[Dict]):
    """아티클을 Pinecone에 업로드"""
    print(f"Uploading {len(articles)} articles to Pinecone...")

    vectors = []
    texts_to_embed = []
    metadata_list = []

    for article in articles:
        article_id = article['id']
        title = article['title']
        content = article['content']

        # 긴 콘텐츠는 청크로 분할
        chunks = chunk_text(content, max_length=1500)

        for chunk_idx, chunk in enumerate(chunks):
            # 임베딩할 텍스트 (제목 + 내용)
            text_to_embed = f"{title}\n\n{chunk}"
            texts_to_embed.append(text_to_embed)

            # 메타데이터
            metadata = {
                'article_id': article_id,
                'title': title,
                'text': chunk,
                'chunk_index': chunk_idx,
                'total_chunks': len(chunks)
            }
            metadata_list.append(metadata)

    print(f"Total chunks to upload: {len(texts_to_embed)}")

    # 임베딩 생성
    embeddings = create_embeddings(texts_to_embed)

    # Pinecone에 업로드
    print("Uploading vectors to Pinecone...")
    batch_size = 100

    for i in range(0, len(embeddings), batch_size):
        batch_embeddings = embeddings[i:i+batch_size]
        batch_metadata = metadata_list[i:i+batch_size]

        # 벡터 ID 생성
        batch_vectors = []
        for j, (embedding, metadata) in enumerate(zip(batch_embeddings, batch_metadata)):
            vector_id = f"{metadata['article_id']}_chunk_{metadata['chunk_index']}"
            batch_vectors.append({
                'id': vector_id,
                'values': embedding,
                'metadata': metadata
            })

        index.upsert(vectors=batch_vectors)
        print(f"Uploaded batch {i//batch_size + 1}/{(len(embeddings)-1)//batch_size + 1}")

    print(f"Upload complete! Total vectors: {len(embeddings)}")

def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("탈모 백과 데이터 Pinecone 업로드 시작")
    print("=" * 60)

    # 데이터 파일 경로
    data_file = "C:/Users/301/Desktop/data/articles.ts"

    if not os.path.exists(data_file):
        print(f"Error: Data file not found: {data_file}")
        return

    # 1. TypeScript 파일 파싱
    articles = parse_typescript_articles(data_file)

    if not articles:
        print("No articles found. Exiting.")
        return

    print(f"\nFound {len(articles)} articles")
    print(f"Sample article: {articles[0]['title']}")

    # 2. Pinecone에 업로드
    upload_to_pinecone(articles)

    # 3. 업로드 결과 확인
    print("\n" + "=" * 60)
    print("Upload Results:")
    print("=" * 60)
    stats = index.describe_index_stats()
    print(f"Total vectors in index: {stats.get('total_vector_count', 0)}")
    print(f"Dimension: {stats.get('dimension', 0)}")

    print("\nDone!")

if __name__ == "__main__":
    main()