"""
단일 이미지로 빠른 성능 테스트 (삭제 후)
"""
import os
import sys
import json
import time
import numpy as np
from pathlib import Path
from PIL import Image, ImageEnhance
import torch
import torchvision.transforms as T
import timm
from dotenv import load_dotenv

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import Pinecone

# 설정
ENV_PATH = r"C:\Users\301\Desktop\main_project\.env"
TEST_ROOT = Path(r"C:\Users\301\Desktop\classification_test")

def enhance_image(img: Image.Image) -> Image.Image:
    img = ImageEnhance.Sharpness(img).enhance(1.05)
    img = ImageEnhance.Contrast(img).enhance(1.05)
    img = ImageEnhance.Brightness(img).enhance(1.03)
    img = ImageEnhance.Color(img).enhance(1.03)
    return img

def tf_vit():
    return T.Compose([
        T.Resize(224, interpolation=T.InterpolationMode.BICUBIC),
        T.CenterCrop(224),
        T.ToTensor(),
        T.Normalize((0.485,0.456,0.406),(0.229,0.224,0.225)),
    ])

def tf_conv():
    return T.Compose([
        T.Resize(384, interpolation=T.InterpolationMode.BICUBIC),
        T.CenterCrop(384),
        T.ToTensor(),
        T.Normalize((0.485,0.456,0.406),(0.229,0.224,0.225)),
    ])

def embed(img: Image.Image, model, transform) -> np.ndarray:
    if img.mode != "RGB":
        img = img.convert("RGB")
    img = enhance_image(img)
    x = transform(img).unsqueeze(0)
    with torch.no_grad():
        z = model(x).cpu().numpy()[0]
    z = z / (np.linalg.norm(z) + 1e-12)
    return z

def knn_to_probs(matches, num_classes=6, T=0.20):
    if not matches:
        return np.zeros(num_classes, dtype=float)
    sims = np.array([m["score"] for m in matches], float)
    w = np.exp(sims / T)
    w = w / (w.sum() + 1e-12)
    probs = np.zeros(num_classes, float)
    for wi, m in zip(w, matches):
        md = m.get("metadata", {})
        if "stage" in md:
            st = int(md["stage"])
        else:
            st = 2  # default
        if 2 <= st <= 7:
            probs[st-2] += wi
    s = probs.sum()
    return probs / s if s > 0 else probs

def test_single_image():
    """단일 이미지 테스트"""
    load_dotenv(ENV_PATH)

    # Pinecone 초기화
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    idx_conv = pc.Index("hair-loss-rag-analyzer")
    idx_vit = pc.Index("hair-loss-vit-s16")

    # 모델 로드
    device = "cpu"
    vit = timm.create_model("vit_small_patch16_224", pretrained=True, num_classes=0, global_pool="avg").eval().to(device)
    conv = timm.create_model("convnext_large.fb_in22k_ft_in1k_384", pretrained=True, num_classes=0, global_pool="avg").eval().to(device)
    tf_v, tf_c = tf_vit(), tf_conv()

    # 테스트 이미지 찾기 (level_3에서 1개)
    level3_dir = TEST_ROOT / "level_3"
    if not level3_dir.exists():
        print(f"테스트 디렉토리가 없습니다: {level3_dir}")
        return

    test_images = list(level3_dir.glob("*.jpg"))
    if not test_images:
        test_images = list(level3_dir.glob("*.png"))

    if not test_images:
        print("테스트 이미지를 찾을 수 없습니다.")
        return

    test_img = test_images[0]
    print(f"테스트 이미지: {test_img.name}")

    # 예측 수행
    start_time = time.time()

    img = Image.open(test_img)
    vq = embed(img, vit, tf_v)
    cq = embed(img, conv, tf_c)

    # 검색 수행
    r_v = idx_vit.query(vector=vq.tolist(), top_k=10, include_metadata=True)
    r_c = idx_conv.query(vector=cq.tolist(), top_k=10, include_metadata=True)

    # 확률 계산
    p_v = knn_to_probs(r_v.get("matches", []), 6, T=0.20)
    p_c = knn_to_probs(r_c.get("matches", []), 6, T=0.15)

    # 간단한 앙상블 (균등 가중치)
    p_ens = (p_v + p_c) / 2
    pred = int(np.argmax(p_ens)) + 2  # level 2-7

    end_time = time.time()

    print("="*50)
    print("단일 이미지 테스트 결과 (벡터 삭제 후)")
    print("="*50)
    print(f"실제 레벨: 3")
    print(f"예측 레벨: {pred}")
    print(f"예측 정확: {'✅' if pred == 3 else '❌'}")
    print(f"처리 시간: {end_time - start_time:.3f}초")
    print()
    print("각 레벨별 확률:")
    for i, prob in enumerate(p_ens):
        level = i + 2
        print(f"  Level {level}: {prob:.4f}")
    print()
    print("ConvNeXt 검색 결과:")
    for i, match in enumerate(r_c.get("matches", [])[:3]):
        md = match.get("metadata", {})
        filename = md.get("filename", "unknown")
        stage = md.get("stage", "?")
        score = match.get("score", 0)
        print(f"  {i+1}. {filename} (stage={stage}, score={score:.4f})")

    print("\nViT 검색 결과:")
    for i, match in enumerate(r_v.get("matches", [])[:3]):
        md = match.get("metadata", {})
        filename = md.get("filename", "unknown")
        stage = md.get("stage", "?")
        score = match.get("score", 0)
        print(f"  {i+1}. {filename} (stage={stage}, score={score:.4f})")

if __name__ == "__main__":
    test_single_image()