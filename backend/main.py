import os
import requests
import xml.etree.ElementTree as ET
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional

load_dotenv()

app = FastAPI(title="MOZARA Product Search API", version="1.0.0")

# 프론트엔드와 백엔드 간 통신을 위한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://192.168.0.72:3000",  # 프론트엔드 실제 IP 주소 추가
        "http://192.168.0.72:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# .env 파일에서 API 키를 안전하게 불러옵니다.
ELEVEN_ST_API_KEY = os.getenv("ELEVEN_ST_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080/api")
BASE_URL = 'https://openapi.11st.co.kr/openapi/OpenApiService.tmall'

# 탈모 단계별 제품 데이터 구조
HAIR_LOSS_STAGE_PRODUCTS = {
    1: [  # 1단계: 초기 탈모 (예방 중심)
        {
            "productId": "stage1-1",
            "productName": "두피 건강 샴푸",
            "productPrice": 18000,
            "productRating": 4.5,
            "productReviewCount": 234,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage1-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "두피케어",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "예방용",
            "category4": "1단계",
            "description": "두피 건강을 위한 예방 중심 샴푸",
            "ingredients": ["케라틴", "비오틴", "판테놀"],
            "suitableStages": [1, 2]
        },
        {
            "productId": "stage1-2",
            "productName": "두피 토닉",
            "productPrice": 22000,
            "productRating": 4.3,
            "productReviewCount": 189,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage1-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "두피케어",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "예방용",
            "category4": "1단계",
            "description": "두피 순환을 개선하는 토닉",
            "ingredients": ["민들레 추출물", "로즈마리", "멘톨"],
            "suitableStages": [1, 2]
        },
        {
            "productId": "stage1-3",
            "productName": "비오틴 영양제",
            "productPrice": 35000,
            "productRating": 4.7,
            "productReviewCount": 156,
            "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage1-3",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "두피케어",
            "category1": "헤어케어",
            "category2": "영양제",
            "category3": "비오틴",
            "category4": "1단계",
            "description": "모발 건강을 위한 비오틴 영양제",
            "ingredients": ["비오틴", "아연", "셀레늄"],
            "suitableStages": [1, 2, 3]
        },
        {
            "productId": "stage1-4",
            "productName": "두피 마사지기",
            "productPrice": 45000,
            "productRating": 4.4,
            "productReviewCount": 123,
            "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage1-4",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "두피케어",
            "category1": "헤어케어",
            "category2": "두피마사지기",
            "category3": "예방용",
            "category4": "1단계",
            "description": "두피 혈액순환을 개선하는 마사지기",
            "ingredients": [],
            "suitableStages": [1, 2, 3]
        }
    ],
    2: [  # 2단계: 경미한 탈모 (강화 중심)
        {
            "productId": "stage2-1",
            "productName": "탈모 방지 샴푸",
            "productPrice": 25000,
            "productRating": 4.6,
            "productReviewCount": 267,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage2-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모케어",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "방지용",
            "category4": "2단계",
            "description": "탈모 진행을 억제하는 강화 샴푸",
            "ingredients": ["케라틴", "아르간 오일", "프로바이오틱스"],
            "suitableStages": [2, 3]
        },
        {
            "productId": "stage2-2",
            "productName": "모발 강화 토닉",
            "productPrice": 28000,
            "productRating": 4.5,
            "productReviewCount": 198,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage2-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모케어",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "강화용",
            "category4": "2단계",
            "description": "모발 뿌리를 강화하는 토닉",
            "ingredients": ["미녹시딜", "케라틴", "아미노산"],
            "suitableStages": [2, 3]
        },
        {
            "productId": "stage2-3",
            "productName": "헤어 세럼",
            "productPrice": 32000,
            "productRating": 4.7,
            "productReviewCount": 189,
            "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage2-3",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모케어",
            "category1": "헤어케어",
            "category2": "헤어세럼",
            "category3": "강화용",
            "category4": "2단계",
            "description": "모발 성장을 촉진하는 세럼",
            "ingredients": ["펩타이드", "케라틴", "비타민 E"],
            "suitableStages": [2, 3, 4]
        },
        {
            "productId": "stage2-4",
            "productName": "모발 영양제",
            "productPrice": 42000,
            "productRating": 4.6,
            "productReviewCount": 145,
            "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage2-4",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모케어",
            "category1": "헤어케어",
            "category2": "모발영양제",
            "category3": "강화용",
            "category4": "2단계",
            "description": "모발 건강을 위한 종합 영양제",
            "ingredients": ["비오틴", "아연", "철분", "비타민 D"],
            "suitableStages": [2, 3, 4]
        }
    ],
    3: [  # 3단계: 중등도 탈모 (치료 중심)
        {
            "productId": "stage3-1",
            "productName": "탈모 치료 샴푸",
            "productPrice": 35000,
            "productRating": 4.8,
            "productReviewCount": 312,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage3-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모치료",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "치료용",
            "category4": "3단계",
            "description": "탈모 진행을 억제하는 치료 샴푸",
            "ingredients": ["케토코나졸", "케라틴", "아르간 오일"],
            "suitableStages": [3, 4]
        },
        {
            "productId": "stage3-2",
            "productName": "미녹시딜 토닉",
            "productPrice": 45000,
            "productRating": 4.9,
            "productReviewCount": 278,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage3-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모치료",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "치료용",
            "category4": "3단계",
            "description": "모발 성장을 촉진하는 미녹시딜 토닉",
            "ingredients": ["미녹시딜 5%", "케라틴", "아미노산"],
            "suitableStages": [3, 4, 5]
        },
        {
            "productId": "stage3-3",
            "productName": "두피 치료 세럼",
            "productPrice": 55000,
            "productRating": 4.7,
            "productReviewCount": 234,
            "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage3-3",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모치료",
            "category1": "헤어케어",
            "category2": "헤어세럼",
            "category3": "치료용",
            "category4": "3단계",
            "description": "두피 건강을 개선하는 치료 세럼",
            "ingredients": ["펩타이드", "케라틴", "비타민 E", "아르간 오일"],
            "suitableStages": [3, 4, 5]
        },
        {
            "productId": "stage3-4",
            "productName": "모발 강화 영양제",
            "productPrice": 58000,
            "productRating": 4.8,
            "productReviewCount": 189,
            "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage3-4",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모치료",
            "category1": "헤어케어",
            "category2": "모발영양제",
            "category3": "치료용",
            "category4": "3단계",
            "description": "모발 성장을 촉진하는 강화 영양제",
            "ingredients": ["비오틴", "아연", "철분", "비타민 D", "오메가3"],
            "suitableStages": [3, 4, 5]
        }
    ],
    4: [  # 4단계: 심한 탈모 (집중 치료)
        {
            "productId": "stage4-1",
            "productName": "강력 탈모 치료 샴푸",
            "productPrice": 45000,
            "productRating": 4.9,
            "productReviewCount": 345,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage4-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "강력탈모치료",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "강력치료용",
            "category4": "4단계",
            "description": "심한 탈모를 위한 강력 치료 샴푸",
            "ingredients": ["케토코나졸 2%", "케라틴", "아르간 오일", "프로바이오틱스"],
            "suitableStages": [4, 5]
        },
        {
            "productId": "stage4-2",
            "productName": "고농도 미녹시딜 토닉",
            "productPrice": 65000,
            "productRating": 4.9,
            "productReviewCount": 298,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage4-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "강력탈모치료",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "강력치료용",
            "category4": "4단계",
            "description": "고농도 미녹시딜로 모발 성장 촉진",
            "ingredients": ["미녹시딜 10%", "케라틴", "아미노산", "펩타이드"],
            "suitableStages": [4, 5, 6]
        },
        {
            "productId": "stage4-3",
            "productName": "두피 집중 치료 세럼",
            "productPrice": 75000,
            "productRating": 4.8,
            "productReviewCount": 267,
            "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage4-3",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "강력탈모치료",
            "category1": "헤어케어",
            "category2": "헤어세럼",
            "category3": "강력치료용",
            "category4": "4단계",
            "description": "두피 건강을 집중적으로 개선하는 세럼",
            "ingredients": ["펩타이드", "케라틴", "비타민 E", "아르간 오일", "프로바이오틱스"],
            "suitableStages": [4, 5, 6]
        },
        {
            "productId": "stage4-4",
            "productName": "프리미엄 모발 영양제",
            "productPrice": 78000,
            "productRating": 4.9,
            "productReviewCount": 223,
            "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage4-4",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "강력탈모치료",
            "category1": "헤어케어",
            "category2": "모발영양제",
            "category3": "강력치료용",
            "category4": "4단계",
            "description": "모발 성장을 극대화하는 프리미엄 영양제",
            "ingredients": ["비오틴", "아연", "철분", "비타민 D", "오메가3", "콜라겐"],
            "suitableStages": [4, 5, 6]
        }
    ],
    5: [  # 5단계: 매우 심한 탈모 (전문 치료)
        {
            "productId": "stage5-1",
            "productName": "전문가용 탈모 치료 샴푸",
            "productPrice": 65000,
            "productRating": 4.9,
            "productReviewCount": 378,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage5-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "전문탈모치료",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "전문치료용",
            "category4": "5단계",
            "description": "전문가 처방용 탈모 치료 샴푸",
            "ingredients": ["케토코나졸 2%", "케라틴", "아르간 오일", "프로바이오틱스", "펩타이드"],
            "suitableStages": [5, 6]
        },
        {
            "productId": "stage5-2",
            "productName": "최고농도 미녹시딜 솔루션",
            "productPrice": 85000,
            "productRating": 4.9,
            "productReviewCount": 312,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage5-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "전문탈모치료",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "전문치료용",
            "category4": "5단계",
            "description": "최고농도 미녹시딜로 모발 성장 극대화",
            "ingredients": ["미녹시딜 15%", "케라틴", "아미노산", "펩타이드", "비타민 E"],
            "suitableStages": [5, 6]
        },
        {
            "productId": "stage5-3",
            "productName": "두피 전문 치료 세럼",
            "productPrice": 95000,
            "productRating": 4.8,
            "productReviewCount": 289,
            "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage5-3",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "전문탈모치료",
            "category1": "헤어케어",
            "category2": "헤어세럼",
            "category3": "전문치료용",
            "category4": "5단계",
            "description": "두피 건강을 전문적으로 개선하는 세럼",
            "ingredients": ["펩타이드", "케라틴", "비타민 E", "아르간 오일", "프로바이오틱스", "콜라겐"],
            "suitableStages": [5, 6]
        },
        {
            "productId": "stage5-4",
            "productName": "프로페시아 영양제",
            "productPrice": 120000,
            "productRating": 4.9,
            "productReviewCount": 256,
            "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage5-4",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "전문탈모치료",
            "category1": "헤어케어",
            "category2": "모발영양제",
            "category3": "전문치료용",
            "category4": "5단계",
            "description": "전문가 처방용 프로페시아 영양제",
            "ingredients": ["피나스테리드", "비오틴", "아연", "철분", "비타민 D", "오메가3"],
            "suitableStages": [5, 6]
        }
    ],
    6: [  # 6단계: 극심한 탈모 (의료진 상담 필수)
        {
            "productId": "stage6-1",
            "productName": "의료진 처방 탈모 치료 샴푸",
            "productPrice": 85000,
            "productRating": 4.9,
            "productReviewCount": 401,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage6-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "의료진처방",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "의료진처방용",
            "category4": "6단계",
            "description": "의료진 처방용 탈모 치료 샴푸",
            "ingredients": ["케토코나졸 2%", "케라틴", "아르간 오일", "프로바이오틱스", "펩타이드", "콜라겐"],
            "suitableStages": [6]
        },
        {
            "productId": "stage6-2",
            "productName": "의료진 처방 미녹시딜 솔루션",
            "productPrice": 120000,
            "productRating": 4.9,
            "productReviewCount": 334,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage6-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "의료진처방",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "의료진처방용",
            "category4": "6단계",
            "description": "의료진 처방용 최고농도 미녹시딜 솔루션",
            "ingredients": ["미녹시딜 20%", "케라틴", "아미노산", "펩타이드", "비타민 E", "콜라겐"],
            "suitableStages": [6]
        },
        {
            "productId": "stage6-3",
            "productName": "의료진 처방 두피 치료 세럼",
            "productPrice": 150000,
            "productRating": 4.8,
            "productReviewCount": 298,
            "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage6-3",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "의료진처방",
            "category1": "헤어케어",
            "category2": "헤어세럼",
            "category3": "의료진처방용",
            "category4": "6단계",
            "description": "의료진 처방용 두피 전문 치료 세럼",
            "ingredients": ["펩타이드", "케라틴", "비타민 E", "아르간 오일", "프로바이오틱스", "콜라겐", "스테로이드"],
            "suitableStages": [6]
        },
        {
            "productId": "stage6-4",
            "productName": "의료진 처방 프로페시아",
            "productPrice": 180000,
            "productRating": 4.9,
            "productReviewCount": 267,
            "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage6-4",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "의료진처방",
            "category1": "헤어케어",
            "category2": "모발영양제",
            "category3": "의료진처방용",
            "category4": "6단계",
            "description": "의료진 처방용 프로페시아 (피나스테리드)",
            "ingredients": ["피나스테리드 1mg", "비오틴", "아연", "철분", "비타민 D", "오메가3", "콜라겐"],
            "suitableStages": [6]
        }
    ]
}

def parse_xml_to_json(xml_string: str) -> Dict[str, Any]:
    """11번가 API의 XML 응답을 JSON으로 변환합니다."""
    try:
        root = ET.fromstring(xml_string)
        products = []
        
        product_nodes = root.findall('.//Product')
        for product in product_nodes:
            # XML 요소가 존재하는지 확인하고 안전하게 추출
            product_code = product.find('ProductCode').text if product.find('ProductCode') is not None else ""
            
            # 11번가 제품 URL 생성 (ProductCode 기반)
            product_url = ""
            if product_code:
                product_url = f"https://www.11st.co.kr/products/{product_code}"
            
            # 가격 안전하게 파싱
            try:
                sale_price_elem = product.find('SalePrice')
                product_price = int(sale_price_elem.text) if sale_price_elem is not None and sale_price_elem.text else 0
            except (ValueError, TypeError):
                product_price = 0
            
            # 리뷰 수 안전하게 파싱
            try:
                review_count_elem = product.find('ReviewCount')
                review_count = int(review_count_elem.text) if review_count_elem is not None and review_count_elem.text else 0
            except (ValueError, TypeError):
                review_count = 0
            
            product_data = {
                "productId": product_code,
                "productName": product.find('ProductName').text if product.find('ProductName') is not None else "",
                "productPrice": product_price,
                "productImage": product.find('ProductImage300').text if product.find('ProductImage300') is not None else "",
                "productUrl": product_url,
                "productRating": 4.5,  # 기본값 설정 (실제 API에서는 평점 정보가 제한적)
                "productReviewCount": review_count,
                "mallName": "11번가",
                "maker": product.find('SellerNick').text if product.find('SellerNick') is not None else "",
                "brand": product.find('BrandName').text if product.find('BrandName') is not None else "",
                "category1": product.find('CategoryName1').text if product.find('CategoryName1') is not None else "",
                "category2": product.find('CategoryName2').text if product.find('CategoryName2') is not None else "",
                "category3": product.find('CategoryName3').text if product.find('CategoryName3') is not None else "",
                "category4": product.find('CategoryName4').text if product.find('CategoryName4') is not None else "",
            }
            products.append(product_data)
        
        total_count_node = root.find('.//TotalCount')
        total_count = int(total_count_node.text) if total_count_node is not None and total_count_node.text else 0

        return {"products": products, "totalCount": total_count}
    
    except ET.ParseError as e:
        print(f"XML 파싱 오류: {e}")
        return {"products": [], "totalCount": 0}
    except Exception as e:
        print(f"데이터 변환 오류: {e}")
        return {"products": [], "totalCount": 0}

def get_dummy_data(keyword: str, page: int) -> Dict[str, Any]:
    """API 오류 시 사용할 더미 데이터"""
    # 검색어별로 다른 제품 데이터 생성 (실제 제품 이미지 사용)
    all_products = [
        # 탈모샴푸 관련
        {"productId": "dummy-1", "productName": "탈모샴푸", "productPrice": 15000, "productRating": 4.5, "productReviewCount": 123, "category": "탈모샴푸", "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "탈모샴푸", "category3": "", "category4": ""},
        {"productId": "dummy-2", "productName": "두피케어 샴푸", "productPrice": 25000, "productRating": 4.2, "productReviewCount": 89, "category": "탈모샴푸", "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "탈모샴푸", "category3": "", "category4": ""},
        {"productId": "dummy-3", "productName": "케라틴 샴푸", "productPrice": 18000, "productRating": 4.3, "productReviewCount": 167, "category": "탈모샴푸", "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "탈모샴푸", "category3": "", "category4": ""},
        
        # 헤어토닉 관련
        {"productId": "dummy-4", "productName": "헤어토닉", "productPrice": 22000, "productRating": 4.7, "productReviewCount": 234, "category": "헤어토닉", "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어토닉", "category3": "", "category4": ""},
        {"productId": "dummy-5", "productName": "두피 토닉", "productPrice": 19000, "productRating": 4.4, "productReviewCount": 156, "category": "헤어토닉", "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어토닉", "category3": "", "category4": ""},
        {"productId": "dummy-6", "productName": "모발 강화 토닉", "productPrice": 28000, "productRating": 4.6, "productReviewCount": 189, "category": "헤어토닉", "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어토닉", "category3": "", "category4": ""},
        
        # 비오틴 관련
        {"productId": "dummy-7", "productName": "비오틴", "productPrice": 35000, "productRating": 4.8, "productReviewCount": 256, "category": "비오틴", "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "비오틴", "category3": "", "category4": ""},
        {"productId": "dummy-8", "productName": "비오틴 영양제", "productPrice": 42000, "productRating": 4.5, "productReviewCount": 178, "category": "비오틴", "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "비오틴", "category3": "", "category4": ""},
        {"productId": "dummy-9", "productName": "비오틴 샴푸", "productPrice": 32000, "productRating": 4.3, "productReviewCount": 145, "category": "비오틴", "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "비오틴", "category3": "", "category4": ""},
        
        # 헤어에센스 관련
        {"productId": "dummy-10", "productName": "헤어에센스", "productPrice": 28000, "productRating": 4.6, "productReviewCount": 201, "category": "헤어에센스", "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어에센스", "category3": "", "category4": ""},
        {"productId": "dummy-11", "productName": "모발 에센스", "productPrice": 33000, "productRating": 4.4, "productReviewCount": 167, "category": "헤어에센스", "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어에센스", "category3": "", "category4": ""},
        {"productId": "dummy-12", "productName": "두피 에센스", "productPrice": 26000, "productRating": 4.7, "productReviewCount": 189, "category": "헤어에센스", "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어에센스", "category3": "", "category4": ""},
        
        # 두피케어 관련
        {"productId": "dummy-13", "productName": "두피케어", "productPrice": 55000, "productRating": 4.6, "productReviewCount": 145, "category": "두피케어", "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "두피케어", "category3": "", "category4": ""},
        {"productId": "dummy-14", "productName": "두피 스케일링", "productPrice": 45000, "productRating": 4.5, "productReviewCount": 123, "category": "두피케어", "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "두피케어", "category3": "", "category4": ""},
        {"productId": "dummy-15", "productName": "두피 클렌징", "productPrice": 38000, "productRating": 4.3, "productReviewCount": 156, "category": "두피케어", "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "두피케어", "category3": "", "category4": ""},
        
        # 모발영양제 관련
        {"productId": "dummy-16", "productName": "모발영양제", "productPrice": 42000, "productRating": 4.7, "productReviewCount": 234, "category": "모발영양제", "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "모발영양제", "category3": "", "category4": ""},
        {"productId": "dummy-17", "productName": "헤어 비타민", "productPrice": 35000, "productRating": 4.4, "productReviewCount": 178, "category": "모발영양제", "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "모발영양제", "category3": "", "category4": ""},
        {"productId": "dummy-18", "productName": "모발 강화제", "productPrice": 48000, "productRating": 4.6, "productReviewCount": 201, "category": "모발영양제", "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "모발영양제", "category3": "", "category4": ""},
        
        # 헤어마스크 관련
        {"productId": "dummy-19", "productName": "헤어마스크", "productPrice": 15000, "productRating": 4.5, "productReviewCount": 123, "category": "헤어마스크", "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어마스크", "category3": "", "category4": ""},
        {"productId": "dummy-20", "productName": "모발 마스크", "productPrice": 20000, "productRating": 4.3, "productReviewCount": 145, "category": "헤어마스크", "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어마스크", "category3": "", "category4": ""},
        {"productId": "dummy-21", "productName": "두피 마스크", "productPrice": 18000, "productRating": 4.4, "productReviewCount": 167, "category": "헤어마스크", "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어마스크", "category3": "", "category4": ""},
        
        # 두피마사지기 관련
        {"productId": "dummy-22", "productName": "두피마사지기", "productPrice": 55000, "productRating": 4.6, "productReviewCount": 145, "category": "두피마사지기", "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "두피마사지기", "category3": "", "category4": ""},
        {"productId": "dummy-23", "productName": "헤어 마사지기", "productPrice": 45000, "productRating": 4.5, "productReviewCount": 123, "category": "두피마사지기", "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "두피마사지기", "category3": "", "category4": ""},
        {"productId": "dummy-24", "productName": "모발 마사지기", "productPrice": 38000, "productRating": 4.3, "productReviewCount": 156, "category": "두피마사지기", "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "두피마사지기", "category3": "", "category4": ""},
        
        # 헤어세럼 관련
        {"productId": "dummy-25", "productName": "헤어세럼", "productPrice": 32000, "productRating": 4.7, "productReviewCount": 189, "category": "헤어세럼", "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어세럼", "category3": "", "category4": ""},
        {"productId": "dummy-26", "productName": "모발 세럼", "productPrice": 28000, "productRating": 4.4, "productReviewCount": 167, "category": "헤어세럼", "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어세럼", "category3": "", "category4": ""},
        {"productId": "dummy-27", "productName": "두피 세럼", "productPrice": 35000, "productRating": 4.6, "productReviewCount": 201, "category": "헤어세럼", "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "헤어세럼", "category3": "", "category4": ""},
        
        # 프로페시아 관련
        {"productId": "dummy-28", "productName": "프로페시아", "productPrice": 15000, "productRating": 4.5, "productReviewCount": 123, "category": "프로페시아", "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "프로페시아", "category3": "", "category4": ""},
        {"productId": "dummy-29", "productName": "프로페시아 샴푸", "productPrice": 25000, "productRating": 4.2, "productReviewCount": 89, "category": "프로페시아", "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "프로페시아", "category3": "", "category4": ""},
        {"productId": "dummy-30", "productName": "프로페시아 토닉", "productPrice": 18000, "productRating": 4.3, "productReviewCount": 167, "category": "프로페시아", "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center", "productUrl": f"https://www.11st.co.kr/search/SearchAction.tmall?kwd={keyword}", "mallName": "11번가", "maker": "제조사", "brand": "브랜드", "category1": "헤어케어", "category2": "프로페시아", "category3": "", "category4": ""}
    ]
    
    # 검색어에 따라 필터링
    filtered_products = all_products
    if keyword:
        filtered_products = [p for p in all_products if keyword in p["productName"] or keyword in p["category"]]
    
    # 페이지네이션
    page_size = 5
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    page_products = filtered_products[start_index:end_index]
    
    return {
        "products": page_products,
        "totalCount": len(filtered_products),
        "currentPage": page,
        "pageSize": page_size
    }

@app.get("/api/products/search")
async def search_products(
    keyword: str = Query(..., description="검색 키워드"),
    pageNo: int = Query(1, description="페이지 번호"),
    pageSize: int = Query(5, description="페이지 크기"),
    sortCd: str = Query('sim', description="정렬 코드"),
    minPrice: Optional[int] = Query(None, description="최소 가격"),
    maxPrice: Optional[int] = Query(None, description="최대 가격"),
    categoryId: Optional[str] = Query(None, description="카테고리 ID")
):
    """프론트엔드의 검색 요청을 받아 11번가 API로 전달합니다."""
    
    # API 키가 없으면 더미 데이터 반환
    if not ELEVEN_ST_API_KEY:
        print("API 키가 설정되지 않았습니다. 더미 데이터를 반환합니다.")
        return get_dummy_data(keyword, pageNo)
    
    params = {
        "key": ELEVEN_ST_API_KEY,
        "apiCode": "ProductSearch",
        "keyword": keyword,
        "pageNo": str(pageNo),
        "pageSize": str(pageSize),
        "sortCd": sortCd,
        "option": "Categories"
    }

    if minPrice:
        params["minPrice"] = str(minPrice)
    if maxPrice:
        params["maxPrice"] = str(maxPrice)
    if categoryId:
        params["categoryId"] = categoryId

    try:
        print(f"11번가 API 호출 시작: keyword={keyword}, pageNo={pageNo}")
        response = requests.get(BASE_URL, params=params, timeout=15)
        
        # HTTP 상태 코드 확인
        if response.status_code != 200:
            print(f"HTTP 오류: {response.status_code} - {response.text[:200]}")
            return get_dummy_data(keyword, pageNo)
        
        # 응답 내용 확인
        if not response.text.strip():
            print("빈 응답을 받았습니다.")
            return get_dummy_data(keyword, pageNo)
        
        print(f"API 응답 길이: {len(response.text)} characters")
        
        # XML 파싱 로직 호출
        result = parse_xml_to_json(response.text)
        
        # 결과가 비어있으면 더미 데이터 반환
        if not result["products"]:
            print("파싱된 제품이 없습니다. 더미 데이터를 반환합니다.")
            return get_dummy_data(keyword, pageNo)
        
        print(f"성공: {len(result['products'])}개 제품을 찾았습니다.")
        return result

    except requests.Timeout:
        print("API 호출 타임아웃. 더미 데이터를 반환합니다.")
        return get_dummy_data(keyword, pageNo)
    except requests.ConnectionError:
        print("API 서버 연결 실패. 더미 데이터를 반환합니다.")
        return get_dummy_data(keyword, pageNo)
    except requests.RequestException as e:
        print(f"11번가 API 호출 실패: {e}")
        return get_dummy_data(keyword, pageNo)
    except Exception as e:
        print(f"서버 내부 오류: {e}")
        import traceback
        traceback.print_exc()
        return get_dummy_data(keyword, pageNo)

@app.get("/")
async def root():
    """API 상태 확인"""
    return {"message": "MOZARA Product Search API", "status": "running"}

@app.get("/api/products")
async def get_hair_loss_products(
    stage: int = Query(..., description="탈모 단계 (1-6)", ge=1, le=6)
):
    """탈모 단계별 제품 추천 API"""
    try:
        print(f"탈모 단계별 제품 요청: stage={stage}")
        
        # 단계별 제품 데이터 가져오기
        if stage not in HAIR_LOSS_STAGE_PRODUCTS:
            raise HTTPException(
                status_code=400, 
                detail=f"지원하지 않는 탈모 단계입니다. 1-6단계 중 선택해주세요."
            )
        
        products = HAIR_LOSS_STAGE_PRODUCTS[stage]
        
        # 단계별 설명 추가
        stage_descriptions = {
            1: "초기 탈모 (예방 중심)",
            2: "경미한 탈모 (강화 중심)", 
            3: "중등도 탈모 (치료 중심)",
            4: "심한 탈모 (집중 치료)",
            5: "매우 심한 탈모 (전문 치료)",
            6: "극심한 탈모 (의료진 상담 필수)"
        }
        
        result = {
            "products": products,
            "totalCount": len(products),
            "stage": stage,
            "stageDescription": stage_descriptions[stage],
            "recommendation": f"{stage}단계 탈모에 적합한 {len(products)}개 제품을 추천합니다.",
            "disclaimer": "본 추천은 참고용이며, 정확한 진단과 치료는 전문의 상담이 필요합니다."
        }
        
        print(f"성공: {stage}단계 제품 {len(products)}개 반환")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"탈모 단계별 제품 조회 중 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail="제품 조회 중 오류가 발생했습니다."
        )

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy", "api_key_configured": bool(ELEVEN_ST_API_KEY)}

@app.get("/api/config")
async def get_config():
    """프론트엔드에서 필요한 환경변수 설정 조회"""
    return {
        "apiBaseUrl": API_BASE_URL,
        "youtubeApiKey": YOUTUBE_API_KEY if YOUTUBE_API_KEY else None,
        "hasYouTubeKey": bool(YOUTUBE_API_KEY),
    }

@app.get("/api/11st/products")
async def get_11st_products(
    keyword: str = Query(..., description="검색 키워드"),
    page: int = Query(1, description="페이지 번호", ge=1),
    pageSize: int = Query(20, description="페이지 크기", ge=1, le=100)
):
    """11번가 제품 검색 API"""
    try:
        print(f"11번가 제품 검색 요청: keyword={keyword}, page={page}, pageSize={pageSize}")
        
        # 11번가 API 호출
        api_url = f"{BASE_URL}?key={ELEVEN_ST_API_KEY}&apiCode=ProductSearch&keyword={keyword}&pageNum={page}&pageSize={pageSize}"
        
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        
        # XML 파싱
        root = ET.fromstring(response.content)
        
        products = []
        for product in root.findall('.//Product'):
            try:
                product_data = {
                    "productId": product.find('ProductCode').text if product.find('ProductCode') is not None else "",
                    "productName": product.find('ProductName').text if product.find('ProductName') is not None else "",
                    "productPrice": int(product.find('ProductPrice').text) if product.find('ProductPrice') is not None and product.find('ProductPrice').text.isdigit() else 0,
                    "productRating": float(product.find('ReviewRating').text) if product.find('ReviewRating') is not None and product.find('ReviewRating').text.replace('.', '').isdigit() else 0.0,
                    "productReviewCount": int(product.find('ReviewCount').text) if product.find('ReviewCount') is not None and product.find('ReviewCount').text.isdigit() else 0,
                    "productImage": product.find('ProductImage').text if product.find('ProductImage') is not None else "",
                    "productUrl": product.find('ProductUrl').text if product.find('ProductUrl') is not None else "",
                    "mallName": "11번가",
                    "maker": product.find('Maker').text if product.find('Maker') is not None else "",
                    "brand": product.find('Brand').text if product.find('Brand') is not None else "",
                    "category1": product.find('CategoryName1').text if product.find('CategoryName1') is not None else "",
                    "category2": product.find('CategoryName2').text if product.find('CategoryName2') is not None else "",
                    "category3": product.find('CategoryName3').text if product.find('CategoryName3') is not None else "",
                    "category4": product.find('CategoryName4').text if product.find('CategoryName4') is not None else "",
                    "description": product.find('ProductName').text if product.find('ProductName') is not None else "",
                    "ingredients": [],
                    "suitableStages": [1, 2, 3, 4, 5, 6]  # 기본값
                }
                products.append(product_data)
            except Exception as e:
                print(f"제품 데이터 파싱 오류: {e}")
                continue
        
        result = {
            "products": products,
            "totalCount": len(products),
            "page": page,
            "pageSize": pageSize,
            "keyword": keyword,
            "source": "11번가"
        }
        
        print(f"성공: 11번가에서 {len(products)}개 제품 조회")
        return result
        
    except requests.RequestException as e:
        print(f"11번가 API 호출 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail="11번가 API 호출 중 오류가 발생했습니다."
        )
    except ET.ParseError as e:
        print(f"XML 파싱 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail="응답 데이터 파싱 중 오류가 발생했습니다."
        )
    except Exception as e:
        print(f"11번가 제품 검색 중 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="제품 검색 중 오류가 발생했습니다."
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
