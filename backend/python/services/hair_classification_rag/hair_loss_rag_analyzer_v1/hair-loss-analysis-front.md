# 프론트엔드 시스템 분석 (Hair Loss Analysis Frontend)

## 1. 프로젝트 구조 (Project Structure)

```
frontend/
└── src/
    ├── components/
    │   ├── ImageUpload.tsx      # 이미지 업로드 및 미리보기 UI
    │   └── AnalysisResult.tsx   # 분석 결과 표시 UI
    ├── services/
    │   └── api.ts               # 백엔드 API 연동 함수
    ├── App.tsx                  # 메인 애플리케이션 컴포넌트
    ├── index.css                # Tailwind CSS 지시문 및 전역 스타일
    └── index.tsx                # React 앱 진입점
```

## 2. 핵심 기술 스택 (Core Tech Stack)

- **Core Framework**: React
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Create React App (`react-scripts`)

## 3. 컴포넌트 구성 및 흐름 (Component Structure & Flow)

- **`App.tsx`**: 
    - **역할**: 애플리케이션의 최상위 컴포넌트로, 모든 상태를 관리하는 컨테이너 역할을 합니다.
    - **상태 관리**: `useState` 훅을 사용하여 다음 상태들을 관리합니다.
        - `primaryImage`, `secondaryImage`: 사용자가 업로드한 두 개의 이미지 파일 (`File` 객체).
        - `analysisResult`: 백엔드로부터 받은 분석 결과 JSON 객체.
        - `isLoading`: 분석이 진행 중인지 여부 (로딩 상태).
        - `error`: 에러 메시지.
    - **흐름**: `ImageUpload` 컴포넌트로부터 이미지 파일을 받아 상태를 업데이트하고, "분석하기" 버튼 클릭 시 `handleAnalyzeClick` 함수를 실행하여 `api.ts`의 `analyzeImages`를 호출합니다. 로딩 상태를 관리하고, 최종 결과를 `AnalysisResult` 컴포넌트로 전달합니다.

- **`components/ImageUpload.tsx`**: 
    - **역할**: 사용자가 두 개의 이미지를 업로드할 수 있는 UI를 제공합니다.
    - **흐름**: 각 "이미지 업로드" 박스를 클릭하면 숨겨진 `<input type="file">`이 실행됩니다. 사용자가 이미지를 선택하면, 해당 파일 객체를 `props`로 전달받은 `onPrimaryImageSelect`, `onSecondaryImageSelect` 함수를 통해 부모 컴포넌트(`App.tsx`)로 전달합니다. 또한, 선택된 이미지의 미리보기를 화면에 표시합니다.

- **`components/AnalysisResult.tsx`**: 
    - **역할**: `App.tsx`로부터 받은 분석 결과(`result` 객체)를 시각적으로 표시합니다.
    - **흐름**: `result` 객체의 `success` 필드 값에 따라 성공 또는 실패 UI를 렌더링합니다. 
    - **핵심 로직**: 백엔드 의존성을 제거하기 위해, `predicted_stage`(1~7 레벨) 값을 받아 "탈모 단계 스케일"(0~3단계)로 변환하는 `getNorwoodDescription` 헬퍼 함수를 내장하고 있습니다. 이 함수를 통해 계산된 값을 화면에 표시합니다. 또한, `stage_probabilities` 딕셔너리를 배열로 변환하여 레벨별 확률을 막대그래프 형태로 보여줍니다.

- **`services/api.ts`**: 
    - **역할**: 백엔드 API와의 통신 로직을 담당합니다.
    - **흐름**: `analyzeImages` 함수는 두 개의 `File` 객체를 인자로 받아 `FormData`를 생성합니다. 이 `FormData`를 body에 담아 백엔드의 `/api/analysis/analyze-dual-upload` 엔드포인트로 `fetch` API를 사용하여 `POST` 요청을 보냅니다. 성공 또는 실패 시의 JSON 응답을 반환합니다.

## 4. 데이터 흐름 (Data Flow)

1.  **이미지 선택**: 사용자가 `ImageUpload` 컴포넌트에서 2개의 이미지를 선택합니다.
2.  **상태 업데이트**: 선택된 `File` 객체들이 `App` 컴포넌트의 `primaryImage`, `secondaryImage` 상태에 저장됩니다.
3.  **분석 요청**: 사용자가 "분석하기" 버튼을 클릭하면 `App` 컴포넌트의 `handleAnalyzeClick` 함수가 호출됩니다.
4.  **API 호출**: `handleAnalyzeClick` 함수는 `services/api.ts`의 `analyzeImages` 함수를 호출하여 백엔드로 이미지 파일을 전송합니다.
5.  **응답 처리**: `analyzeImages` 함수는 백엔드로부터 받은 JSON 응답을 `App` 컴포넌트로 반환합니다.
6.  **결과 저장**: `App` 컴포넌트는 반환된 JSON 객체를 `analysisResult` 상태에 저장합니다.
7.  **화면 렌더링**: `analysisResult` 상태가 업데이트되면, `AnalysisResult` 컴포넌트가 새로운 `props`를 받아 리렌더링되면서 최종 분석 결과를 화면에 표시합니다.
