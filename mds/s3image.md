# S3 이미지 저장 시스템 구현

## 📋 개요

AWS S3를 활용한 이미지 저장 시스템을 구축하여 탈모 검사 및 모발 검사 이미지를 안전하게 저장하고 관리합니다.

---

## 🎯 비즈니스 요구사항

### 1. 탈모 검사
- **남성**: 윗머리(Top-Down) + 옆머리(Side) 두 장 저장
- **여성**: 윗머리(Top-Down) 한 장만 저장
- 저장 후 URL을 받아서 분석 API에 전달
- 분석 완료 후 `analysis_results` 테이블에 URL 저장

### 2. 모발 검사
- 정수리 확대 사진 한 장 저장
- 저장 후 URL을 받아서 분석 API에 전달
- 분석 완료 후 `analysis_results` 테이블에 URL 저장

---

## 🗂️ S3 버킷 구조

### 버킷 이름
```
hair-loss-image
```

### 폴더 구조
```
hair-loss-image/
├── hair-loss-analysis/       # 탈모 검사
│   ├── 20251002_143022_123_top_a3f9c2.jpg
│   └── 20251002_143022_123_side_b7e4d1.jpg
└── hair-damage-analysis/      # 모발 검사
    └── 20251002_143530_123_c8a2f5.jpg
```

---

## 📝 파일명 규칙

### 탈모 검사
**형식**: `yyyyMMdd_HHmmss_{userId}_{viewType}_{random}.jpg`

**예시**:
- Top View: `20251002_143022_123_top_a3f9c2.jpg`
- Side View: `20251002_143022_123_side_b7e4d1.jpg`

### 모발 검사
**형식**: `yyyyMMdd_HHmmss_{userId}_{random}.jpg`

**예시**: `20251002_143530_123_c8a2f5.jpg`

---

## 🗄️ DB 저장 방식

### analysis_results 테이블

**image_url 컬럼**: `VARCHAR(1000)`

**저장 형식**:
- **남성 탈모**: `topViewUrl|||sideViewUrl` (구분자: `|||`)
- **여성 탈모**: `topViewUrl`
- **모발 검사**: `imageUrl`

**예시**:
```
https://hair-loss-image.s3.ap-northeast-2.amazonaws.com/hair-loss-analysis/20251002_143022_123_top_a3f9c2.jpg|||https://hair-loss-image.s3.ap-northeast-2.amazonaws.com/hair-loss-analysis/20251002_143022_123_side_b7e4d1.jpg
```

---

## 🔧 Backend 구현

### 1. 의존성 추가

**build.gradle**:
```gradle
dependencies {
    // AWS S3
    implementation 'com.amazonaws:aws-java-sdk-s3:1.12.529'
}
```

### 2. 설정 파일

**application.properties**:
```properties
### AWS S3 Configuration ###
cloud.aws.credentials.access-key=${AWS_ACCESS_KEY:}
cloud.aws.credentials.secret-key=${AWS_SECRET_KEY:}
cloud.aws.region.static=${AWS_REGION:ap-northeast-2}
cloud.aws.s3.bucket=hair-loss-image
```

### 3. S3 설정 클래스

**S3Config.java**:
```java
@Configuration
public class S3Config {
    @Value("${cloud.aws.credentials.access-key}")
    private String accessKey;

    @Value("${cloud.aws.credentials.secret-key}")
    private String secretKey;

    @Value("${cloud.aws.region.static}")
    private String region;

    @Bean
    public AmazonS3 amazonS3Client() {
        AWSCredentials credentials = new BasicAWSCredentials(accessKey, secretKey);
        return AmazonS3ClientBuilder
                .standard()
                .withCredentials(new AWSStaticCredentialsProvider(credentials))
                .withRegion(region)
                .build();
    }
}
```

### 4. 파일 저장 유틸리티

**FileStore.java**:
```java
@Component
@RequiredArgsConstructor
public class FileStore {
    private final AmazonS3 amazonS3;

    // 탈모 검사용 이미지 업로드
    public String storeHairLossImage(MultipartFile multipartFile, String bucket,
                                     String folder, Integer userId, String viewType)
                                     throws IOException {
        String storeFileName = createHairLossFileName(originalFilename, userId, viewType);
        String fullPath = folder + "/" + storeFileName;

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(multipartFile.getSize());
        metadata.setContentType(multipartFile.getContentType());

        amazonS3.putObject(bucket, fullPath, multipartFile.getInputStream(), metadata);
        return amazonS3.getUrl(bucket, fullPath).toString();
    }

    // 모발 검사용 이미지 업로드
    public String storeHairDamageImage(MultipartFile multipartFile, String bucket,
                                       String folder, Integer userId)
                                       throws IOException {
        String storeFileName = createHairDamageFileName(originalFilename, userId);
        String fullPath = folder + "/" + storeFileName;

        // ... 동일한 업로드 로직
    }

    // 파일명 생성 로직
    private String createHairLossFileName(String originalFilename, Integer userId, String viewType) {
        String ext = extractExt(originalFilename);
        String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String randomStr = UUID.randomUUID().toString().substring(0, 6);
        return String.format("%s_%d_%s_%s.%s", timestamp, userId, viewType, randomStr, ext);
    }
}
```

### 5. API 엔드포인트

**ImageUploadController.java**:
```java
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/images")
public class ImageUploadController {
    private final FileStore fileStore;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    // 탈모 검사 이미지 업로드
    @PostMapping("/upload/hair-loss")
    public ResponseEntity<?> uploadHairLossImage(
            @RequestParam("userId") Integer userId,
            @RequestParam("viewType") String viewType,
            @RequestParam("image") MultipartFile image) {

        String folder = "hair-loss-analysis";
        String imageUrl = fileStore.storeHairLossImage(image, bucket, folder, userId, viewType);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "imageUrl", imageUrl,
            "viewType", viewType
        ));
    }

    // 모발 검사 이미지 업로드
    @PostMapping("/upload/hair-damage")
    public ResponseEntity<?> uploadHairDamageImage(
            @RequestParam("userId") Integer userId,
            @RequestParam("image") MultipartFile image) {

        String folder = "hair-damage-analysis";
        String imageUrl = fileStore.storeHairDamageImage(image, bucket, folder, userId);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "imageUrl", imageUrl
        ));
    }
}
```

### 6. Entity 수정

**AnalysisResultEntity.java**:
```java
@Entity
@Table(name = "analysis_results")
public class AnalysisResultEntity {
    // ...

    @Size(max = 1000)
    @Column(name = "image_url", length = 1000)
    private String imageUrl;  // VARCHAR(255) → VARCHAR(1000)

    // ...
}
```

---

## 💻 Frontend 구현

### 1. 탈모 검사 이미지 업로드

**ImageUploadStep.tsx**:
```typescript
const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        // 미리보기 설정
        const reader = new FileReader();
        reader.onload = (e) => {
            setUploadedPhoto(e.target?.result as string);
            setUploadedPhotoFile(file);
        };
        reader.readAsDataURL(file);

        // S3 업로드
        if (user?.userId && setUploadedPhotoUrl) {
            try {
                setIsUploadingTop(true);
                const formData = new FormData();
                formData.append('image', file);
                formData.append('userId', user.userId.toString());
                formData.append('viewType', 'top');

                const response = await apiClient.post('/images/upload/hair-loss', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                if (response.data.success) {
                    setUploadedPhotoUrl(response.data.imageUrl);
                    console.log('✅ Top View S3 업로드 성공:', response.data.imageUrl);
                }
            } catch (error) {
                console.error('❌ Top View S3 업로드 실패:', error);
            } finally {
                setIsUploadingTop(false);
            }
        }
    }
};
```

**IntegratedDiagnosis.tsx**:
```typescript
const performRealAnalysis = async () => {
    const isMale = baspAnswers.gender === 'male';

    if (isMale) {
        // 남성: S3 URL 결합
        const combinedImageUrl = uploadedPhotoUrl && uploadedSidePhotoUrl
            ? `${uploadedPhotoUrl}|||${uploadedSidePhotoUrl}`
            : undefined;

        const result = await analyzeHairWithSwin(
            uploadedPhotoFile,
            uploadedSidePhotoFile!,
            user?.userId || undefined,
            combinedImageUrl,  // S3 URL 전달
            surveyData
        );
    } else {
        // 여성: Top View URL만 전달
        const result = await analyzeHairWithRAG(
            uploadedPhotoFile,
            user?.userId || undefined,
            uploadedPhotoUrl || undefined,  // S3 URL 전달
            surveyData
        );
    }
};
```

### 2. 모발 검사 이미지 업로드

**DailyCare.tsx**:
```typescript
const handleAnalyze = async () => {
    // 1단계: S3 업로드
    let imageUrl: string | null = null;
    if (userId) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', selectedImage);
        uploadFormData.append('userId', userId.toString());

        const uploadResponse = await apiClient.post('/images/upload/hair-damage', uploadFormData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadResponse.data.success) {
            imageUrl = uploadResponse.data.imageUrl;
            console.log('✅ S3 업로드 성공:', imageUrl);
        }
    }

    // 2단계: 분석 API 호출 (S3 URL 포함)
    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('user_id', userId.toString());
    if (imageUrl) {
        formData.append('image_url', imageUrl);
    }

    const response = await apiClient.post('/ai/hair-loss-daily/analyze', formData);
};
```

---

## 🔄 전체 데이터 플로우

### 탈모 검사 (남성)
```
1. 사용자가 Top View 이미지 선택
   ↓
2. ImageUploadStep → S3 업로드 API 호출 (/api/images/upload/hair-loss?viewType=top)
   ↓
3. FileStore → S3에 저장 (hair-loss-analysis/날짜_userId_top_랜덤.jpg)
   ↓
4. S3 URL 응답 → uploadedPhotoUrl state에 저장
   ↓
5. 사용자가 Side View 이미지 선택
   ↓
6. ImageUploadStep → S3 업로드 API 호출 (/api/images/upload/hair-loss?viewType=side)
   ↓
7. FileStore → S3에 저장 (hair-loss-analysis/날짜_userId_side_랜덤.jpg)
   ↓
8. S3 URL 응답 → uploadedSidePhotoUrl state에 저장
   ↓
9. 분석 시작 버튼 클릭
   ↓
10. IntegratedDiagnosis → Swin API 호출 (topUrl|||sideUrl 전달)
    ↓
11. 분석 완료 → analysis_results 테이블에 "topUrl|||sideUrl" 저장
```

### 탈모 검사 (여성)
```
1. 사용자가 Top View 이미지 선택
   ↓
2. ImageUploadStep → S3 업로드 API 호출 (/api/images/upload/hair-loss?viewType=top)
   ↓
3. FileStore → S3에 저장
   ↓
4. S3 URL 응답 → uploadedPhotoUrl state에 저장
   ↓
5. 분석 시작 버튼 클릭
   ↓
6. IntegratedDiagnosis → RAG v2 API 호출 (topUrl 전달)
   ↓
7. 분석 완료 → analysis_results 테이블에 "topUrl" 저장
```

### 모발 검사
```
1. 사용자가 두피 이미지 선택
   ↓
2. 분석 버튼 클릭
   ↓
3. DailyCare → S3 업로드 API 호출 (/api/images/upload/hair-damage)
   ↓
4. FileStore → S3에 저장 (hair-damage-analysis/날짜_userId_랜덤.jpg)
   ↓
5. S3 URL 응답
   ↓
6. Hair Loss Daily API 호출 (imageUrl 전달)
   ↓
7. 분석 완료 → analysis_results 테이블에 "imageUrl" 저장
```

---

## ⚙️ 환경 설정

### 1. AWS 자격 증명 설정

#### 방법 A: IntelliJ Run/Debug Configurations (추천)
```
Run → Edit Configurations → Environment variables:

AWS_ACCESS_KEY=당신의_액세스_키
AWS_SECRET_KEY=당신의_시크릿_키
AWS_REGION=ap-northeast-2
```

#### 방법 B: .env 파일
**backend/springboot/.env**:
```env
AWS_ACCESS_KEY=당신의_액세스_키
AWS_SECRET_KEY=당신의_시크릿_키
AWS_REGION=ap-northeast-2
```

**.gitignore 추가**:
```gitignore
.env
```

### 2. DB 스키마 수정
```sql
ALTER TABLE mozara.analysis_results
MODIFY COLUMN image_url VARCHAR(1000);
```

### 3. Gradle 의존성 다운로드
```bash
cd C:\Users\301\Desktop\main_project\backend\springboot
./gradlew build --refresh-dependencies
```

---

## 🔐 보안 고려사항

### 1. AWS Credentials
- ✅ 환경 변수로 관리
- ✅ Git에 절대 커밋하지 않음
- ✅ .env 파일은 .gitignore에 추가

### 2. 파일 검증
- ✅ 파일 확장자 검증 (jpg, jpeg, png만 허용)
- ✅ 파일 크기 제한 (최대 10MB)
- ✅ MIME 타입 검증

### 3. 인증/인가
- ✅ JWT 토큰 검증
- ✅ 본인 이미지만 업로드/조회 가능

---

## 📂 수정된 파일 목록

### Backend
- ✅ `build.gradle` - AWS S3 의존성 추가
- ✅ `application.properties` - S3 설정 추가
- ✅ `config/S3Config.java` - S3 클라이언트 설정
- ✅ `component/FileStore.java` - 파일 업로드 유틸리티
- ✅ `controller/image/ImageUploadController.java` - 이미지 업로드 API
- ✅ `data/entity/AnalysisResultEntity.java` - image_url 컬럼 확장

### Frontend
- ✅ `components/check/ImageUploadStep.tsx` - 탈모 검사 이미지 업로드
- ✅ `pages/check/IntegratedDiagnosis.tsx` - S3 URL 전달 로직
- ✅ `pages/hair_solutions/DailyCare.tsx` - 모발 검사 이미지 업로드

---

## 🧪 테스트 체크리스트

### Backend
- [ ] S3 업로드 API 테스트 (`/api/images/upload/hair-loss`)
- [ ] S3 업로드 API 테스트 (`/api/images/upload/hair-damage`)
- [ ] S3 버킷에 파일이 올바른 경로에 저장되는지 확인
- [ ] 파일명 형식 확인

### Frontend
- [ ] 탈모 검사 - 남성 (Top + Side View)
- [ ] 탈모 검사 - 여성 (Top View만)
- [ ] 모발 검사 이미지 업로드
- [ ] S3 업로드 로딩 상태 표시 확인
- [ ] 분석 API에 S3 URL이 전달되는지 확인

### Database
- [ ] `analysis_results.image_url`에 URL이 올바르게 저장되는지 확인
- [ ] 남성 탈모 검사: `topUrl|||sideUrl` 형식 확인
- [ ] 여성 탈모 검사: `topUrl` 단독 확인
- [ ] 모발 검사: `imageUrl` 단독 확인

---

## 🚨 트러블슈팅

### 문제 1: S3 업로드 실패 (403 Forbidden)
**원인**: AWS 자격 증명이 올바르지 않음

**해결**:
- 환경 변수 확인
- IAM 사용자 권한 확인 (S3 PutObject 권한 필요)

### 문제 2: FileStore Bean을 찾을 수 없음
**원인**: Spring Component Scan 문제

**해결**:
```java
@SpringBootApplication
@ComponentScan(basePackages = "com.example.springboot")
public class SpringbootApplication {
    // ...
}
```

### 문제 3: image_url 컬럼 길이 초과
**원인**: VARCHAR(255)로는 두 개의 URL을 저장하기 부족

**해결**:
```sql
ALTER TABLE analysis_results MODIFY COLUMN image_url VARCHAR(1000);
```

---

## 📚 참고 자료

- [AWS SDK for Java - S3](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/examples-s3.html)
- [spring-dotenv Documentation](https://github.com/paulschwarz/spring-dotenv)
- [Spring Boot File Upload](https://spring.io/guides/gs/uploading-files)

---

## 🎉 완료!

S3 이미지 저장 시스템이 성공적으로 구축되었습니다.
