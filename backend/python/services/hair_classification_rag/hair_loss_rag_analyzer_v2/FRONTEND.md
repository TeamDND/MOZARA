# Frontend Architecture - Hair Loss RAG Analyzer v2

## Overview

React 기반 여성형 탈모 분석 웹 애플리케이션 (Sinclair Scale 5단계 분류)

**핵심 기술 스택:**
- React 18 (TypeScript)
- TailwindCSS (스타일링)
- Fetch API (Backend 통신)

## Directory Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ImageUpload.tsx        # 이미지 업로드 컴포넌트
│   │   └── AnalysisResult.tsx     # 분석 결과 표시 컴포넌트
│   ├── services/
│   │   └── api.ts                 # Backend API 통신
│   ├── App.tsx                    # 메인 애플리케이션
│   ├── index.tsx                  # 엔트리포인트
│   └── index.css                  # TailwindCSS 설정
├── package.json
└── tsconfig.json
```

## Architecture Diagram

```
[User Interface]
      ↓
┌─────────────────────────────────┐
│  App.tsx (Main Component)       │
│                                  │
│  State Management:               │
│  - primaryImage: File | null     │
│  - analysisResult: Result | null│
│  - isLoading: boolean            │
│  - error: string | null          │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│  ImageUpload.tsx                 │
│                                  │
│  - File input (accept: image/*) │
│  - Image preview                 │
│  - onPrimaryImageSelect callback│
└─────────────────────────────────┘
      ↓
[User clicks "분석하기"]
      ↓
┌─────────────────────────────────┐
│  api.ts - analyzeImage()         │
│                                  │
│  POST /api/analysis/analyze-upload
│  - FormData with image file     │
│  - Returns: AnalysisResult       │
└─────────────────────────────────┘
      ↓
[Backend Processing: ROI BiSeNet + Dual Embedding + Ensemble + LLM]
      ↓
┌─────────────────────────────────┐
│  Backend Response                │
│                                  │
│  {                               │
│    success: true,                │
│    predicted_stage: 2,           │
│    confidence: 0.693,            │
│    stage_scores: {...},          │
│    analysis_details: {...},      │
│    ensemble_results: {...}       │
│  }                               │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│  AnalysisResult.tsx              │
│                                  │
│  - Display predicted stage       │
│  - Display confidence            │
│  - Display stage probabilities   │
│  - Display LLM analysis          │
│  - Display similar images        │
└─────────────────────────────────┘
```

## Core Components

### 1. App.tsx

**역할:** 메인 애플리케이션 컴포넌트, 전체 플로우 관리

**State Management:**
```typescript
const [primaryImage, setPrimaryImage] = useState<File | null>(null);
const [analysisResult, setAnalysisResult] = useState<AnalysisResultData | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Main Flow:**
```typescript
const handleAnalyzeClick = async () => {
  // 1. Validation
  if (!primaryImage) {
    setError('이미지를 업로드해주세요.');
    return;
  }

  // 2. Set loading state
  setIsLoading(true);
  setError(null);
  setAnalysisResult(null);

  // 3. Call API
  const result = await analyzeImage(primaryImage);

  // 4. Handle result
  setAnalysisResult(result);
  if (!result.success) {
    setError(result.error || '분석 중 알 수 없는 오류가 발생했습니다.');
  }

  // 5. Reset loading state
  setIsLoading(false);
};
```

**UI Structure:**
```tsx
<div className="min-h-screen bg-gray-50">
  <header>
    <h1>탈모 유형 분석기 (여성용 v2)</h1>
  </header>

  <main>
    <p>정수리(Top-down) 사진을 업로드하여 탈모 단계를 분석합니다.</p>

    {/* Image Upload Component */}
    <ImageUpload onPrimaryImageSelect={setPrimaryImage} />

    {/* Analyze Button */}
    <button onClick={handleAnalyzeClick} disabled={isLoading || !primaryImage}>
      {isLoading ? '분석 중...' : '분석하기'}
    </button>

    {/* Error Display */}
    {error && <div className="error">{error}</div>}

    {/* Result Display */}
    {analysisResult && <AnalysisResult result={analysisResult} />}
  </main>
</div>
```

### 2. ImageUpload.tsx

**역할:** 이미지 업로드 및 미리보기

**Props:**
```typescript
interface ImageUploadProps {
  onPrimaryImageSelect: (file: File | null) => void;
}
```

**State:**
```typescript
const [primaryPreview, setPrimaryPreview] = useState<string | null>(null);
const primaryInputRef = useRef<HTMLInputElement>(null);
```

**Image Change Handler:**
```typescript
const handleImageChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (file: File | null) => void,
  previewSetter: (url: string | null) => void
) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    setter(file);
    previewSetter(URL.createObjectURL(file));  // Create preview URL
  } else {
    setter(null);
    previewSetter(null);
  }
};
```

**UI:**
```tsx
<div className="flex justify-center items-center gap-8 my-8">
  {/* Hidden file input */}
  <input
    type="file"
    accept="image/*"
    ref={primaryInputRef}
    className="hidden"
    onChange={(e) => handleImageChange(e, onPrimaryImageSelect, setPrimaryPreview)}
  />

  {/* Upload Box (clickable) */}
  <div onClick={() => primaryInputRef.current?.click()}>
    {primaryPreview ? (
      <img src={primaryPreview} alt="Top-down preview" />
    ) : (
      <span>Top-down 이미지</span>
    )}
  </div>
</div>
```

### 3. AnalysisResult.tsx

**역할:** Backend 분석 결과 표시

**Props:**
```typescript
interface AnalysisResultProps {
  result: AnalysisResultData | null;
}
```

**Result Data Structure:**
```typescript
interface AnalysisResult {
  success: boolean;
  predicted_stage?: number;           // 예측된 Sinclair Stage (1-5)
  stage_description?: string;         // 단계 설명
  stage_probabilities?: { [key: string]: number };  // 단계별 확률
  detailed_explanation?: string;      // LLM 분석 설명
  llm_analysis?: string;              // LLM 원본 응답
  error?: string;                     // 오류 메시지
}
```

**Display Sections:**

1. **Predicted Stage Display**
```tsx
<div className="text-center bg-blue-50 p-4 rounded-lg">
  <p className="text-2xl font-bold text-blue-800">
    {norwoodDescription}  {/* 단계 설명 */}
  </p>
  <p className="text-5xl font-extrabold text-blue-600">
    {result.predicted_stage}  {/* 예: 2 */}
  </p>
</div>
```

2. **LLM Analysis Display**
```tsx
<div>
  <h3>상세 추론 (LLM)</h3>
  <p className="whitespace-pre-wrap">
    {llmReasoning}  {/* LLM의 세부 분석 내용 */}
  </p>
</div>
```

3. **Stage Probabilities Display**
```tsx
<div className="space-y-3">
  {probabilities.map(({ level, prob }) => (
    <div key={level} className="flex items-center gap-4">
      <span>Level {level}</span>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-500 h-2.5 rounded-full"
          style={{ width: `${prob * 100}%` }}
        />
      </div>

      <span>{(prob * 100).toFixed(1)}%</span>
    </div>
  ))}
</div>
```

**Stage Description Mapping (Deprecated - needs update):**
```typescript
// NOTE: 이 함수는 Norwood Scale 기준으로 작성되어 있으므로
// Sinclair Scale에 맞게 수정 필요
const getNorwoodDescription = (level: number | undefined): string => {
  if (level === undefined) return 'N/A';
  if (level === 1) return "0단계(정상 단계)";
  if (level >= 2 && level <= 3) return "1단계(초기 단계)";
  if (level >= 4 && level <= 5) return "2단계(중기 단계)";
  if (level >= 6 && level <= 7) return "3단계(심화 단계)";
  return "0단계(정상 단계)";
};

// TODO: Sinclair Scale 기준으로 업데이트
const getSinclairDescription = (level: number | undefined): string => {
  if (level === undefined) return 'N/A';
  if (level === 1) return "Stage 1 (정상)";
  if (level === 2) return "Stage 2 (경증)";
  if (level === 3) return "Stage 3 (중등도)";
  if (level === 4) return "Stage 4 (중증)";
  if (level === 5) return "Stage 5 (최중증)";
  return "Stage 1 (정상)";
};
```

### 4. API Service (services/api.ts)

**역할:** Backend API 통신

**Configuration:**
```typescript
export const API_BASE_URL = "http://localhost:8000"; // 백엔드 서버 주소
```

**Main API Function:**
```typescript
export const analyzeImage = async (file: File): Promise<AnalysisResult> => {
  // 1. Create FormData
  const formData = new FormData();
  formData.append("file", file);

  try {
    // 2. POST request to backend
    const response = await fetch(`${API_BASE_URL}/api/analysis/analyze-upload`, {
      method: "POST",
      body: formData,
    });

    // 3. Handle errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "서버에서 오류가 발생했습니다.");
    }

    // 4. Return parsed JSON
    return await response.json();

  } catch (error) {
    // 5. Error handling
    console.error("API 호출 중 오류 발생:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "알 수 없는 오류가 발생했습니다.";

    return {
      success: false,
      error: errorMessage,
    };
  }
};
```

**API Endpoint:**
- **URL**: `POST /api/analysis/analyze-upload`
- **Content-Type**: `multipart/form-data`
- **Body**: FormData with `file` field
- **Response**: JSON (AnalysisResult)

## Data Flow

### 1. Image Upload Flow

```
User selects image
      ↓
[ImageUpload] handleImageChange()
      ↓
Create preview URL (URL.createObjectURL)
      ↓
Call onPrimaryImageSelect(file)
      ↓
[App] setPrimaryImage(file)
      ↓
Enable "분석하기" button
```

### 2. Analysis Flow

```
User clicks "분석하기"
      ↓
[App] handleAnalyzeClick()
      ↓
Validation: Check if image exists
      ↓
Set isLoading = true
      ↓
[api.ts] analyzeImage(primaryImage)
      ↓
Create FormData & POST to backend
      ↓
Backend Processing (3-5 seconds):
  1. ROI BiSeNet extraction
  2. Dual embedding (ConvNeXt + ViT)
  3. Pinecone dual search
  4. Confidence-weighted ensemble
  5. LLM analysis (optional)
      ↓
Receive AnalysisResult JSON
      ↓
[App] setAnalysisResult(result)
      ↓
Set isLoading = false
      ↓
[AnalysisResult] Display results
```

### 3. Error Handling Flow

```
API Error
      ↓
Catch in analyzeImage()
      ↓
Return { success: false, error: "..." }
      ↓
[App] Check result.success
      ↓
If false: setError(result.error)
      ↓
Display error message in red box
```

## API Response Format

### Success Response

```json
{
  "success": true,
  "method": "llm_enhanced",
  "predicted_stage": 2,
  "confidence": 0.693,
  "stage_description": "Stage 2 (경증) - 가르마 부위 두피가 약간 보이기 시작, 모발 밀도 경미한 감소",
  "analysis_details": {
    "llm_analysis": {
      "part_line_condition": "가르마 부위 상태 설명",
      "crown_density": "정수리 모발 밀도 평가",
      "overall_density": "전체 모발 밀도 평가",
      "key_indicators": ["주요 탈모 징후 1", "주요 탈모 징후 2"]
    },
    "llm_reasoning": "최종 판단 근거",
    "rag_comparison": "RAG 검색 결과와의 비교 분석"
  },
  "ensemble_results": {
    "predicted_stage": 2,
    "confidence": 0.693,
    "stage_scores": {
      "1": 0.123,
      "2": 0.693,
      "3": 0.184,
      "4": 0.000,
      "5": 0.000
    },
    "similar_images": [
      {
        "filename": "data_117.jpg",
        "stage": 2,
        "similarity": 0.857,
        "source": "convnext"
      },
      ...
    ]
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "유사한 이미지를 찾을 수 없습니다"
}
```

## UI States

### 1. Initial State
- Empty image upload box
- "분석하기" button disabled
- No results displayed

### 2. Image Uploaded
- Image preview shown
- "분석하기" button enabled
- No results displayed

### 3. Loading State
- Image preview shown
- "분석하기" button disabled with spinner
- Button text: "분석 중..."
- No results displayed

### 4. Success State
- Image preview shown
- "분석하기" button enabled
- Analysis results displayed:
  - Predicted stage (large number)
  - Stage description
  - Confidence score
  - LLM analysis
  - Stage probabilities (progress bars)

### 5. Error State
- Image preview shown
- "분석하기" button enabled
- Red error box displayed with error message

## Styling (TailwindCSS)

### Color Scheme

- **Primary**: Blue (`bg-blue-600`, `text-blue-600`)
- **Background**: Gray-50 (`bg-gray-50`)
- **Cards**: White (`bg-white`)
- **Error**: Red (`bg-red-100`, `text-red-700`)
- **Success**: Blue-50 (`bg-blue-50`)

### Key Classes

**Button:**
```css
px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md
hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
```

**Result Card:**
```css
w-full max-w-2xl mx-auto mt-8 p-6 bg-white shadow-md rounded-lg
```

**Error Box:**
```css
w-full max-w-2xl mx-auto mt-6 p-4 bg-red-100 border border-red-400
text-red-700 rounded-lg text-center
```

**Progress Bar:**
```css
w-full bg-gray-200 rounded-full h-2.5
bg-blue-500 h-2.5 rounded-full transition-all duration-500
```

## User Experience

### Expected User Flow

1. **Landing**: User sees title "탈모 유형 분석기 (여성용 v2)" and instruction to upload top-down image
2. **Upload**: User clicks upload box, selects image file
3. **Preview**: Image preview appears, "분석하기" button becomes enabled
4. **Analyze**: User clicks "분석하기", sees loading spinner
5. **Wait**: Backend processes for 1-5 seconds
6. **Results**: Results appear with predicted stage, confidence, and detailed analysis

### Performance Expectations

- **Image Upload**: Instant (local preview)
- **Backend Processing**: 1-5 seconds
  - Without LLM: ~1 second
  - With LLM: ~3-5 seconds
- **Result Display**: Instant (after backend response)

## Known Issues & TODO

### Issues

1. **Stage Description Function Outdated**
   - `getNorwoodDescription()` uses Norwood Scale (7 stages)
   - Should be updated to `getSinclairDescription()` for Sinclair Scale (5 stages)
   - Location: [AnalysisResult.tsx:14-21](./frontend/src/components/AnalysisResult.tsx#L14-L21)

2. **API Response Type Mismatch**
   - Frontend expects `stage_probabilities`
   - Backend returns `stage_scores`
   - Should update API interface to match backend response

3. **Similar Images Not Displayed**
   - Backend returns `similar_images` in `ensemble_results`
   - Frontend doesn't display them yet
   - Should add similar images section to AnalysisResult component

### TODO

1. **Update Stage Descriptions**
   ```typescript
   // Replace getNorwoodDescription with getSinclairDescription
   const getSinclairDescription = (level: number | undefined): string => {
     if (level === undefined) return 'N/A';
     if (level === 1) return "Stage 1 (정상) - 정수리 모발 밀도 정상";
     if (level === 2) return "Stage 2 (경증) - 가르마 부위 두피가 약간 보임";
     if (level === 3) return "Stage 3 (중등도) - 가르마 부위 두피 노출 증가";
     if (level === 4) return "Stage 4 (중증) - 정수리 두피 노출 뚜렷";
     if (level === 5) return "Stage 5 (최중증) - 정수리 전체 두피 노출";
     return "Stage 1 (정상)";
   };
   ```

2. **Update API Interface**
   ```typescript
   export interface AnalysisResult {
     success: boolean;
     method?: string;
     predicted_stage?: number;
     confidence?: number;
     stage_description?: string;
     stage_scores?: { [key: string]: number };  // Changed from stage_probabilities
     analysis_details?: {
       llm_analysis?: any;
       llm_reasoning?: string;
       rag_comparison?: string;
     };
     ensemble_results?: {
       predicted_stage?: number;
       confidence?: number;
       stage_scores?: { [key: string]: number };
       similar_images?: Array<{
         filename: string;
         stage: number;
         similarity: number;
         source: string;
       }>;
     };
     error?: string;
   }
   ```

3. **Add Similar Images Display**
   ```tsx
   {/* Similar Images Section */}
   <div className="mt-6">
     <h3 className="text-xl font-semibold text-gray-700 mb-3">유사 이미지</h3>
     <div className="grid grid-cols-3 gap-4">
       {result.ensemble_results?.similar_images?.slice(0, 6).map((img, idx) => (
         <div key={idx} className="border rounded-lg p-2">
           <p className="text-sm">Stage {img.stage}</p>
           <p className="text-xs text-gray-500">유사도: {(img.similarity * 100).toFixed(1)}%</p>
           <p className="text-xs text-gray-400">{img.source}</p>
         </div>
       ))}
     </div>
   </div>
   ```

4. **Add Confidence Display**
   ```tsx
   <div className="mb-4">
     <p className="text-sm text-gray-600">분석 신뢰도</p>
     <p className="text-xl font-bold text-blue-600">
       {(result.confidence * 100).toFixed(1)}%
     </p>
   </div>
   ```

5. **Add Ensemble Details Toggle**
   ```tsx
   const [showDetails, setShowDetails] = useState(false);

   <button onClick={() => setShowDetails(!showDetails)}>
     {showDetails ? '상세 정보 숨기기' : '상세 정보 보기'}
   </button>

   {showDetails && (
     <div className="mt-4 p-4 bg-gray-50 rounded">
       <h4>앙상블 상세 정보</h4>
       <p>ConvNeXt 가중치: {ensemble_details?.dynamic_weights?.conv_weight}</p>
       <p>ViT 가중치: {ensemble_details?.dynamic_weights?.vit_weight}</p>
     </div>
   )}
   ```

## Development

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Environment Variables

Create `.env` file:
```bash
REACT_APP_API_BASE_URL=http://localhost:8000
```

Update `api.ts`:
```typescript
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Deployment

### Production Build

```bash
npm run build
```

Output: `build/` directory with optimized static files

### Deployment Options

1. **Serve with Backend (FastAPI)**
   ```python
   # main.py
   from fastapi.staticfiles import StaticFiles

   app.mount("/", StaticFiles(directory="frontend/build", html=True), name="static")
   ```

2. **Deploy to Netlify/Vercel**
   - Build command: `npm run build`
   - Publish directory: `build`
   - Set `REACT_APP_API_BASE_URL` environment variable

3. **Deploy with Nginx**
   ```nginx
   server {
     listen 80;
     server_name example.com;

     root /var/www/frontend/build;
     index index.html;

     location / {
       try_files $uri /index.html;
     }

     location /api {
       proxy_pass http://localhost:8000;
     }
   }
   ```

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

- Semantic HTML elements
- Alt text for images
- Keyboard navigation support
- Screen reader friendly error messages

## Security

- No inline scripts (CSP compliant)
- HTTPS recommended for production
- File size validation (handled by backend)
- File type validation (accept="image/*")

## Performance Optimization

1. **Image Preview**: Use `URL.createObjectURL()` for fast preview
2. **Lazy Loading**: Components load only when needed
3. **Memoization**: Consider using `React.memo` for AnalysisResult
4. **Code Splitting**: Use dynamic imports for large components

## Future Enhancements

1. **Multi-Image Upload**: Support before/after comparison
2. **Image Cropping**: Allow user to adjust ROI
3. **Result History**: Save analysis history in localStorage
4. **Export Results**: Export as PDF or image
5. **Dark Mode**: Add theme toggle
6. **Internationalization**: Support multiple languages
7. **Progressive Web App**: Add offline support
8. **Real-time Analysis**: WebSocket for streaming results

## References

- **React Documentation**: https://react.dev/
- **TailwindCSS**: https://tailwindcss.com/
- **TypeScript**: https://www.typescriptlang.org/
- **Fetch API**: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
