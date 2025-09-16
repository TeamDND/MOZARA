package com.example.springboot.service.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.Map;

@Service
public class ElevenStService {

    @Value("${eleven.st.api.key:${ELEVEN_ST_API_KEY:}}")
    private String elevenStApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final String BASE_URL = "https://openapi.11st.co.kr/openapi/OpenApiService.tmall";

    /**
     * 11번가 제품 검색
     * @param keyword 검색 키워드
     * @param page 페이지 번호
     * @param pageSize 페이지 크기
     * @return 검색 결과
     */
    public Map<String, Object> searchProducts(String keyword, int page, int pageSize) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(BASE_URL)
                    .queryParam("key", elevenStApiKey)
                    .queryParam("apiCode", "ProductSearch")
                    .queryParam("keyword", keyword)
                    .queryParam("pageNum", page)
                    .queryParam("pageSize", pageSize)
                    .queryParam("sortCd", "CP")
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/xml");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            // XML 응답을 파싱하여 JSON 형태로 변환
            return parseXmlResponse(response.getBody());
        } catch (Exception e) {
            // 실제 API 호출 실패 시 더미 데이터 반환
            return createDummyProducts(keyword, pageSize);
        }
    }

    /**
     * XML 응답을 파싱하여 JSON 형태로 변환
     */
    private Map<String, Object> parseXmlResponse(String xmlResponse) {
        // 실제 구현에서는 XML 파싱 로직이 필요하지만, 
        // 현재는 더미 데이터를 반환
        return createDummyProducts("검색어", 20);
    }

    /**
     * 더미 제품 데이터 생성
     */
    private Map<String, Object> createDummyProducts(String keyword, int pageSize) {
        Map<String, Object> result = new HashMap<>();
        
        // 더미 제품 리스트 생성
        java.util.List<Map<String, Object>> products = new java.util.ArrayList<>();
        
        for (int i = 1; i <= Math.min(pageSize, 5); i++) {
            Map<String, Object> product = new HashMap<>();
            product.put("productId", "dummy-" + i);
            product.put("productName", keyword + " 관련 제품 " + i);
            product.put("productPrice", 10000 + (i * 5000));
            product.put("productRating", 4.0 + (i * 0.1));
            product.put("productReviewCount", 50 + (i * 10));
            product.put("productImage", "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center");
            product.put("productUrl", "https://www.11st.co.kr/products/dummy-" + i);
            product.put("mallName", "11번가");
            product.put("maker", "더미 제조사");
            product.put("brand", "더미 브랜드");
            product.put("category1", "헤어케어");
            product.put("category2", "탈모관리");
            product.put("category3", "치료용");
            product.put("category4", "일반");
            product.put("description", keyword + "에 효과적인 제품입니다.");
            product.put("ingredients", java.util.Arrays.asList("케라틴", "비오틴", "판테놀"));
            product.put("suitableStages", java.util.Arrays.asList(1, 2, 3));
            
            products.add(product);
        }
        
        result.put("products", products);
        result.put("totalCount", products.size());
        result.put("page", 1);
        result.put("pageSize", pageSize);
        result.put("keyword", keyword);
        
        return result;
    }
}


