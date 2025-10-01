import os
import requests
import xml.etree.ElementTree as ET
import urllib.parse
from datetime import datetime
from typing import Dict, Any, List

from .products_data import HAIR_LOSS_STAGE_PRODUCTS, STAGE_DESCRIPTIONS


def get_product_image_url(product) -> str:
    """11번가 제품 이미지 URL 처리"""
    try:
        # 11번가 API에서 이미지 URL 가져오기
        image_element = product.find('ProductImage')
        if image_element is not None and image_element.text:
            image_url = image_element.text.strip()
            
            # 이미지 URL 유효성 검증
            if image_url and image_url.startswith(('http://', 'https://')):
                # 11번가 이미지 URL 최적화 (크기 조정)
                if '11st.co.kr' in image_url:
                    # 11번가 이미지 URL에 크기 파라미터 추가
                    if '?' in image_url:
                        image_url += '&w=300&h=300&fit=crop'
                    else:
                        image_url += '?w=300&h=300&fit=crop'
                
                return image_url
        
        # 대체 이미지 필드 확인
        for alt_field in ['ProductImageLarge', 'ProductImageSmall', 'ImageUrl']:
            alt_element = product.find(alt_field)
            if alt_element is not None and alt_element.text:
                alt_url = alt_element.text.strip()
                if alt_url and alt_url.startswith(('http://', 'https://')):
                    return alt_url
        
        # 모든 방법이 실패하면 기본 이미지 반환
        return "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&crop=center"
        
    except Exception as e:
        print(f"이미지 URL 처리 중 오류: {e}")
        return "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&crop=center"


def get_products_by_stage(stage: int) -> list:
    if stage not in HAIR_LOSS_STAGE_PRODUCTS:
        raise ValueError("지원하지 않는 탈모 단계입니다. 0-3단계 중 선택해주세요.")
    return HAIR_LOSS_STAGE_PRODUCTS[stage]


def build_stage_response(stage: int) -> Dict[str, Any]:
    products = get_products_by_stage(stage)
    return {
        "products": products,
        "totalCount": len(products),
        "stage": stage,
        "stageDescription": STAGE_DESCRIPTIONS[stage],
        "recommendation": f"{stage}단계 탈모에 적합한 {len(products)}개 제품을 추천합니다.",
        "disclaimer": "본 추천은 참고용이며, 정확한 진단과 치료는 전문의 상담이 필요합니다.",
        "timestamp": datetime.now().isoformat(),
    }


def search_11st_products(keyword: str, page: int = 1, pageSize: int = 20) -> Dict[str, Any]:
    """11번가 제품 검색"""
    try:
        print(f"11번가 제품 검색 요청: keyword={keyword}, page={page}, pageSize={pageSize}")
        
        # 11번가 API 키 확인
        eleven_st_api_key = os.getenv("ELEVEN_ST_API_KEY")
        if not eleven_st_api_key:
            # API 키가 없으면 더미 데이터 반환
            dummy_products = [
                {
                    "productId": f"dummy-{i}",
                    "productName": f"{keyword} 관련 제품 {i}",
                    "productPrice": 15000 + (i * 5000),
                    "productRating": 4.0 + (i * 0.1),
                    "productReviewCount": 100 + (i * 50),
                    "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&crop=center",
                    "productUrl": f"https://www.11st.co.kr/products/dummy-{i}",
                    "mallName": "11번가",
                    "maker": "제조사",
                    "brand": "브랜드",
                    "category1": "헤어케어",
                    "category2": "탈모제품",
                    "category3": "",
                    "category4": "",
                    "description": f"{keyword}에 도움이 되는 제품입니다.",
                    "ingredients": ["케라틴", "비오틴"],
                    "suitableStages": [0, 1, 2, 3]
                }
                for i in range(1, min(pageSize + 1, 6))
            ]
            
            return {
                "products": dummy_products,
                "totalCount": len(dummy_products),
                "page": page,
                "pageSize": pageSize,
                "keyword": keyword,
                "source": "더미 데이터 (API 키 없음)"
            }
        
        # 실제 11번가 API 호출
        api_url = "http://openapi.11st.co.kr/openapi/OpenApiService.tmall"
        
        # API 파라미터 설정
        params = {
            'key': eleven_st_api_key,
            'apiCode': 'ProductSearch',
            'keyword': keyword,
            'pageNum': page,
            'pageSize': pageSize,
            'sortCd': 'CP',  # 인기도순
            'option': 'Categories:200000000'  # 헤어케어 카테고리
        }
        
        try:
            # 11번가 API 호출 (한글 키워드 인코딩 처리)
            encoded_params = {}
            for key, value in params.items():
                if isinstance(value, str):
                    encoded_params[key] = urllib.parse.quote(value, safe='')
                else:
                    encoded_params[key] = value
            
            response = requests.get(api_url, params=encoded_params, timeout=10)
            response.raise_for_status()
            
            # XML 응답 파싱 (UTF-8 인코딩 명시)
            root = ET.fromstring(response.content.decode('utf-8'))
            
            products = []
            for product in root.findall('.//Product'):
                try:
                    product_data = {
                        "productId": product.find('ProductCode').text if product.find('ProductCode') is not None else f"11st-{len(products)+1}",
                        "productName": product.find('ProductName').text if product.find('ProductName') is not None else f"{keyword} 제품",
                        "productPrice": int(product.find('ProductPrice').text) if product.find('ProductPrice') is not None else 0,
                        "productRating": float(product.find('ReviewRating').text) if product.find('ReviewRating') is not None else 4.0,
                        "productReviewCount": int(product.find('ReviewCount').text) if product.find('ReviewCount') is not None else 0,
                        "productImage": get_product_image_url(product),
                        "productUrl": product.find('ProductUrl').text if product.find('ProductUrl') is not None else f"https://www.11st.co.kr/products/{product.find('ProductCode').text if product.find('ProductCode') is not None else ''}",
                        "mallName": "11번가",
                        "maker": product.find('Maker').text if product.find('Maker') is not None else "제조사",
                        "brand": product.find('Brand').text if product.find('Brand') is not None else "브랜드",
                        "category1": "헤어케어",
                        "category2": "탈모제품",
                        "category3": "",
                        "category4": "",
                        "description": f"{keyword}에 도움이 되는 제품입니다.",
                        "ingredients": ["케라틴", "비오틴", "판테놀"],
                        "suitableStages": [0, 1, 2, 3]
                    }
                    products.append(product_data)
                except Exception as e:
                    print(f"제품 데이터 파싱 중 오류: {e}")
                    continue
            
            # 제품이 없으면 더미 데이터 반환
            if not products:
                print("11번가에서 제품을 찾을 수 없어 더미 데이터를 반환합니다.")
                products = [
                    {
                        "productId": f"11st-dummy-{i}",
                        "productName": f"{keyword} 관련 제품 {i}",
                        "productPrice": 20000 + (i * 3000),
                        "productRating": 4.2 + (i * 0.1),
                        "productReviewCount": 150 + (i * 30),
                        "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&crop=center",
                        "productUrl": f"https://www.11st.co.kr/products/11st-dummy-{i}",
                        "mallName": "11번가",
                        "maker": "11번가 판매자",
                        "brand": "11번가 브랜드",
                        "category1": "헤어케어",
                        "category2": "탈모제품",
                        "category3": "",
                        "category4": "",
                        "description": f"{keyword}에 특화된 제품입니다.",
                        "ingredients": ["케라틴", "비오틴", "판테놀"],
                        "suitableStages": [0, 1, 2, 3]
                    }
                    for i in range(1, min(pageSize + 1, 6))
                ]
            
            result = {
                "products": products,
                "totalCount": len(products),
                "page": page,
                "pageSize": pageSize,
                "keyword": keyword,
                "source": "11번가 API"
            }
            
        except requests.exceptions.RequestException as e:
            print(f"11번가 API 호출 중 오류: {e}")
            # API 호출 실패 시 더미 데이터 반환
            dummy_products = [
                {
                    "productId": f"11st-fallback-{i}",
                    "productName": f"{keyword} 관련 제품 {i}",
                    "productPrice": 20000 + (i * 3000),
                    "productRating": 4.2 + (i * 0.1),
                    "productReviewCount": 150 + (i * 30),
                    "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&crop=center",
                    "productUrl": f"https://www.11st.co.kr/products/11st-fallback-{i}",
                    "mallName": "11번가",
                    "maker": "11번가 판매자",
                    "brand": "11번가 브랜드",
                    "category1": "헤어케어",
                    "category2": "탈모제품",
                    "category3": "",
                    "category4": "",
                    "description": f"{keyword}에 특화된 제품입니다.",
                    "ingredients": ["케라틴", "비오틴", "판테놀"],
                    "suitableStages": [0, 1, 2, 3]
                }
                for i in range(1, min(pageSize + 1, 6))
            ]
            
            result = {
                "products": dummy_products,
                "totalCount": len(dummy_products),
                "page": page,
                "pageSize": pageSize,
                "keyword": keyword,
                "source": "더미 데이터 (API 호출 실패)"
            }
        
        print(f"성공: 11번가에서 {len(result['products'])}개 제품 조회")
        return result
        
    except Exception as e:
        print(f"11번가 제품 검색 중 오류: {e}")
        import traceback
        traceback.print_exc()
        raise Exception("제품 검색 중 오류가 발생했습니다.")


