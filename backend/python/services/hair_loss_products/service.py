import os
import requests
import xml.etree.ElementTree as ET
import urllib.parse
from datetime import datetime
from typing import Dict, Any, List

from .products_data import HAIR_LOSS_STAGE_PRODUCTS, STAGE_DESCRIPTIONS


def get_product_image_url(product) -> str:
    """11번가 제품 이미지 URL 처리 - 실제 11번가 이미지 URL 반환"""
    try:
        # 11번가 API에서 이미지 URL 가져오기 (여러 필드 시도)
        image_fields = [
            'ProductImage',      # 기본 이미지
            'ProductImageUrl',   # 이미지 URL
            'ImageUrl',          # 대체 이미지 URL
            'ProductImageLarge', # 큰 이미지
            'ImageLarge',        # 큰 이미지 대체
            'Image'              # 일반 이미지
        ]
        
        for field_name in image_fields:
            image_element = product.find(field_name)
            if image_element is not None and image_element.text:
                image_url = image_element.text.strip()
                
                # 이미지 URL 유효성 검증
                if image_url and image_url.startswith(('http://', 'https://')):
                    print(f"이미지 URL 찾음 ({field_name}): {image_url[:100]}")
                    
                    # 11번가 이미지 URL 최적화 (크기 조정)
                    if '11st.co.kr' in image_url or 'cdn11st.com' in image_url:
                        # 이미 크기 파라미터가 있으면 유지, 없으면 추가
                        if 'width=' not in image_url and 'w=' not in image_url:
                            if '?' in image_url:
                                image_url += '&width=300&height=300'
                            else:
                                image_url += '?width=300&height=300'
                    
                    return image_url
        
        print("이미지 URL을 찾을 수 없어 기본 이미지를 사용합니다.")
        # 모든 방법이 실패하면 기본 이미지 반환
        return "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&crop=center"
        
    except Exception as e:
        print(f"이미지 URL 처리 중 오류: {e}")
        import traceback
        traceback.print_exc()
        return "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&crop=center"


# 단계별 검색 키워드 매핑 (여러 키워드로 다양한 제품 검색)
STAGE_KEYWORDS = {
    0: ["두피 샴푸", "두피 클렌저"],           # 예방 단계 - 두피 건강 중심
    1: ["탈모 샴푸", "탈모 영양제"],           # 초기 탈모 - 예방 및 영양 공급
    2: ["탈모 앰플", "탈모 토닉"],             # 진행 단계 - 적극적 관리
    3: ["탈모 치료", "두피 앰플"]              # 전문 단계 - 전문 치료
}


def get_products_by_stage(stage: int) -> list:
    """
    단계별 제품을 11번가 API에서 가져오거나, API 사용 불가 시 더미 데이터 반환
    각 키워드당 3개씩 제품을 가져와 총 6개 제품 반환
    """
    if stage not in STAGE_DESCRIPTIONS:
        raise ValueError("지원하지 않는 탈모 단계입니다. 0-3단계 중 선택해주세요.")
    
    # 11번가 API 키 확인
    eleven_st_api_key = os.getenv("ELEVEN_ST_API_KEY")
    
    if eleven_st_api_key:
        # 11번가 API로 실제 제품 검색
        try:
            keywords = STAGE_KEYWORDS.get(stage, ["탈모 제품"])
            all_products = []
            
            # 각 키워드로 제품 검색
            for keyword in keywords:
                print(f"단계 {stage}: 11번가에서 '{keyword}' 검색 중...")
                
                try:
                    # 각 키워드당 3개씩 제품 가져오기
                    result = search_11st_products(keyword, page=1, pageSize=3)
                    
                    if result.get("products"):
                        print(f"'{keyword}': {len(result['products'])}개 제품 가져옴")
                        all_products.extend(result["products"])
                    else:
                        print(f"'{keyword}': 제품을 찾지 못함")
                        
                except Exception as e:
                    print(f"'{keyword}' 검색 실패: {e}")
                    continue
            
            # 제품을 찾았으면 반환
            if all_products:
                # 중복 제거 (productId 기준)
                seen_ids = set()
                unique_products = []
                for product in all_products:
                    product_id = product.get("productId")
                    if product_id and product_id not in seen_ids:
                        seen_ids.add(product_id)
                        unique_products.append(product)
                
                print(f"단계 {stage}: 중복 제거 후 {len(unique_products)}개 제품 반환")
                return unique_products[:6]  # 최대 6개만 반환
            else:
                print(f"단계 {stage}: 11번가에서 제품을 찾지 못함, 더미 데이터 반환")
                return HAIR_LOSS_STAGE_PRODUCTS.get(stage, [])
                
        except Exception as e:
            print(f"단계 {stage} 11번가 API 호출 실패: {e}")
            # API 실패 시 더미 데이터 반환
            return HAIR_LOSS_STAGE_PRODUCTS.get(stage, [])
    else:
        print(f"11번가 API 키 없음, 더미 데이터 반환 (단계 {stage})")
        # API 키가 없으면 기존 더미 데이터 반환
        return HAIR_LOSS_STAGE_PRODUCTS.get(stage, [])


def build_stage_response(stage: int) -> Dict[str, Any]:
    """단계별 제품 응답 생성"""
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
                for i in range(1, 5)
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
        
        # 키워드가 이미 URL 인코딩되어 있으면 디코딩
        decoded_keyword = urllib.parse.unquote(keyword)
        print(f"디코딩된 키워드: {decoded_keyword}")
        
        # API 파라미터 설정 (11번가 공식 API 스펙)
        params = {
            'key': eleven_st_api_key,
            'apiCode': 'ProductSearch',
            'keyword': decoded_keyword,  # 디코딩된 키워드 사용
            'pageNum': str(page),
            'pageSize': str(pageSize),
            'sortCd': 'CP'  # CP: 인기도순
        }
        
        # 보안을 위해 API 키를 마스킹하여 출력
        safe_params = params.copy()
        if 'key' in safe_params and safe_params['key']:
            safe_params['key'] = safe_params['key'][:4] + '*' * (len(safe_params['key']) - 4)
        
        print(f"11번가 API 호출 URL: {api_url}")
        print(f"11번가 API 파라미터: {safe_params}")
        
        try:
            # requests가 자동으로 한글 키워드 인코딩 처리
            response = requests.get(api_url, params=params, timeout=15)
            
            print(f"11번가 API 응답 상태 코드: {response.status_code}")
            
            if response.status_code != 200:
                print(f"11번가 API 오류 응답: {response.text[:500]}")
                response.raise_for_status()
            
            # XML 응답 파싱 (인코딩 자동 감지)
            # 11번가 API는 EUC-KR 또는 CP949로 응답을 보낼 수 있음
            try:
                # 먼저 response.encoding 확인 후 사용
                if response.encoding:
                    xml_text = response.content.decode(response.encoding)
                else:
                    # 인코딩이 지정되지 않은 경우 여러 인코딩 시도
                    try:
                        xml_text = response.content.decode('utf-8')
                    except UnicodeDecodeError:
                        try:
                            xml_text = response.content.decode('euc-kr')
                        except UnicodeDecodeError:
                            xml_text = response.content.decode('cp949')
                
                root = ET.fromstring(xml_text)
            except Exception as decode_error:
                print(f"XML 디코딩 실패: {str(decode_error)}")
                # 최후의 수단으로 errors='ignore' 사용
                xml_text = response.content.decode('utf-8', errors='ignore')
                root = ET.fromstring(xml_text)
            
            # 총 결과 수 확인
            total_count_elem = root.find('.//TotalCount')
            total_count = int(total_count_elem.text) if total_count_elem is not None and total_count_elem.text else 0
            
            print(f"11번가 검색 결과 총 {total_count}개")
            
            products = []
            product_elements = root.findall('.//Product')
            
            print(f"파싱할 제품 요소 수: {len(product_elements)}")
            
            for idx, product in enumerate(product_elements, 1):
                try:
                    # 1. productId - 11번가 상품 고유 ID
                    product_code_elem = product.find('ProductCode')
                    if product_code_elem is None or not product_code_elem.text:
                        print(f"제품 {idx}: ProductCode 없음, 건너뜀")
                        continue
                    product_id = product_code_elem.text.strip()
                    
                    # 2. productName - 상품 이름 (URL 디코딩)
                    product_name_elem = product.find('ProductName')
                    if product_name_elem is not None and product_name_elem.text:
                        product_name = product_name_elem.text.strip()
                        # URL 인코딩된 경우 디코딩
                        try:
                            product_name = urllib.parse.unquote(product_name)
                        except:
                            pass
                    else:
                        print(f"제품 {idx}: ProductName 없음, 건너뜀")
                        continue
                    
                    # 3. productPrice - 상품 가격 (판매가 우선, 없으면 정가)
                    price = 0
                    sale_price_elem = product.find('SalePrice')
                    if sale_price_elem is not None and sale_price_elem.text:
                        try:
                            price = int(float(sale_price_elem.text.strip().replace(',', '')))
                        except:
                            pass
                    
                    if price == 0:
                        product_price_elem = product.find('ProductPrice')
                        if product_price_elem is not None and product_price_elem.text:
                            try:
                                price = int(float(product_price_elem.text.strip().replace(',', '')))
                            except:
                                pass
                    
                    # 4. productRating - 평점 (없으면 0)
                    rating = 0.0
                    review_rating_elem = product.find('ReviewRating')
                    if review_rating_elem is not None and review_rating_elem.text:
                        try:
                            rating = float(review_rating_elem.text.strip())
                        except:
                            rating = 0.0
                    
                    # 5. productReviewCount - 리뷰 수 (없으면 0)
                    review_count = 0
                    review_count_elem = product.find('ReviewCount')
                    if review_count_elem is not None and review_count_elem.text:
                        try:
                            review_count = int(review_count_elem.text.strip())
                        except:
                            review_count = 0
                    
                    # 6. productImage - 실제 이미지 URL
                    product_image = get_product_image_url(product)
                    
                    # 7. productUrl - 11번가 상세 페이지 URL
                    product_url_elem = product.find('ProductDetailUrl')
                    if product_url_elem is not None and product_url_elem.text:
                        product_url = product_url_elem.text.strip()
                    else:
                        # 대체 필드 확인
                        alt_url_elem = product.find('ProductUrl')
                        if alt_url_elem is not None and alt_url_elem.text:
                            product_url = alt_url_elem.text.strip()
                        else:
                            product_url = f"https://www.11st.co.kr/products/{product_id}"
                    
                    # 8. mallName - 판매처 정보
                    seller_elem = product.find('SellerNick')
                    if seller_elem is not None and seller_elem.text:
                        mall_name = seller_elem.text.strip()
                    else:
                        mall_name = "11번가"
                    
                    # 9. maker, brand - 제조사/브랜드 정보
                    maker_elem = product.find('Maker')
                    maker = maker_elem.text.strip() if maker_elem is not None and maker_elem.text else "제조사"
                    
                    brand_elem = product.find('Brand')
                    brand = brand_elem.text.strip() if brand_elem is not None and brand_elem.text else maker
                    
                    # HairProduct 객체 생성
                    product_data = {
                        "productId": product_id,
                        "productName": product_name,
                        "productPrice": price,
                        "productRating": rating,
                        "productReviewCount": review_count,
                        "productImage": product_image,
                        "productUrl": product_url,
                        "mallName": mall_name,
                        "maker": maker,
                        "brand": brand,
                        "category1": "헤어케어",
                        "category2": "탈모제품",
                        "category3": "",
                        "category4": "",
                        "description": f"{keyword} 관련 제품",
                        "ingredients": ["케라틴", "비오틴", "판테놀"],
                        "suitableStages": [0, 1, 2, 3]
                    }
                    
                    products.append(product_data)
                    print(f"제품 {idx} 파싱 성공: {product_name[:30]}")
                    
                except Exception as e:
                    print(f"제품 {idx} 데이터 파싱 중 오류: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
            
            # 최종 결과 반환 (products와 totalCount 형식)
            print(f"성공: 11번가에서 {len(products)}개 제품 파싱 완료")
            
            result = {
                "products": products,
                "totalCount": total_count,  # 11번가 API에서 받은 전체 결과 수
                "page": page,
                "pageSize": pageSize,
                "keyword": keyword,
                "source": "11번가 실제 API"
            }
            
            return result
            
        except ET.ParseError as e:
            print(f"11번가 API XML 파싱 오류: {e}")
            print(f"응답 내용: {response.text[:1000]}")
            raise Exception(f"11번가 응답 파싱 실패: {str(e)}")
            
        except requests.exceptions.Timeout:
            print("11번가 API 타임아웃")
            raise Exception("11번가 API 응답 시간 초과. 잠시 후 다시 시도해주세요.")
            
        except requests.exceptions.RequestException as e:
            print(f"11번가 API 호출 중 네트워크 오류: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"11번가 API 호출 실패: {str(e)}")
        
    except Exception as e:
        print(f"11번가 제품 검색 중 오류: {e}")
        import traceback
        traceback.print_exc()
        raise Exception("제품 검색 중 오류가 발생했습니다.")


