# -*- coding: utf-8 -*-
import os
import json
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv("../../../../.env")

from pinecone import Pinecone
from openai import OpenAI
import time

# Initialize
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
index = pc.Index("hair-encyclopedia")

def parse_typescript_better(file_path: str) -> List[Dict]:
    """Better TypeScript parser"""
    print(f"Parsing: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by article objects
    articles = []

    # Find all {  } blocks
    lines = content.split('\n')
    current_article = {}
    in_content = False
    content_lines = []
    brace_count = 0
    in_article = False

    for line in lines:
        # Start of article
        if 'id:' in line and not in_article:
            in_article = True
            current_article = {}
            # Extract id
            if "id: '" in line or 'id: "' in line:
                id_match = line.split("id:")[1].strip().strip("',\"")
                current_article['id'] = id_match

        # Extract title
        if in_article and 'title:' in line:
            if "title: '" in line or 'title: "' in line:
                title_match = line.split("title:")[1].strip().strip("',\"")
                current_article['title'] = title_match

        # Start of content
        if in_article and 'content: `' in line:
            in_content = True
            content_lines = []
            continue

        # End of content
        if in_content and '`,' in line:
            in_content = False
            current_article['content'] = '\n'.join(content_lines)
            continue

        # Collect content lines
        if in_content:
            content_lines.append(line)

        # End of article
        if in_article and line.strip() == '},':
            if 'id' in current_article and 'title' in current_article and 'content' in current_article:
                articles.append(current_article.copy())
            in_article = False
            current_article = {}

    print(f"Parsed {len(articles)} articles")
    return articles

def chunk_text(text: str, max_length: int = 1500) -> List[str]:
    """Split text into chunks"""
    if len(text) <= max_length:
        return [text]

    # Split by paragraphs
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]

    chunks = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) < max_length:
            current += para + "\n\n"
        else:
            if current:
                chunks.append(current.strip())
            current = para + "\n\n"

    if current:
        chunks.append(current.strip())

    return chunks

def create_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Create embeddings"""
    print(f"Creating {len(texts)} embeddings...")

    embeddings = []
    batch_size = 100

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        print(f"Batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")

        response = openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=batch
        )

        for item in response.data:
            embeddings.append(item.embedding)

        time.sleep(0.5)  # Rate limiting

    return embeddings

def upload_articles(articles: List[Dict]):
    """Upload to Pinecone"""
    print(f"\nUploading {len(articles)} articles...")

    all_texts = []
    all_metadata = []

    for article in articles:
        chunks = chunk_text(article['content'], max_length=1500)

        for idx, chunk in enumerate(chunks):
            # Title + content for embedding
            text = f"{article['title']}\n\n{chunk}"
            all_texts.append(text)

            # Metadata
            all_metadata.append({
                'article_id': article['id'],
                'title': article['title'],
                'text': chunk,
                'chunk_index': idx,
                'total_chunks': len(chunks),
                'source': 'hair-encyclopedia'
            })

    print(f"Total chunks: {len(all_texts)}")

    # Create embeddings
    embeddings = create_embeddings_batch(all_texts)

    # Upload to Pinecone
    print("\nUploading to Pinecone...")
    batch_size = 100

    for i in range(0, len(embeddings), batch_size):
        batch_emb = embeddings[i:i+batch_size]
        batch_meta = all_metadata[i:i+batch_size]

        vectors = []
        for j, (emb, meta) in enumerate(zip(batch_emb, batch_meta)):
            vec_id = f"{meta['article_id']}_chunk_{meta['chunk_index']}"
            vectors.append({
                'id': vec_id,
                'values': emb,
                'metadata': meta
            })

        index.upsert(vectors=vectors)
        print(f"Uploaded {i+len(vectors)}/{len(embeddings)}")
        time.sleep(0.5)

    print(f"\nUpload complete! {len(embeddings)} vectors uploaded")

def main():
    print("=" * 60)
    print("Hair Encyclopedia Upload to Pinecone")
    print("=" * 60)

    data_file = "C:/Users/301/Desktop/data/articles.ts"

    if not os.path.exists(data_file):
        print(f"File not found: {data_file}")
        return

    # Parse
    articles = parse_typescript_better(data_file)

    if not articles:
        print("No articles found")
        return

    print(f"\nSample: {articles[0]['title']}")
    print(f"Content length: {len(articles[0]['content'])}")

    # Upload
    upload_articles(articles)

    # Check results
    print("\n" + "=" * 60)
    stats = index.describe_index_stats()
    print(f"Total vectors: {stats.get('total_vector_count', 0)}")
    print("=" * 60)

if __name__ == "__main__":
    main()