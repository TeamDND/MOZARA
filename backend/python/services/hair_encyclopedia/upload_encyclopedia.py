# -*- coding: utf-8 -*-
"""
Upload hair loss encyclopedia data to Pinecone
Parse TypeScript files and create embeddings
"""
import os
import re
import json
from typing import List, Dict
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv("../../../../.env")
load_dotenv("../../.env")

from pinecone import Pinecone
from openai import OpenAI

# Initialize API clients
pinecone_api_key = os.getenv("PINECONE_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

pc = Pinecone(api_key=pinecone_api_key)
openai_client = OpenAI(api_key=openai_api_key)

# Pinecone index
index_name = "hair-encyclopedia"
index = pc.Index(index_name)

def parse_typescript_articles(file_path: str) -> List[Dict]:
    """Extract article data from TypeScript file"""
    print(f"Parsing TypeScript file: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find hairLossArticles array
    pattern = r'export const hairLossArticles.*?=\s*\[(.*?)\];'
    match = re.search(pattern, content, re.DOTALL)

    if not match:
        print("Could not find hairLossArticles array")
        return []

    articles_text = match.group(1)

    # Extract individual article objects
    articles = []

    # Find objects starting with {
    article_pattern = r'\{[^}]*id:\s*[\'"]([^\'"]+)[\'"][^}]*title:\s*[\'"]([^\'"]+)[\'"][^}]*content:\s*`([^`]+)`[^}]*\}'

    for match in re.finditer(article_pattern, articles_text, re.DOTALL):
        article_id = match.group(1)
        title = match.group(2)
        content = match.group(3).strip()

        # Clean up content
        content = content.replace('\\n', '\n')
        content = re.sub(r'\s+', ' ', content)

        articles.append({
            'id': article_id,
            'title': title,
            'content': content
        })

    print(f"Found {len(articles)} articles")
    return articles

def chunk_text(text: str, max_length: int = 1000) -> List[str]:
    """Split long text into appropriate chunks"""
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
    """Create embeddings using OpenAI API"""
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
    """Upload articles to Pinecone"""
    print(f"Uploading {len(articles)} articles to Pinecone...")

    vectors = []
    texts_to_embed = []
    metadata_list = []

    for article in articles:
        article_id = article['id']
        title = article['title']
        content = article['content']

        # Split long content into chunks
        chunks = chunk_text(content, max_length=1500)

        for chunk_idx, chunk in enumerate(chunks):
            # Text to embed (title + content)
            text_to_embed = f"{title}\n\n{chunk}"
            texts_to_embed.append(text_to_embed)

            # Metadata
            metadata = {
                'article_id': article_id,
                'title': title,
                'text': chunk,
                'chunk_index': chunk_idx,
                'total_chunks': len(chunks),
                'source': 'hair-encyclopedia'
            }
            metadata_list.append(metadata)

    print(f"Total chunks to upload: {len(texts_to_embed)}")

    # Create embeddings
    embeddings = create_embeddings(texts_to_embed)

    # Upload to Pinecone
    print("Uploading vectors to Pinecone...")
    batch_size = 100

    for i in range(0, len(embeddings), batch_size):
        batch_embeddings = embeddings[i:i+batch_size]
        batch_metadata = metadata_list[i:i+batch_size]

        # Generate vector IDs
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
    """Main execution function"""
    print("=" * 60)
    print("Starting upload of hair encyclopedia data to Pinecone")
    print("=" * 60)

    # Data file path
    data_file = "C:/Users/301/Desktop/data/articles.ts"

    if not os.path.exists(data_file):
        print(f"Error: Data file not found: {data_file}")
        return

    # 1. Parse TypeScript file
    articles = parse_typescript_articles(data_file)

    if not articles:
        print("No articles found. Exiting.")
        return

    print(f"\nFound {len(articles)} articles")
    if articles:
        print(f"Sample article: {articles[0]['title']}")

    # 2. Upload to Pinecone
    upload_to_pinecone(articles)

    # 3. Check upload results
    print("\n" + "=" * 60)
    print("Upload Results:")
    print("=" * 60)
    stats = index.describe_index_stats()
    print(f"Total vectors in index: {stats.get('total_vector_count', 0)}")
    print(f"Dimension: {stats.get('dimension', 0)}")

    print("\nDone!")

if __name__ == "__main__":
    main()