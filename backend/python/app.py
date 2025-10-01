
"""
MOZARA Python Backend 통합 애플리케이션
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import Optional, List
import json
from typing import Annotated
import threading
from dotenv import load_dotenv
from datetime import datetime
import os
import urllib.parse
import hashlib
import json
from datetime import datetime, timedelta

# .env 파일 로드 (Docker 환경에서는 환경변수 직접 사용)
try:
    load_dotenv("../../.env")
    # load_dotenv(".env")
except:
    pass  # Docker 환경에서는 환경변수를 직접 사용

# 이미지 캐시 저장소 (메모리 기반)
image_cache = {}

def get_cache_key(place_name: str, address: str = None) -> str:
    """캐시 키 생성"""
    key_string = f"{place_name}_{address or ''}"
    return hashlib.md5(key_string.encode()).hexdigest()

def get_cached_image(place_name: str, address: str = None) -> str:
    """캐시된 이미지 URL 가져오기"""
    cache_key = get_cache_key(place_name, address)
    
    if cache_key in image_cache:
        cached_data = image_cache[cache_key]
        # 캐시 만료 시간 확인 (24시간)
        if datetime.now() - cached_data['timestamp'] < timedelta(hours=24):
            return cached_data['image_url']
        else:
            # 만료된 캐시 삭제
            del image_cache[cache_key]
    
    return None

def cache_image(place_name: str, address: str, image_url: str):
    """이미지 URL 캐시 저장"""
    cache_key = get_cache_key(place_name, address)
    image_cache[cache_key] = {
        'image_url': image_url,
        'timestamp': datetime.now()
    }

def generate_default_image_url(category: str, name: str) -> str:
    """카테고리와 이름을 기반으로 기본 이미지 URL 생성 (개선된 랜덤 시스템)"""
    # 카테고리별 다양한 이미지 쿼리 매핑
    category_mapping = {
        '탈모병원': {
            'color': 'blue', 
            'icon': 'hospital', 
            'queries': [
                'hospital+medical', 'clinic+medical', 'doctor+office', 'medical+center',
                'healthcare+facility', 'hospital+building', 'medical+clinic', 'health+center'
            ]
        },
        '탈모미용실': {
            'color': 'purple', 
            'icon': 'scissors', 
            'queries': [
                'hair+salon', 'barbershop', 'hair+stylist', 'beauty+salon',
                'hair+cutting', 'salon+interior', 'hair+care', 'styling+chair'
            ]
        },
        '가발전문점': {
            'color': 'green', 
            'icon': 'wig', 
            'queries': [
                'wig+hair', 'hair+piece', 'hair+extension', 'hair+replacement',
                'synthetic+hair', 'human+hair', 'hair+accessories', 'hair+styling'
            ]
        },
        '두피문신': {
            'color': 'orange', 
            'icon': 'tattoo', 
            'queries': [
                'tattoo+studio', 'scalp+micropigmentation', 'hair+tattoo', 'tattoo+artist',
                'tattoo+parlor', 'body+art', 'tattoo+equipment', 'tattoo+design'
            ]
        },
    }
    
    # 카테고리 분류
    category_lower = category.lower()
    name_lower = name.lower()
    
    if '문신' in category_lower or '문신' in name_lower or 'smp' in name_lower:
        selected_category = '두피문신'
    elif '가발' in category_lower or '가발' in name_lower or '증모술' in name_lower:
        selected_category = '가발전문점'
    elif '미용' in category_lower or '미용' in name_lower or '헤어' in name_lower or '살롱' in name_lower:
        selected_category = '탈모미용실'
    else:
        selected_category = '탈모병원'
    
    config = category_mapping.get(selected_category, category_mapping['탈모병원'])
    
    # 첫 글자 추출
    first_letter = name[0].upper() if name else 'H'
    
    # 이름 기반 시드로 랜덤 쿼리 선택 (일관성 있는 랜덤)
    import hashlib
    name_hash = int(hashlib.md5(name.encode()).hexdigest()[:8], 16)
    query_index = name_hash % len(config['queries'])
    selected_query = config['queries'][query_index]
    
    # Unsplash API를 사용한 실제 이미지 URL 생성
    # 랜덤 시드 추가로 더 다양한 이미지 제공
    random_seed = name_hash % 1000
    unsplash_url = f"https://source.unsplash.com/400x200/?{selected_query}&sig={random_seed}"
    
    # fallback으로 placeholder 사용
    placeholder_url = f"https://via.placeholder.com/400x200/{config['color']}/ffffff?text={urllib.parse.quote(first_letter)}"
    
    return unsplash_url

def get_unsplash_collection_images(category: str, name: str) -> str:
    """Unsplash 컬렉션에서 특정 이미지 가져오기"""
    # 카테고리별 Unsplash 컬렉션 ID
    collection_mapping = {
        '탈모병원': ['medical', 'healthcare', 'hospital', 'clinic'],
        '탈모미용실': ['hair-salon', 'barbershop', 'beauty', 'styling'],
        '가발전문점': ['hair', 'wig', 'hairpiece', 'haircare'],
        '두피문신': ['tattoo', 'body-art', 'tattoo-studio', 'ink']
    }
    
    # 카테고리 분류
    category_lower = category.lower()
    name_lower = name.lower()
    
    if '문신' in category_lower or '문신' in name_lower or 'smp' in name_lower:
        selected_category = '두피문신'
    elif '가발' in category_lower or '가발' in name_lower or '증모술' in name_lower:
        selected_category = '가발전문점'
    elif '미용' in category_lower or '미용' in name_lower or '헤어' in name_lower or '살롱' in name_lower:
        selected_category = '탈모미용실'
    else:
        selected_category = '탈모병원'
    
    collections = collection_mapping.get(selected_category, collection_mapping['탈모병원'])
    
    # 이름 기반으로 컬렉션 선택
    import hashlib
    name_hash = int(hashlib.md5(name.encode()).hexdigest()[:8], 16)
    collection_index = name_hash % len(collections)
    selected_collection = collections[collection_index]
    
    # Unsplash 컬렉션 URL
    return f"https://source.unsplash.com/collection/{selected_collection}/400x200"

def get_unsplash_user_images(category: str, name: str) -> str:
    """Unsplash 특정 사용자의 이미지 가져오기"""
    # 카테고리별 전문 사진작가 사용자명
    photographer_mapping = {
        '탈모병원': ['cdc', 'nci', 'pixabay', 'pexels'],
        '탈모미용실': ['pexels', 'pixabay', 'unsplash', 'freepik'],
        '가발전문점': ['pexels', 'pixabay', 'unsplash', 'freepik'],
        '두피문신': ['pexels', 'pixabay', 'unsplash', 'freepik']
    }
    
    # 카테고리 분류
    category_lower = category.lower()
    name_lower = name.lower()
    
    if '문신' in category_lower or '문신' in name_lower or 'smp' in name_lower:
        selected_category = '두피문신'
    elif '가발' in category_lower or '가발' in name_lower or '증모술' in name_lower:
        selected_category = '가발전문점'
    elif '미용' in category_lower or '미용' in name_lower or '헤어' in name_lower or '살롱' in name_lower:
        selected_category = '탈모미용실'
    else:
        selected_category = '탈모병원'
    
    photographers = photographer_mapping.get(selected_category, photographer_mapping['탈모병원'])
    
    # 이름 기반으로 사진작가 선택
    import hashlib
    name_hash = int(hashlib.md5(name.encode()).hexdigest()[:8], 16)
    photographer_index = name_hash % len(photographers)
    selected_photographer = photographers[photographer_index]
    
    # Unsplash 사용자 이미지 URL
    return f"https://source.unsplash.com/user/{selected_photographer}/400x200"

def get_best_image_url(place_name: str, address: str = None, category: str = '') -> str:
    """최적의 이미지 URL을 선택하는 다단계 시스템 (실용적 개선)"""
    # 캐시에서 먼저 확인
    cached_image = get_cached_image(place_name, address)
    if cached_image:
        return cached_image
    
    # 이미지 소스 우선순위 (실용성과 안정성을 고려한 순서)
    image_sources = [
        # 1순위: Google Places API (실제 병원 사진)
        lambda: get_google_places_image_sync(place_name, address),
        
        # 2순위: 네이버 플레이스 API (실제 병원 사진)
        lambda: get_naver_place_image_sync(place_name, address),
        
        # 3순위: 카카오맵 API (실제 병원 사진)
        lambda: get_kakao_place_image_sync(place_name, address),
        
        # 4순위: Google Custom Search API (관련 이미지)
        lambda: get_google_search_image_sync(place_name, address),
        
        # 5순위: Unsplash 컬렉션 (고품질 관련 이미지)
        lambda: get_unsplash_collection_images(category, place_name),
        
        # 6순위: Unsplash 사용자 (전문 사진작가)
        lambda: get_unsplash_user_images(category, place_name),
        
        # 7순위: 기본 Unsplash (랜덤 관련 이미지)
        lambda: generate_default_image_url(category, place_name)
    ]
    
    # 각 소스를 순차적으로 시도 (타임아웃 설정)
    for i, source_func in enumerate(image_sources):
        try:
            # 각 소스별로 타임아웃 설정
            timeout = 5 if i < 3 else 3  # API 호출은 5초, Unsplash는 3초
            
            import signal
            
            def timeout_handler(signum, frame):
                raise TimeoutError("이미지 소스 타임아웃")
            
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(timeout)
            
            try:
                image_url = source_func()
                if image_url and is_valid_image_url(image_url):
                    # 이미지 URL 검증
                    if verify_image_accessibility(image_url):
                        # 캐시에 저장
                        cache_image(place_name, address, image_url)
                        return image_url
            finally:
                signal.alarm(0)  # 타임아웃 해제
                
        except Exception as e:
            print(f"이미지 소스 {i+1} 오류: {e}")
            continue
    
    # 모든 소스 실패 시 기본 이미지 반환
    default_image = generate_default_image_url(category, place_name)
    cache_image(place_name, address, default_image)
    return default_image

def get_naver_place_image_sync(place_name: str, address: str = None) -> str:
    """네이버 플레이스 API 동기 버전"""
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(scrape_naver_place_images(place_name, address))
        loop.close()
        return result
    except:
        return None

def get_kakao_place_image_sync(place_name: str, address: str = None) -> str:
    """카카오맵 API 동기 버전"""
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(scrape_kakao_place_images(place_name, address))
        loop.close()
        return result
    except:
        return None

def get_google_search_image_sync(place_name: str, address: str = None) -> str:
    """Google Custom Search API 동기 버전"""
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(scrape_google_images(place_name, address))
        loop.close()
        return result
    except:
        return None

def verify_image_accessibility(image_url: str) -> bool:
    """이미지 URL 접근 가능성 검증"""
    try:
        import requests
        
        # HEAD 요청으로 이미지 존재 여부 확인
        response = requests.head(image_url, timeout=5, allow_redirects=True)
        
        # 200 OK이고 Content-Type이 이미지인지 확인
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '').lower()
            return any(img_type in content_type for img_type in ['image/', 'jpeg', 'jpg', 'png', 'gif', 'webp'])
        
        return False
        
    except Exception as e:
        print(f"이미지 접근성 검증 오류: {e}")
        return False

def get_google_places_image_sync(place_name: str, address: str = None) -> str:
    """Google Places API 동기 버전"""
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(get_google_places_image(place_name, address))
        loop.close()
        return result
    except:
        return None

def get_scraped_image_sync(place_name: str, address: str = None) -> str:
    """웹 스크래핑 동기 버전"""
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(scrape_hospital_images(place_name, address))
        loop.close()
        return result
    except:
        return None

async def get_google_places_image(place_name: str, address: str = None) -> str:
    """Google Places API를 사용하여 실제 병원 이미지 가져오기"""
    # 캐시에서 먼저 확인
    cached_image = get_cached_image(place_name, address)
    if cached_image:
        return cached_image
    
    google_api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    
    if not google_api_key:
        default_image = generate_default_image_url("", place_name)
        cache_image(place_name, address, default_image)
        return default_image
    
    try:
        import requests
        
        # Google Places Text Search API로 장소 검색
        search_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        search_params = {
            "query": f"{place_name} {address or ''}",
            "key": google_api_key,
            "type": "hospital|beauty_salon|hair_care"
        }
        
        search_response = requests.get(search_url, params=search_params)
        search_data = search_response.json()
        
        if search_data.get("status") == "OK" and search_data.get("results"):
            place_id = search_data["results"][0]["place_id"]
            
            # Place Details API로 상세 정보 및 사진 참조 가져오기
            details_url = "https://maps.googleapis.com/maps/api/place/details/json"
            details_params = {
                "place_id": place_id,
                "fields": "photos",
                "key": google_api_key
            }
            
            details_response = requests.get(details_url, params=details_params)
            details_data = details_response.json()
            
            if details_data.get("status") == "OK" and details_data.get("result", {}).get("photos"):
                # 첫 번째 사진 사용
                photo_reference = details_data["result"]["photos"][0]["photo_reference"]
                photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo_reference}&key={google_api_key}"
                # 캐시에 저장
                cache_image(place_name, address, photo_url)
                return photo_url
        
        # Google Places에서 이미지를 찾지 못한 경우 기본 이미지 반환
        default_image = generate_default_image_url("", place_name)
        cache_image(place_name, address, default_image)
        return default_image
        
    except Exception as e:
        print(f"Google Places API 오류: {e}")
        return generate_default_image_url("", place_name)

async def scrape_hospital_images(place_name: str, address: str = None) -> str:
    """웹 스크래핑을 통한 병원 이미지 수집 (개선된 버전)"""
    try:
        import requests
        from bs4 import BeautifulSoup
        import re
        
        # 캐시에서 먼저 확인
        cached_image = get_cached_image(f"scraped_{place_name}", address)
        if cached_image:
            return cached_image
        
        # 여러 소스에서 이미지 수집 시도
        image_sources = [
            scrape_naver_place_images(place_name, address),
            scrape_kakao_place_images(place_name, address),
            scrape_google_images(place_name, address)
        ]
        
        for source_func in image_sources:
            try:
                image_url = await source_func
                if image_url and image_url != generate_default_image_url("", place_name):
                    cache_image(f"scraped_{place_name}", address, image_url)
                    return image_url
            except Exception as e:
                print(f"스크래핑 소스 오류: {e}")
                continue
        
        # 모든 소스에서 실패한 경우 기본 이미지 반환
        default_image = generate_default_image_url("", place_name)
        cache_image(f"scraped_{place_name}", address, default_image)
        return default_image
        
    except Exception as e:
        print(f"웹 스크래핑 오류: {e}")
        return generate_default_image_url("", place_name)

async def scrape_naver_place_images(place_name: str, address: str = None) -> str:
    """네이버 지역검색 API를 사용한 병원 이미지 수집 (실제 연동)"""
    try:
        import requests
        import json
        
        # 네이버 지역검색 API 사용 (실제 API 키 활용)
        naver_client_id = os.getenv("NAVER_CLIENT_ID")
        naver_client_secret = os.getenv("NAVER_CLIENT_SECRET")
        
        if not naver_client_id or not naver_client_secret:
            print("네이버 API 키가 설정되지 않았습니다.")
            return None
        
        # 검색 쿼리 구성
        search_query = f"{place_name} {address or ''}"
        
        # 네이버 지역검색 API 엔드포인트
        naver_api_url = "https://openapi.naver.com/v1/search/local.json"
        
        headers = {
            'X-Naver-Client-Id': naver_client_id,
            'X-Naver-Client-Secret': naver_client_secret,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        params = {
            'query': search_query,
            'display': 10,
            'start': 1,
            'sort': 'comment'  # 리뷰 많은 순으로 정렬
        }
        
        response = requests.get(naver_api_url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # 네이버 지역검색 API 응답에서 병원 정보 추출
            if 'items' in data:
                for item in data['items']:
                    # 병원/의료 관련 장소만 필터링
                    if is_medical_place(item.get('category', ''), item.get('title', '')):
                        # 네이버에서 추가 이미지 정보 가져오기
                        image_url = await get_naver_place_detail_image(item)
                        if image_url:
                            return image_url
        
        return None
        
    except Exception as e:
        print(f"네이버 지역검색 API 오류: {e}")
        return None

async def get_naver_place_detail_image(place_item: dict) -> str:
    """네이버 장소 상세 정보에서 이미지 가져오기"""
    try:
        import requests
        import re
        
        # 네이버 지도에서 장소 상세 정보 페이지 스크래핑
        place_name = place_item.get('title', '').replace('<b>', '').replace('</b>', '')
        place_address = place_item.get('address', '')
        
        # 네이버 지도 검색 URL
        search_query = f"{place_name} {place_address}"
        naver_map_url = f"https://map.naver.com/v5/search/{urllib.parse.quote(search_query)}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://map.naver.com/'
        }
        
        response = requests.get(naver_map_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            # HTML에서 이미지 URL 추출
            content = response.text
            
            # 네이버 지도에서 이미지 URL 패턴 찾기
            image_patterns = [
                r'https://[^"\']*\.naver\.com[^"\']*\.(?:jpg|jpeg|png|gif|webp)',
                r'https://[^"\']*\.navercdn\.com[^"\']*\.(?:jpg|jpeg|png|gif|webp)',
                r'https://[^"\']*\.naver\.com[^"\']*photo[^"\']*',
                r'https://[^"\']*\.naver\.com[^"\']*image[^"\']*'
            ]
            
            for pattern in image_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches:
                    if is_valid_image_url(match):
                        return normalize_image_url(match, 'naver.com')
        
        return None
        
    except Exception as e:
        print(f"네이버 장소 상세 정보 오류: {e}")
        return None

def is_medical_place(category: str, name: str) -> bool:
    """의료 관련 장소인지 확인"""
    medical_keywords = [
        '병원', '의원', '클리닉', '센터', '피부과', '성형외과', '한의원',
        '치과', '내과', '외과', '소아과', '산부인과', '정형외과',
        '미용실', '헤어살롱', '두피', '탈모', '가발', '문신', 'SMP'
    ]
    
    category_lower = category.lower()
    name_lower = name.lower()
    
    return any(keyword in category_lower or keyword in name_lower for keyword in medical_keywords)

def extract_naver_image_url(place_data: dict) -> str:
    """네이버 장소 데이터에서 이미지 URL 추출"""
    # 다양한 이미지 필드 확인
    image_fields = [
        'thumUrl', 'photoUrl', 'imageUrl', 'mainPhotoUrl',
        'representPhotoUrl', 'photo', 'image', 'thumbnail'
    ]
    
    for field in image_fields:
        if field in place_data and place_data[field]:
            image_url = place_data[field]
            if is_valid_image_url(image_url):
                return normalize_image_url(image_url, 'naver.com')
    
    return None

async def scrape_kakao_place_images(place_name: str, address: str = None) -> str:
    """카카오맵에서 병원 이미지 수집 (실용적 방법)"""
    try:
        import requests
        import json
        
        # 카카오맵 검색 API 사용 (더 안정적)
        search_query = f"{place_name} {address or ''}"
        
        # 카카오맵 검색 API 엔드포인트
        kakao_api_url = "https://dapi.kakao.com/v2/local/search/keyword.json"
        
        # 카카오 API 키 (환경변수에서 가져오기)
        kakao_api_key = os.getenv("KAKAO_REST_API_KEY")
        
        if not kakao_api_key:
            print("카카오 API 키가 설정되지 않았습니다.")
            return None
        
        headers = {
            'Authorization': f'KakaoAK {kakao_api_key}',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        params = {
            'query': search_query,
            'category_group_code': 'HP8,MT1,CS2',  # 병원, 약국, 미용실
            'size': 15,
            'page': 1
        }
        
        response = requests.get(kakao_api_url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # 카카오 API 응답에서 이미지 URL 추출
            if 'documents' in data:
                for place in data['documents']:
                    # 병원/의료 관련 장소만 필터링
                    if is_medical_place(place.get('category_name', ''), place.get('place_name', '')):
                        # 카카오맵에서 추가 정보 가져오기
                        image_url = await get_kakao_place_detail_image(place.get('id'))
                        if image_url:
                            return image_url
        
        return None
        
    except Exception as e:
        print(f"카카오맵 API 오류: {e}")
        return None

async def get_kakao_place_detail_image(place_id: str) -> str:
    """카카오 장소 상세 정보에서 이미지 가져오기"""
    try:
        import requests
        
        kakao_api_key = os.getenv("KAKAO_REST_API_KEY")
        if not kakao_api_key:
            return None
        
        # 카카오 장소 상세 정보 API
        detail_url = f"https://dapi.kakao.com/v2/local/place/detail.json"
        
        headers = {
            'Authorization': f'KakaoAK {kakao_api_key}'
        }
        
        params = {
            'id': place_id
        }
        
        response = requests.get(detail_url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'result' in data and 'place' in data['result']:
                place_detail = data['result']['place']
                
                # 이미지 URL 추출
                image_fields = ['photo', 'image', 'thumbnail', 'main_photo']
                
                for field in image_fields:
                    if field in place_detail and place_detail[field]:
                        image_url = place_detail[field]
                        if is_valid_image_url(image_url):
                            return normalize_image_url(image_url, 'kakao.com')
        
        return None
        
    except Exception as e:
        print(f"카카오 장소 상세 정보 오류: {e}")
        return None

async def scrape_google_images(place_name: str, address: str = None) -> str:
    """Google Custom Search API를 사용한 이미지 수집 (실용적 방법)"""
    try:
        import requests
        
        # Google Custom Search API 사용 (더 안정적)
        google_api_key = os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY")
        google_cse_id = os.getenv("GOOGLE_CUSTOM_SEARCH_ENGINE_ID")
        
        if not google_api_key or not google_cse_id:
            print("Google Custom Search API 키가 설정되지 않았습니다.")
            return None
        
        # 검색 쿼리 구성
        search_query = f"{place_name} {address or ''} 병원 클리닉"
        
        # Google Custom Search API 엔드포인트
        google_api_url = "https://www.googleapis.com/customsearch/v1"
        
        params = {
            'key': google_api_key,
            'cx': google_cse_id,
            'q': search_query,
            'searchType': 'image',
            'num': 5,
            'imgSize': 'medium',
            'imgType': 'photo',
            'safe': 'medium'
        }
        
        response = requests.get(google_api_url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Google API 응답에서 이미지 URL 추출
            if 'items' in data:
                for item in data['items']:
                    image_url = item.get('link')
                    if image_url and is_valid_image_url(image_url):
                        # 이미지 크기 최적화
                        return optimize_google_image_url(image_url)
        
        return None
        
    except Exception as e:
        print(f"Google Custom Search API 오류: {e}")
        return None

def optimize_google_image_url(image_url: str) -> str:
    """Google 이미지 URL 최적화"""
    if not image_url:
        return image_url
    
    # Google 이미지 URL에서 크기 파라미터 추가
    if 'googleusercontent.com' in image_url:
        # Google 이미지 크기 최적화
        if '=w' not in image_url:
            image_url += '=w400-h200'
        else:
            # 기존 크기 파라미터를 400x200으로 변경
            import re
            image_url = re.sub(r'=w\d+-h\d+', '=w400-h200', image_url)
    
    return image_url

def is_valid_image_url(url: str) -> bool:
    """유효한 이미지 URL인지 확인"""
    if not url:
        return False
    
    # 이미지 확장자 확인
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    url_lower = url.lower()
    
    # URL이 이미지 확장자로 끝나거나 이미지 관련 키워드가 포함된 경우
    return (any(ext in url_lower for ext in image_extensions) or 
            any(keyword in url_lower for keyword in ['photo', 'image', 'thumb', 'place']))

def normalize_image_url(url: str, domain: str) -> str:
    """이미지 URL 정규화"""
    if not url:
        return url
    
    # 상대 URL을 절대 URL로 변환
    if url.startswith('//'):
        return 'https:' + url
    elif url.startswith('/'):
        return f'https://{domain}' + url
    elif not url.startswith('http'):
        return f'https://{domain}/{url}'
    
    return url

# MOZARA Hair Change 모듈
try:
    from services.hair_change.hair_change import generate_wig_style_service, get_wig_styles_service
    HAIR_CHANGE_AVAILABLE = True
    print("Hair Change 모듈 로드 성공")
except ImportError as e:
    print(f"Hair Change 모듈 로드 실패: {e}")
    HAIR_CHANGE_AVAILABLE = False

# Hair Loss Daily 모듈 - services 폴더 내에 있다고 가정하고 경로 수정
try:
    # app 객체를 가져와 마운트하기 때문에, 이 파일에 uvicorn 실행 코드는 없어야 합니다.
    from services.hair_loss_daily.api.hair_analysis_api import app as hair_analysis_app
    HAIR_ANALYSIS_AVAILABLE = True
    print("Hair Loss Daily 모듈 로드 성공")
except ImportError as e:
    print(f"Hair Loss Daily 모듈 로드 실패: {e}")
    HAIR_ANALYSIS_AVAILABLE = False
    hair_analysis_app = None



# Pydantic 모델 정의
class HairstyleResponse(BaseModel):
    result: str
    images: list
    message: str

class ErrorResponse(BaseModel):
    error: str

# 메인 앱 생성
app = FastAPI(title="MOZARA Python Backend 통합", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모든 응답에 CORS 헤더를 보강 (일부 환경에서 누락되는 경우 대비)
@app.middleware("http")
async def add_cors_headers(request, call_next):
    # 간단한 요청 로깅
    try:
        print(f"[REQ] {request.method} {request.url.path}")
    except Exception:
        pass
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = request.headers.get("origin", "*") or "*"
    response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers", "*") or "*"
    response.headers["Access-Control-Allow-Methods"] = request.headers.get("access-control-request-method", "GET,POST,PUT,PATCH,DELETE,OPTIONS") or "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    return response

# 라우터 마운트 (조건부)
if HAIR_ANALYSIS_AVAILABLE and hair_analysis_app:
    # Hair Loss Daily API를 /hair-loss-daily 경로에 마운트
    app.mount("/hair-loss-daily", hair_analysis_app)
    print("Hair Loss Daily 라우터 마운트 완료 (/hair-loss-daily)")
else:
    index = None
    print("Hair Loss Daily 라우터 마운트 건너뜀")

# OpenAI setup
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    from openai import OpenAI
    openai_client = OpenAI(api_key=openai_api_key)
    print("OpenAI 클라이언트 초기화 완료")
else:
    openai_client = None
    print("OPENAI_API_KEY가 설정되지 않았습니다. 일부 기능이 제한될 수 있습니다.")

# Google Gemini setup
gemini_api_key = os.getenv("GEMINI_API_KEY")
google_api_key = os.getenv("GOOGLE_API_KEY")

if gemini_api_key:
    import google.generativeai as genai
    genai.configure(api_key=gemini_api_key)
    print("Google Gemini 클라이언트 초기화 완료 (GEMINI_API_KEY 사용)")
elif google_api_key:
    import google.generativeai as genai
    genai.configure(api_key=google_api_key)
    print("Google Gemini 클라이언트 초기화 완료 (GOOGLE_API_KEY 사용)")
else:
    genai = None
    print("GEMINI_API_KEY 또는 GOOGLE_API_KEY가 설정되지 않았습니다. Gemini 기능이 제한될 수 있습니다.")

# Hair Encyclopedia 라우터 마운트
try:
    from services.hair_encyclopedia.paper_api import router as paper_router
    app.include_router(paper_router)
    print("Hair Encyclopedia Paper API 라우터 마운트 완료")
except ImportError as e:
    print(f"Hair Encyclopedia Paper API 라우터 마운트 실패: {e}")

# Gemini Hair Check 모듈
try:
    from services.hair_gemini_check import analyze_hair_with_gemini
    GEMINI_HAIR_CHECK_AVAILABLE = True
    print("Gemini Hair Check 모듈 로드 성공")
except ImportError as e:
    print(f"Gemini Hair Check 모듈 로드 실패: {e}")
    GEMINI_HAIR_CHECK_AVAILABLE = False

# Swin Hair Classification 모듈
try:
    from services.swin_hair_classification.hair_swin_check import analyze_hair_with_swin
    SWIN_HAIR_CHECK_AVAILABLE = True
    print("Swin Hair Check 모듈 로드 성공")
except ImportError as e:
    print(f"Swin Hair Check 모듈 로드 실패: {e}")
    SWIN_HAIR_CHECK_AVAILABLE = False

# Gemini Hair Analysis Models
class HairAnalysisRequest(BaseModel):
    image_base64: str

class HairAnalysisResponse(BaseModel):
    stage: int
    title: str
    description: str
    advice: List[str]

# Gemini Hair Quiz Models
class QuizQuestion(BaseModel):
    question: str
    answer: str

class PaperDetail(BaseModel):
    id: str
    title: str
    source: str
    full_summary: str

class PaperAnalysis(BaseModel):
    id: str
    title: str
    source: str
    main_topics: List[str]
    key_conclusions: str
    section_summaries: List[dict]

class QuizGenerateResponse(BaseModel):
    items: List[QuizQuestion]

@app.get("/")

def read_root():
    """루트 경로 - 서버 상태 확인"""
    return {
        "message": "MOZARA Python Backend 통합 서버",
        "status": "running",
        "modules": {
            "hair_loss_daily": "/hair-loss-daily" if HAIR_ANALYSIS_AVAILABLE else "unavailable",
            "hair_change": "/generate_hairstyle" if HAIR_CHANGE_AVAILABLE else "unavailable",
            "basp_diagnosis": "/api/basp/evaluate" if BASP_AVAILABLE else "unavailable",
            "hair_gemini_check": "/hair_gemini_check" if GEMINI_HAIR_CHECK_AVAILABLE else "unavailable",
            "hair_swin_check": "/hair_swin_check" if SWIN_HAIR_CHECK_AVAILABLE else "unavailable"
        }
    }

@app.get("/health")

def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy", "service": "python-backend-integrated"}

# --- Gemini 탈모 사진 분석 전용 엔드포인트 ---
@app.post("/hair_gemini_check")
async def api_hair_gemini_check(file: Annotated[UploadFile, File(...)]):
    """
    multipart/form-data로 전송된 이미지를 Gemini로 분석하여 표준 결과를 반환
    """
    if not GEMINI_HAIR_CHECK_AVAILABLE:
        raise HTTPException(status_code=503, detail="Gemini 분석 모듈이 활성화되지 않았습니다.")

    try:
        image_bytes = await file.read()
        print(f"--- [DEBUG] File received. Size: {len(image_bytes)} bytes ---")

        # bytes 데이터를 직접 전달
        result = analyze_hair_with_gemini(image_bytes)

        return result
    except Exception as e:
        print(f"--- [DEBUG] Main Error: {str(e)} ---")
        raise HTTPException(status_code=500, detail=str(e))

# 프리플라이트 요청 처리 (특정 브라우저/프록시 환경 대응)
# @app.options("/api/hair_gemini_check")
# def options_hair_gemini_check():
#     return {"ok": True}

# @app.get("/api/hair_gemini_check/ping")
# def get_hair_gemini_check_ping():
#     return {"status": "ok"}

# --- Swin 탈모 사진 분석 전용 엔드포인트 ---
@app.post("/hair_swin_check")
async def api_hair_swin_check(
    top_image: Annotated[UploadFile, File(...)],
    side_image: Optional[UploadFile] = File(None),
    gender: Optional[str] = Form(None),
    age: Optional[str] = Form(None),
    familyHistory: Optional[str] = Form(None),
    recentHairLoss: Optional[str] = Form(None),
    stress: Optional[str] = Form(None)
):
    """
    multipart/form-data로 전송된 Top/Side 이미지를 Swin으로 분석하여 표준 결과를 반환
    Side 이미지는 optional (여성의 경우 없을 수 있음)
    설문 데이터도 함께 받아서 동적 가중치 계산에 사용
    """
    if not SWIN_HAIR_CHECK_AVAILABLE:
        raise HTTPException(status_code=503, detail="Swin 분석 모듈이 활성화되지 않았습니다.")

    try:
        top_image_bytes = await top_image.read()
        side_image_bytes = None

        if side_image:
            side_image_bytes = await side_image.read()
            print(f"--- [DEBUG] Files received. Top: {len(top_image_bytes)} bytes, Side: {len(side_image_bytes)} bytes ---")
        else:
            print(f"--- [DEBUG] Files received. Top: {len(top_image_bytes)} bytes, Side: None (여성) ---")

        # 설문 데이터 구성
        survey_data = None
        if age and familyHistory:
            survey_data = {
                'gender': gender,
                'age': age,
                'familyHistory': familyHistory,
                'recentHairLoss': recentHairLoss,
                'stress': stress
            }
            print(f"--- [DEBUG] Survey data: {survey_data} ---")

        # bytes 데이터와 설문 데이터를 함께 전달
        result = analyze_hair_with_swin(top_image_bytes, side_image_bytes, survey_data)

        return result
    except Exception as e:
        print(f"--- [DEBUG] Swin Error: {str(e)} ---")
        raise HTTPException(status_code=500, detail=str(e))
        
# --- 네이버 지역 검색 API 프록시 ---
@app.get("/api/naver/local/search")
async def search_naver_local(query: str):
    """네이버 지역 검색 API 프록시"""
    naver_client_id = os.getenv("NAVER_CLIENT_ID") or os.getenv("REACT_APP_NAVER_CLIENT_ID")
    naver_client_secret = os.getenv("NAVER_CLIENT_SECRET") or os.getenv("REACT_APP_NAVER_CLIENT_SECRET")

    if not naver_client_id or not naver_client_secret:
        raise HTTPException(status_code=503, detail="네이버 API 키가 설정되지 않았습니다.")

    try:
        import requests
        # 카테고리별로 다른 검색어 전략 사용
        if "미용실" in query or "헤어살롱" in query or "탈모전용" in query:
            # 탈모미용실 검색 시 더 광범위한 미용실 검색
            search_query = "탈모 미용실 헤어살롱"
        elif "가발" in query or "증모술" in query:
            search_query = f"{query}"
        elif "문신" in query or "smp" in query.lower():
            search_query = f"두피문신 SMP"
        elif "약국" in query:
            # 탈모약국 검색
            search_query = "약국"
        else:
            # 탈모병원 검색 시 탈모 관련 의료기관 검색
            if "탈모" in query or "병원" in query or "의원" in query:
                search_query = "탈모 병원 의원 클리닉 피부과 모발"
            else:
                search_query = f"{query} 병원"

        api_url = f"https://openapi.naver.com/v1/search/local.json"
        params = {
            "query": search_query,
            "display": 20,
            "sort": "comment"
        }

        headers = {
            "X-Naver-Client-Id": naver_client_id,
            "X-Naver-Client-Secret": naver_client_secret
        }

        response = requests.get(api_url, params=params, headers=headers)
        response.raise_for_status()

        data = response.json()
        
        # 각 항목에 이미지 URL 추가 (네이버 API 우선 활용)
        if 'items' in data:
            for item in data['items']:
                # 네이버 지역검색 결과에서 이미지 정보 추출 시도 (동기 버전)
                try:
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    image_url = loop.run_until_complete(get_naver_place_detail_image(item))
                    loop.close()
                    
                    if not image_url:
                        # 네이버에서 이미지를 찾지 못한 경우 다른 소스 시도
                        image_url = get_best_image_url(
                            item.get('title', ''), 
                            item.get('address', ''), 
                            item.get('category', '')
                        )
                    item['imageUrl'] = image_url
                except Exception as e:
                    print(f"네이버 이미지 추출 오류: {e}")
                    # 오류 발생 시 기본 이미지 사용
                    item['imageUrl'] = get_best_image_url(
                        item.get('title', ''), 
                        item.get('address', ''), 
                        item.get('category', '')
                    )
        
        return data

    except Exception as e:
        print(f"네이버 지역 검색 API 오류: {e}")
        raise HTTPException(status_code=500, detail=f"네이버 API 호출 실패: {str(e)}")

# --- 카카오 좌표-주소 변환 API 프록시 (정식/호환 엔드포인트 제공) ---
@app.get("/api/kakao/local/geo/coord2address")
@app.get("/api/kakao/geo/coord2address")
async def get_address_from_coordinates(x: float, y: float):
    """카카오 좌표-주소 변환 API 프록시"""
    kakao_api_key = os.getenv("KAKAO_REST_API_KEY") or os.getenv("REACT_APP_KAKAO_REST_API_KEY")

    if not kakao_api_key:
        raise HTTPException(status_code=503, detail="카카오 API 키가 설정되지 않았습니다.")

    try:
        import requests

        api_url = "https://dapi.kakao.com/v2/local/geo/coord2address.json"
        params = {
            "x": x,
            "y": y
        }

        headers = {
            "Authorization": f"KakaoAK {kakao_api_key}"
        }

        response = requests.get(api_url, params=params, headers=headers, timeout=10)
        response.raise_for_status()

        return response.json()

    except Exception as e:
        print(f"카카오 좌표-주소 변환 API 오류: {e}")
        raise HTTPException(status_code=500, detail=f"카카오 좌표-주소 변환 실패: {str(e)}")

# 대안: 좌표-행정구역 코드 변환 프록시
@app.get("/api/kakao/local/geo/coord2regioncode")
async def get_region_from_coordinates(x: float, y: float):
    kakao_api_key = os.getenv("KAKAO_REST_API_KEY") or os.getenv("REACT_APP_KAKAO_REST_API_KEY")
    if not kakao_api_key:
        raise HTTPException(status_code=503, detail="카카오 API 키가 설정되지 않았습니다.")
    try:
        import requests
        api_url = "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json"
        params = {"x": x, "y": y}
        headers = {"Authorization": f"KakaoAK {kakao_api_key}"}
        response = requests.get(api_url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"카카오 좌표-행정구역 변환 API 오류: {e}")
        raise HTTPException(status_code=500, detail=f"카카오 좌표-행정구역 변환 실패: {str(e)}")

# --- 카카오 지역 검색 API 프록시 ---
@app.get("/api/kakao/local/search")
async def search_kakao_local(
    query: str,
    x: Optional[float] = None,
    y: Optional[float] = None,
    radius: Optional[int] = 5000
):
    """카카오 지역 검색 API 프록시"""
    kakao_api_key = os.getenv("KAKAO_REST_API_KEY") or os.getenv("REACT_APP_KAKAO_REST_API_KEY")

    if not kakao_api_key:
        raise HTTPException(status_code=503, detail="카카오 API 키가 설정되지 않았습니다.")

    try:
        import requests
        # 카테고리별로 다른 검색어 전략 사용
        if "미용실" in query or "헤어살롱" in query or "탈모전용" in query:
            # 탈모미용실 검색 시 더 광범위한 미용실 검색
            search_query = "탈모 미용실 헤어살롱"
        elif "가발" in query or "증모술" in query:
            search_query = f"{query}"
        elif "문신" in query or "smp" in query.lower():
            search_query = f"두피문신 SMP"
        elif "약국" in query:
            # 탈모약국 검색
            search_query = "약국"
        else:
            # 탈모병원 검색 시 탈모 관련 의료기관 검색
            if "탈모" in query or "병원" in query or "의원" in query:
                search_query = "탈모 병원 의원 클리닉 피부과 모발"
            else:
                search_query = f"{query} 병원"

        api_url = f"https://dapi.kakao.com/v2/local/search/keyword.json"
        params = {
            "query": search_query,
            "size": 15
        }

        if x is not None and y is not None:
            params["x"] = x
            params["y"] = y
            params["radius"] = radius

        headers = {
            "Authorization": f"KakaoAK {kakao_api_key}"
        }

        response = requests.get(api_url, params=params, headers=headers)
        response.raise_for_status()

        data = response.json()
        
        # 각 항목에 이미지 URL 추가 (카카오 API 우선 활용)
        if 'documents' in data:
            for doc in data['documents']:
                # 카카오 장소 상세 정보에서 이미지 추출 시도
                try:
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    image_url = loop.run_until_complete(get_kakao_place_detail_image(doc.get('id')))
                    loop.close()
                    
                    if not image_url:
                        # 카카오에서 이미지를 찾지 못한 경우 다른 소스 시도
                        image_url = get_best_image_url(
                            doc.get('place_name', ''), 
                            doc.get('address_name', ''), 
                            doc.get('category_name', '')
                        )
                    doc['imageUrl'] = image_url
                except Exception as e:
                    print(f"카카오 이미지 추출 오류: {e}")
                    # 오류 발생 시 기본 이미지 사용
                    doc['imageUrl'] = get_best_image_url(
                        doc.get('place_name', ''), 
                        doc.get('address_name', ''), 
                        doc.get('category_name', '')
                    )
        
        return data

    except Exception as e:
        print(f"카카오 지역 검색 API 오류: {e}")
        raise HTTPException(status_code=500, detail=f"카카오 API 호출 실패: {str(e)}")

# --- YouTube API 프록시 (조건부) ---
@app.get("/youtube/search")
async def search_youtube_videos(q: str, order: str = "viewCount", max_results: int = 12):
    """YouTube API 프록시 - API 키를 백엔드에서 관리"""
    # URL 디코딩 처리
    import urllib.parse
    original_q = q
    q = urllib.parse.unquote(q)
    print(f"🔍 YouTube 검색 요청 - 원본: {original_q}, 디코딩: {q}, 정렬: {order}, 최대결과: {max_results}")
    
    try:
        import requests
        print("✅ requests 모듈 로드 성공")
    except ImportError:
        print("❌ requests 모듈 로드 실패")
        raise HTTPException(status_code=500, detail="requests 모듈이 설치되지 않았습니다. pip install requests를 실행하세요.")
    
    youtube_api_key = os.getenv("YOUTUBE_API_KEY")
    print(f"🔑 YouTube API 키 상태: {'설정됨' if youtube_api_key and youtube_api_key != 'your_youtube_api_key_here' else '설정되지 않음'}")
    
    try:
        api_url = f"https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": q,
            "order": order,
            "type": "video",
            "maxResults": max_results,
            "key": youtube_api_key
        }
        
        print(f"🌐 YouTube API 호출: {api_url}")
        print(f"📋 파라미터: {params}")
        
        response = requests.get(api_url, params=params)
        print(f"📡 응답 상태: {response.status_code}")
        
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ YouTube API 응답 성공: {len(result.get('items', []))}개 영상")
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ YouTube API 호출 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"YouTube API 호출 실패: {str(e)}")
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"예상치 못한 오류: {str(e)}")


    


# --- Hair Change API (조건부) ---
if HAIR_CHANGE_AVAILABLE:
    @app.post('/generate_hairstyle', response_model=HairstyleResponse)
    async def generate_hairstyle(
        image: UploadFile = File(...),
        hairstyle: str = Form(...),
        custom_prompt: Optional[str] = Form(None)
    ):
        """가발 스타일 변경 API"""
        image_data = await image.read()
        result = await generate_wig_style_service(image_data, hairstyle, custom_prompt)
        return HairstyleResponse(**result)

    @app.get('/hairstyles')
    async def get_hairstyles():
        """사용 가능한 가발 스타일 목록 반환"""
        return get_wig_styles_service()

# Hair Loss Products Service Import
from services.hair_loss_products import build_stage_response, search_11st_products

@app.get("/products")
async def get_hair_loss_products(
    stage: int = Query(..., description="탈모 단계 (0-3)", ge=0, le=3)
):
    """탈모 단계별 제품 추천 API"""
    try:
        print(f"탈모 단계별 제품 요청: stage={stage}")
        
        # 서비스 계층에서 결과 구성
        result = build_stage_response(stage)
        
        print(f"성공: {stage}단계 제품 {result.get('totalCount', 0)}개 반환")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"탈모 단계별 제품 조회 중 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"제품 조회 중 오류가 발생했습니다: {str(e)}")

@app.get("/products/health")
async def products_health_check():
    """제품 추천 서비스 헬스체크"""
    return {
        "status": "healthy",
        "service": "hair-products-recommendation",
        "timestamp": datetime.now().isoformat()
    }


from services.hair_quiz.hair_quiz import (
    generate_hair_quiz_service,
)


@app.get("/11st/products")
async def get_11st_products(
    keyword: str = Query(..., description="검색 키워드"),
    page: int = Query(1, description="페이지 번호", ge=1),
    pageSize: int = Query(20, description="페이지 크기", ge=1, le=100)
):
    """11번가 제품 검색 API"""
    try:
        print(f"11번가 제품 검색 요청: keyword={keyword}, page={page}, pageSize={pageSize}")
        
        # 서비스 계층에서 11번가 제품 검색 (이미 위에서 import됨)
        result = search_11st_products(keyword, page, pageSize)
        
        print(f"성공: 11번가에서 {len(result['products'])}개 제품 조회")
        return result
        
    except Exception as e:
        print(f"11번가 제품 검색 중 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="제품 검색 중 오류가 발생했습니다."
        )

@app.post("/refresh")
async def refresh_token():
    """토큰 갱신 API (임시 구현)"""
    try:
        # 실제 구현에서는 JWT 토큰 갱신 로직이 필요
        # 현재는 임시로 성공 응답 반환
        return {
            "message": "토큰 갱신 완료",
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/paper/{paper_id}", response_model=PaperDetail)
async def get_paper_detail(paper_id: str):
    if not index:
        raise HTTPException(status_code=503, detail="Thesis search service is not available")
    
    try:
        results = index.fetch(ids=[paper_id])
        vectors = results.vectors
        if not vectors:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        vector_obj = vectors.get(paper_id)
        if vector_obj is None:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        metadata = getattr(vector_obj, 'metadata', None)
        if metadata is None and isinstance(vector_obj, dict):
            metadata = vector_obj.get('metadata', {})
        if metadata is None:
            metadata = {}
        
        full_summary = (
            metadata.get('summary') or
            metadata.get('full_summary') or
            metadata.get('text', '')
        )
        
        title_safe = str(metadata.get('title', 'Unknown')).encode('utf-8', errors='ignore').decode('utf-8')
        source_safe = str(metadata.get('source', 'Unknown')).encode('utf-8', errors='ignore').decode('utf-8')
        summary_safe = str(full_summary).encode('utf-8', errors='ignore').decode('utf-8')
        
        return PaperDetail(
            id=paper_id,
            title=title_safe,
            source=source_safe,
            full_summary=summary_safe
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/papers/count")
async def get_papers_count():
    if not index:
        return {"count": 0, "system": "service_disabled"}
    
    try:
        results = index.query(
            vector=[0.0] * 1536,
            top_k=10000,
            include_metadata=True
        )
        
        unique_papers = set()
        for match in results['matches']:
            metadata = match.get('metadata', {})
            file_path = metadata.get('file_path')
            if file_path:
                unique_papers.add(file_path)
        
        return {"count": len(unique_papers), "system": "pinecone_deduped"}
    except Exception as e:
        return {"count": 0, "system": "error", "error": str(e)}

@app.get("/paper/{paper_id}/analysis", response_model=PaperAnalysis)
async def get_paper_analysis(paper_id: str):
    if not index:
        raise HTTPException(status_code=503, detail="Thesis search service is not available")
    
    try:
        results = index.fetch(ids=[paper_id])
        vectors = results.vectors
        if not vectors:
            raise HTTPException(status_code=404, detail="Chunk not found")

        clicked_chunk_metadata = vectors[paper_id].metadata if paper_id in vectors else {}
        original_file_path = clicked_chunk_metadata.get('file_path')
        original_title = clicked_chunk_metadata.get('title')

        if not original_file_path:
            raise HTTPException(status_code=404, detail="Original paper path not found for this chunk.")

        analysis_results = index.query(
            vector=[0.0] * 1536,
            top_k=1,
            include_metadata=True,
            filter={
                "file_path": original_file_path,
                "chunk_index": 0
            }
        )

        if not analysis_results['matches']:
            raise HTTPException(status_code=404, detail="Structured analysis for paper not found.")

        paper_analysis_metadata = analysis_results['matches'][0].metadata

        main_topics_parsed = []
        raw_main_topics = paper_analysis_metadata.get('main_topics')
        if isinstance(raw_main_topics, list):
            main_topics_parsed = [str(t).encode('utf-8', errors='ignore').decode('utf-8') for t in raw_main_topics if isinstance(t, str)]
        elif isinstance(raw_main_topics, str):
            safe_topics = raw_main_topics.encode('utf-8', errors='ignore').decode('utf-8')
            main_topics_parsed = [safe_topics]

        raw_conclusions = paper_analysis_metadata.get('key_conclusions', '')
        key_conclusions_parsed = str(raw_conclusions).encode('utf-8', errors='ignore').decode('utf-8')

        section_summaries_parsed = []
        raw_section_summaries = paper_analysis_metadata.get('section_summaries')
        
        if isinstance(raw_section_summaries, str):
            try:
                safe_json_string = raw_section_summaries.encode('utf-8', errors='ignore').decode('utf-8')
                temp_parsed = json.loads(safe_json_string)
                if isinstance(temp_parsed, list):
                    section_summaries_parsed = []
                    for s in temp_parsed:
                        if isinstance(s, dict):
                            safe_section = {}
                            for key, value in s.items():
                                safe_key = str(key).encode('utf-8', errors='ignore').decode('utf-8')
                                safe_value = str(value).encode('utf-8', errors='ignore').decode('utf-8')
                                safe_section[safe_key] = safe_value
                            section_summaries_parsed.append(safe_section)
            except json.JSONDecodeError:
                pass
        elif isinstance(raw_section_summaries, list):
            section_summaries_parsed = []
            for s in raw_section_summaries:
                if isinstance(s, dict):
                    safe_section = {}
                    for key, value in s.items():
                        safe_key = str(key).encode('utf-8', errors='ignore').decode('utf-8')
                        safe_value = str(value).encode('utf-8', errors='ignore').decode('utf-8')
                        safe_section[safe_key] = safe_value
                    section_summaries_parsed.append(safe_section)
        
        if not section_summaries_parsed:
            section_summaries_parsed = []

        title_raw = paper_analysis_metadata.get('title', original_title or 'Unknown')
        title_safe = str(title_raw).encode('utf-8', errors='ignore').decode('utf-8')
        
        source_raw = paper_analysis_metadata.get('source', 'Unknown')
        source_safe = str(source_raw).encode('utf-8', errors='ignore').decode('utf-8')

        return PaperAnalysis(
            id=paper_id,
            title=title_safe,
            source=source_safe,
            main_topics=main_topics_parsed,
            key_conclusions=key_conclusions_parsed,
            section_summaries=section_summaries_parsed
        )

    except Exception as e:
        print(f"설정 조회 중 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail="설정 조회 중 오류가 발생했습니다."
        )

@app.get("/api/location/status")
async def get_location_status():
    """위치 서비스 상태 확인 API"""
    naver_client_id = os.getenv("NAVER_CLIENT_ID") or os.getenv("REACT_APP_NAVER_CLIENT_ID")
    naver_client_secret = os.getenv("NAVER_CLIENT_SECRET") or os.getenv("REACT_APP_NAVER_CLIENT_SECRET")
    kakao_api_key = os.getenv("KAKAO_REST_API_KEY") or os.getenv("REACT_APP_KAKAO_REST_API_KEY")

    return {
        "status": "ok",
        "message": "Location API 서버가 정상적으로 동작 중입니다.",
        "naverApiConfigured": bool(naver_client_id and naver_client_secret),
        "kakaoApiConfigured": bool(kakao_api_key),
    }



# --- Gemini Hair Quiz API ---
@app.post("/hair-quiz/generate", response_model=QuizGenerateResponse)
async def generate_hair_quiz():
    """Gemini로 O/X 탈모 퀴즈 20문항 생성 (서비스로 위임)"""
    try:
        items = generate_hair_quiz_service()
        return {"items": items}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Gemini 퀴즈 생성 오류: {e}")
        raise HTTPException(status_code=500, detail=f"퀴즈 생성 중 오류가 발생했습니다: {str(e)}")

@app.get("/hair-quiz/health")
async def hair_quiz_health_check():
    """퀴즈 생성 서비스 헬스체크"""
    return {
        "status": "healthy" if genai else "unavailable",
        "service": "gemini-hair-quiz",
        "timestamp": datetime.now().isoformat()
    }


# --- Location Services API ---
@app.get("/location/naver/search")
async def search_naver_local(query: str):
    """네이버 로컬 검색 API 프록시"""
    try:
        naver_client_id = os.getenv("NAVER_CLIENT_ID")
        naver_client_secret = os.getenv("NAVER_CLIENT_SECRET")

        if not naver_client_id or not naver_client_secret:
            return {
                "error": "네이버 API 키가 설정되지 않았습니다.",
                "items": []
            }

        import requests

        url = "https://openapi.naver.com/v1/search/local.json"
        headers = {
            'X-Naver-Client-Id': naver_client_id,
            'X-Naver-Client-Secret': naver_client_secret,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        params = {
            'query': query,
            'display': 20,
            'sort': 'comment'
        }

        response = requests.get(url, params=params, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            return data
        else:
            return {
                "error": f"네이버 API 호출 실패: {response.status_code}",
                "items": []
            }

    except Exception as e:
        print(f"네이버 로컬 검색 오류: {e}")
        return {
            "error": f"네이버 API 호출 중 오류가 발생했습니다: {str(e)}",
            "items": []
        }

@app.get("/location/kakao/search")
async def search_kakao_local(
    query: str,
    x: Optional[float] = None,
    y: Optional[float] = None,
    radius: Optional[int] = 5000
):
    """카카오 로컬 검색 API 프록시"""
    try:
        kakao_api_key = os.getenv("KAKAO_REST_API_KEY")

        if not kakao_api_key:
            return {
                "error": "카카오 API 키가 설정되지 않았습니다.",
                "documents": []
            }

        import requests

        url = "https://dapi.kakao.com/v2/local/search/keyword.json"
        headers = {
            'Authorization': f'KakaoAK {kakao_api_key}',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        params = {
            'query': query,
            'size': 15
        }

        # 좌표 기반 검색이 요청된 경우
        if x is not None and y is not None:
            params['x'] = x
            params['y'] = y
            params['radius'] = radius

        response = requests.get(url, params=params, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            return data
        else:
            return {
                "error": f"카카오 API 호출 실패: {response.status_code}",
                "documents": []
            }

    except Exception as e:
        print(f"카카오 로컬 검색 오류: {e}")
        return {
            "error": f"카카오 API 호출 중 오류가 발생했습니다: {str(e)}",
            "documents": []
        }

@app.get("/location/status")
async def location_service_status():
    """위치 서비스 상태 확인"""
    naver_client_id = os.getenv("NAVER_CLIENT_ID")
    naver_client_secret = os.getenv("NAVER_CLIENT_SECRET")
    kakao_api_key = os.getenv("KAKAO_REST_API_KEY")

    return {
        "status": "ok",
        "message": "Python 위치 서비스가 정상적으로 동작 중입니다.",
        "naverApiConfigured": bool(naver_client_id and naver_client_secret),
        "kakaoApiConfigured": bool(kakao_api_key),
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)