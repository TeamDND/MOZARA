# UserMetrics 시스템 전체 가이드

## 📌 목차
1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [데이터 수집 흐름](#데이터-수집-흐름)
4. [주요 기능](#주요-기능)
5. [설치 및 설정](#설치-및-설정)
6. [사용 방법](#사용-방법)
7. [코드 설명](#코드-설명)
8. [트러블슈팅](#트러블슈팅)

---

## 시스템 개요

### 🎯 목적
UserMetrics 시스템은 사용자 행동 데이터를 수집하고 분석하여 **AI 기반 개인화 추천**을 제공하는 시스템입니다.

### ✨ 핵심 기능
1. **RAG 검색 기록** - 사용자가 챗봇에서 무엇을 검색했는지 추적
2. **두피 진단 기록** - 진단 결과, 점수, 민감도 저장
3. **제품 클릭 분석** - 어떤 제품을 클릭했는지, 어디서 추천받았는지 기록
4. **케어 미션 완료** - 데일리 케어 미션 완료 이력 및 연속 일수 저장
5. **관리자 대시보드** - 수집된 데이터를 시각화하여 통계 제공

### 🔑 왜 필요한가?
- **AI 추천의 정확도**: 사용자가 무엇에 관심 있는지 알아야 맞춤 추천 가능
- **사용자 경험 개선**: 개인화된 서비스 제공
- **비즈니스 인사이트**: 인기 검색어, 선호 제품 파악

---

## 아키텍처

```
┌─────────────────┐
│   Frontend      │
│  (React/TS)     │
└────────┬────────┘
         │ API 호출
         ↓
┌─────────────────┐
│  Spring Boot    │
│  Backend        │
├─────────────────┤
│ UserMetrics     │
│ Controller      │ ← API 엔드포인트
├─────────────────┤
│ UserMetrics     │
│ Service         │ ← 비즈니스 로직
├─────────────────┤
│ UserMetrics     │
│ Repository      │ ← JPA
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Database      │
│  (MySQL/H2)     │
│ user_metric 테이블│
└─────────────────┘
```

### 테이블 구조: `user_metric`

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `user_metric_id` | BIGINT | 기본키 (자동 증가) |
| `user_id_foreign` | BIGINT | 사용자 ID (외래키 → users_info) |
| `type` | VARCHAR | 메트릭 타입 (RAG_SEARCH, SCALP_DIAGNOSIS 등) |
| `value` | TEXT | JSON 형태의 데이터 (쿼리, 점수, 제품명 등) |
| `record_date` | TIMESTAMP | 기록 시간 |

---

## 데이터 수집 흐름

### 1️⃣ RAG 검색 수집
```
사용자가 챗봇에 질문 입력
    ↓
ChatBotMessenger.tsx - sendMessage()
    ↓
POST /api/metrics/rag-search
    {
      query: "탈모 치료법",
      resultCount: 5,
      clicked: false,
      clickedTitle: ""
    }
    ↓
UserMetricsService.logRAGSearch()
    ↓
DB 저장 (type: RAG_SEARCH)
```

**코드 위치**: `ChatBotMessenger.tsx:185-195`

### 2️⃣ 두피 진단 수집
```
사용자가 두피 진단 완료
    ↓
IntegratedDiagnosis.tsx - startAnalysis()
    ↓
분석 결과 생성 (analysisResult)
    ↓
POST /api/metrics/scalp-diagnosis
    {
      scalpType: "남성형 탈모",
      scalpScore: 3,
      sensitivity: "high"
    }
    ↓
UserMetricsService.logScalpDiagnosis()
    ↓
DB 저장 (type: SCALP_DIAGNOSIS)
```

**코드 위치**: `IntegratedDiagnosis.tsx:230-242`

### 3️⃣ 제품 클릭 수집
```
사용자가 제품 카드 클릭
    ↓
ProductCard.tsx - handleProductClick()
    ↓
POST /api/metrics/product-click
    {
      productCategory: "탈모샴푸",
      productName: "닥터포헤어 샴푸",
      recommendedBy: "진단결과"
    }
    ↓
UserMetricsService.logProductClick()
    ↓
DB 저장 (type: PRODUCT_CLICK)
```

**코드 위치**: `ProductCard.tsx:19-32`

### 4️⃣ 케어 미션 수집
```
사용자가 데일리 케어 미션 완료
    ↓
DailyCare.tsx - handleMissionComplete()
    ↓
POST /api/metrics/care-mission
    {
      missionType: "물 마시기",
      streakCount: 5
    }
    ↓
UserMetricsService.logCareMissionComplete()
    ↓
DB 저장 (type: CARE_MISSION)
```

**코드 위치**: `DailyCare.tsx:736-745`

---

## 주요 기능

### 📊 관리자 대시보드

관리자는 `/admin/dashboard`에서 **UserMetrics** 탭을 통해 다음을 확인할 수 있습니다:

#### 1. 인기 검색 키워드 TOP 10
- 최근 7일간 가장 많이 검색된 키워드
- 그리드 형태로 시각화
- API: `GET /api/admin/metrics/popular-searches?days=7`

#### 2. 실시간 통계
- **총 검색 횟수**: RAG 검색 총 개수
- **활성 사용자 수**: 최근 7일 동안 활동한 사용자
- **두피 진단 횟수**: 총 진단 횟수
- API: `GET /api/admin/metrics/overview`

**스크린샷 위치**: Admin Dashboard > UserMetrics 탭

---

## 설치 및 설정

### 백엔드 (Spring Boot)

#### 1. Entity 확인
```java
// UserMetricEntity.java
@Entity
@Table(name = "user_metric")
public class UserMetricEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userMetricId;

    @ManyToOne
    @JoinColumn(name = "user_id_foreign")
    private UserEntity userIdForeign;

    private String type;  // RAG_SEARCH, SCALP_DIAGNOSIS 등

    @Column(columnDefinition = "TEXT")
    private String value; // JSON 데이터

    private Instant recordDate;
}
```

#### 2. Repository 생성됨
- `UserMetricsRepository.java` - JPA 쿼리 메서드

#### 3. Service 구현됨
- `UserMetricsService.java` - 저장 및 조회 로직

#### 4. Controller 구현됨
- `UserMetricsController.java` - `/api/metrics/*` 엔드포인트
- `AdminController.java` - `/api/admin/metrics/*` 엔드포인트

### 프론트엔드 (React/TypeScript)

#### 1. API 클라이언트 사용
```typescript
import apiClient from '../../services/apiClient';

// 검색 메트릭 저장 예시
await apiClient.post('/api/metrics/rag-search', {
  query: "탈모 예방법",
  resultCount: 3,
  clicked: false,
  clickedTitle: ""
});
```

#### 2. 각 페이지에 연동 완료
- ✅ `ChatBotMessenger.tsx` - RAG 검색
- ✅ `IntegratedDiagnosis.tsx` - 두피 진단
- ✅ `ProductCard.tsx` - 제품 클릭
- ✅ `DailyCare.tsx` - 케어 미션

---

## 사용 방법

### 일반 사용자

#### 1. RAG 검색하기
1. 챗봇 열기
2. 질문 입력 (예: "탈모 치료 방법 알려줘")
3. 자동으로 검색 기록 저장됨

#### 2. 두피 진단하기
1. 메인페이지 > "두피 진단" 클릭
2. 설문 작성 및 사진 업로드
3. 분석 완료 시 자동 저장됨

#### 3. 제품 클릭하기
1. 진단 결과 페이지 or 제품 목록
2. 제품 카드 클릭
3. 자동으로 클릭 기록 저장됨

#### 4. 케어 미션 완료하기
1. 데일리 케어 페이지
2. 미션 완료 버튼 클릭
3. 자동으로 완료 기록 저장됨

### 관리자

#### Admin Dashboard 접근
1. 로그인 (관리자 계정 필요)
2. `/admin/dashboard` 이동
3. **UserMetrics** 탭 클릭
4. 통계 확인:
   - 인기 검색어
   - 총 검색/진단 횟수
   - 활성 사용자 수

---

## 코드 설명

### Backend: UserMetricsService.java

#### logRAGSearch() - RAG 검색 저장
```java
@Transactional
public void logRAGSearch(Long userId, String query,
                         int resultCount, boolean clicked,
                         String clickedTitle) {
    Map<String, Object> data = new HashMap<>();
    data.put("query", query);              // 검색 쿼리
    data.put("resultCount", resultCount);  // 결과 개수
    data.put("clicked", clicked);          // 클릭 여부
    data.put("clickedTitle", clickedTitle);// 클릭한 제목
    data.put("timestamp", Instant.now().toString());

    saveMetric(userId, "RAG_SEARCH",
               objectMapper.writeValueAsString(data));
}
```
- **용도**: 챗봇에서 사용자가 검색한 내용 기록
- **JSON 저장**: `value` 컬럼에 JSON 문자열로 저장
- **트랜잭션**: `@Transactional`로 안전하게 DB 저장

#### getPopularSearchKeywords() - 인기 검색어
```java
public List<String> getPopularSearchKeywords(int days) {
    List<UserMetricEntity> searches =
        userMetricsRepository.findByTypeOrderByRecordDateDesc("RAG_SEARCH");

    return searches.stream()
        .map(metric -> extractQueryFromValue(metric.getValue()))
        .filter(Objects::nonNull)
        .collect(Collectors.groupingBy(q -> q, Collectors.counting()))
        .entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
        .limit(10)
        .map(Map.Entry::getKey)
        .collect(Collectors.toList());
}
```
- **동작**: RAG_SEARCH 타입 메트릭에서 쿼리 추출 → 빈도수 계산 → TOP 10 반환
- **Stream 사용**: Java Stream API로 간결하게 처리

### Frontend: ChatBotMessenger.tsx

#### sendMessage() - 메시지 전송 및 메트릭 저장
```typescript
const sendMessage = async (text?: string) => {
  const messageText = text || inputMessage.trim();

  // 1. Python 챗봇 API 호출
  const response = await pythonClient.post('/rag-chat', {
    message: messageText,
    conversation_id: userConversationId,
  });

  const data: ChatResponse = response.data;

  // 2. UserMetrics에 RAG 검색 저장
  try {
    await apiClient.post('/api/metrics/rag-search', {
      query: messageText,
      resultCount: data.sources?.length || 0,
      clicked: false,
      clickedTitle: ''
    });
  } catch (error) {
    console.log('RAG 검색 메트릭 저장 실패 (무시됨):', error);
  }

  // 3. AI 개인화 추천 요청
  const recResponse = await apiClient.post(
    '/api/ai/rag-v2-check/chat-with-recommendation',
    { query: messageText, response: data.response }
  );

  // 4. 메시지 표시
  const botMessage: Message = {
    ...
    recommendation: recResponse.data.recommendation
  };
  setMessages(prev => [...prev, botMessage]);
};
```
- **비동기 처리**: `async/await` 사용
- **에러 무시**: 메트릭 저장 실패해도 사용자 경험에 영향 없음
- **순서**: 챗봇 응답 → 메트릭 저장 → AI 추천

### Frontend: AdminDashboard.tsx

#### UserMetrics 탭
```typescript
const fetchMetricsData = async () => {
  setMetricsLoading(true);
  try {
    const [keywordsRes, overviewRes] = await Promise.all([
      apiClient.get<MetricsData>('/admin/metrics/popular-searches?days=7'),
      apiClient.get<MetricsOverview>('/admin/metrics/overview')
    ]);
    setMetricsData(keywordsRes.data);
    setMetricsOverview(overviewRes.data);
  } catch (error) {
    console.error('UserMetrics 데이터 조회 실패:', error);
  } finally {
    setMetricsLoading(false);
  }
};
```
- **병렬 요청**: `Promise.all`로 2개 API 동시 호출 (성능 향상)
- **로딩 상태**: `metricsLoading`으로 스피너 표시
- **타입 안전**: TypeScript 인터페이스 활용

---

## 트러블슈팅

### 문제 1: 메트릭이 저장되지 않음

**증상**: 사용자가 검색했는데 Admin Dashboard에 데이터가 안 보임

**원인**:
1. 로그인 안 한 상태 (userId가 null)
2. API 엔드포인트 오류 (404)
3. DB 연결 문제

**해결**:
```bash
# 1. 로그 확인
# Spring Boot 콘솔에서 "RAG 검색 저장 완료" 로그 확인

# 2. Network 탭 확인
# 브라우저 개발자도구 > Network > /api/metrics/rag-search 응답 확인

# 3. DB 직접 확인
SELECT * FROM user_metric WHERE type = 'RAG_SEARCH' ORDER BY record_date DESC LIMIT 10;
```

### 문제 2: Admin Dashboard 통계가 0으로 표시

**증상**: UserMetrics 탭에서 모든 숫자가 0

**원인**:
1. 데이터가 실제로 없음 (사용자가 아직 활동 안 함)
2. Repository 쿼리 오류
3. 날짜 범위 문제 (7일 이상 지난 데이터만 있음)

**해결**:
```java
// UserMetricsService.java에서 디버깅
public long getTotalSearchCount() {
    long count = userMetricsRepository
        .findByTypeOrderByRecordDateDesc("RAG_SEARCH").size();
    log.info("총 검색 횟수: {}", count);  // 로그 추가
    return count;
}
```

### 문제 3: JSON 파싱 에러

**증상**: `value` 컬럼 데이터를 읽을 때 에러

**원인**: JSON 형식이 잘못됨

**해결**:
```java
private String extractQueryFromValue(String value) {
    try {
        Map<String, Object> data = objectMapper.readValue(value, Map.class);
        return (String) data.get("query");
    } catch (Exception e) {
        log.error("JSON 파싱 실패: {}", value, e);
        return null;  // null 반환으로 안전하게 처리
    }
}
```

---

## API 엔드포인트 요약

### 사용자용 API

| Method | URL | 설명 | Body |
|--------|-----|------|------|
| POST | `/api/metrics/rag-search` | RAG 검색 저장 | `{query, resultCount, clicked, clickedTitle}` |
| POST | `/api/metrics/scalp-diagnosis` | 두피 진단 저장 | `{scalpType, scalpScore, sensitivity}` |
| POST | `/api/metrics/product-click` | 제품 클릭 저장 | `{productCategory, productName, recommendedBy}` |
| POST | `/api/metrics/care-mission` | 케어 미션 저장 | `{missionType, streakCount}` |
| GET | `/api/metrics/my-summary` | 내 메트릭 요약 | - |

### 관리자용 API

| Method | URL | 설명 | Query Params |
|--------|-----|------|--------------|
| GET | `/api/admin/metrics/popular-searches` | 인기 검색어 TOP 10 | `days=7` |
| GET | `/api/admin/metrics/overview` | 전체 통계 | - |

---

## 향후 확장 가능 기능

### 1. 페이지 체류 시간 추적
```typescript
// 예시 코드
useEffect(() => {
  const startTime = Date.now();
  return () => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    apiClient.post('/api/metrics/page-dwell-time', {
      page: window.location.pathname,
      duration
    });
  };
}, []);
```

### 2. AI 추천 생성 횟수 추적
- 챗봇에서 AI 추천이 생성될 때마다 카운트
- Admin Dashboard에서 시각화

### 3. 사용자별 상세 분석
- 특정 사용자의 행동 패턴 분석
- `/admin/user/{userId}/metrics` 페이지

### 4. 실시간 차트
- Chart.js 또는 Recharts 사용
- 일별/주별 트렌드 시각화

---

## 참고 자료

### 파일 위치

**Backend**:
- Entity: `backend/springboot/src/main/java/com/example/springboot/UserMetricEntity.java`
- Repository: `backend/springboot/src/main/java/com/example/springboot/data/repository/UserMetricsRepository.java`
- Service: `backend/springboot/src/main/java/com/example/springboot/service/metrics/UserMetricsService.java`
- Controller: `backend/springboot/src/main/java/com/example/springboot/controller/metrics/UserMetricsController.java`
- Admin Controller: `backend/springboot/src/main/java/com/example/springboot/controller/admin/AdminController.java`

**Frontend**:
- ChatBot: `frontend/src/pages/ChatBot/ChatBotMessenger.tsx`
- 진단: `frontend/src/pages/check/IntegratedDiagnosis.tsx`
- 제품: `frontend/src/pages/hair_product/ProductCard.tsx`
- 케어: `frontend/src/pages/hair_dailycare/DailyCare.tsx`
- Admin: `frontend/src/pages/admin/AdminDashboard.tsx`

### 의존성

**Spring Boot**:
```xml
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
</dependency>
```

**React**:
```json
{
  "axios": "^1.x.x",
  "react": "^18.x.x",
  "lucide-react": "^0.x.x"
}
```

---

## 마무리

이 시스템은 **사용자 행동을 추적하여 AI 개인화 추천의 정확도를 높이는** 핵심 인프라입니다.

- ✅ 자동 수집: 사용자가 의식하지 못하게 백그라운드에서 수집
- ✅ 확장 가능: 새로운 메트릭 타입 쉽게 추가 가능
- ✅ 안전: 에러 발생해도 사용자 경험에 영향 없음
- ✅ 관리 편리: Admin Dashboard에서 한눈에 확인

**질문이나 문제가 있으면 이 문서를 참고하세요!** 🚀
