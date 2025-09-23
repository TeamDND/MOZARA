# 프로젝트 폴더 구조 가이드

React 기반 탈모 서비스(예: 모자라 서비스)의 기본 폴더 구조와
설명입니다.\
`cursor`나 팀원들이 이 구조를 기준으로 코드를 정리하면 유지보수가
쉬워집니다.

------------------------------------------------------------------------

## 📂 public/

외부에서 직접 접근 가능한 정적 파일을 저장합니다.\
빌드 시 가공되지 않고 그대로 배포됩니다.

-   `favicon.ico`\
-   `robots.txt`\
-   `og-image.png` (SNS 공유용 이미지)

**예시 (이미지 접근):**

``` html
<img src="/logo.png" alt="서비스 로고" />
```

------------------------------------------------------------------------

## 📂 src/

프로젝트의 실제 소스 코드 전체가 들어갑니다.

### 📂 assets/

프로젝트 전반에서 사용되는 정적 리소스 (이미지, 폰트, CSS 등)를
저장합니다.\
빌드 시 최적화되고, `import` 해서 사용합니다.

-   `assets/images/logo.png`\
-   `assets/fonts/NotoSansKR.woff2`

**예시:**

``` tsx
import logo from "@/assets/images/logo.png";

<img src={logo} alt="서비스 로고" />
```

------------------------------------------------------------------------

### 📂 components/

재사용 가능한 UI 컴포넌트를 모아둡니다.\
(페이지에 종속적이지 않고, 여러 곳에서 활용 가능)

-   `Button.tsx`\
-   `Modal.tsx`\
-   `PhotoUpload.tsx`

**예시:**

``` tsx
// components/Button.tsx
export function Button({ children }) {
  return <button className="px-4 py-2 bg-blue-500 text-white">{children}</button>;
}
```

------------------------------------------------------------------------

### 📂 pages/ (또는 views/)

라우팅될 페이지 단위의 컴포넌트를 저장합니다.\
각 페이지는 자체 UI + 로직을 가질 수 있습니다.
페이지 안에는 기능별로 check, hair_solutions, hair_contents 폴더로 나눠있습니다.

-   `pages/index.tsx` (랜딩 페이지)\
-   `pages/analysis.tsx` (분석 페이지)\
-   `pages/self-check.tsx` (자가체크 페이지)

------------------------------------------------------------------------

### 📂 services/ (또는 api/)

백엔드 API 호출 등 **데이터 통신 로직**을 담당합니다.\
주로 `axios` 또는 `fetch` 래퍼로 작성합니다.

-   `auth.service.ts`\
-   `analysis.service.ts`\
-   `products.service.ts`

**예시:**

``` ts
// services/analysis.service.ts
import http from "./http";

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return http.post("/analysis/upload", formData);
}
```

------------------------------------------------------------------------

### 📂 utils/

여러 곳에서 공통적으로 쓰이는 유틸 함수들을 모읍니다.

-   `date.ts` (날짜 포맷)\
-   `validation.ts` (데이터 유효성 검사)\
-   `basp.ts` (BASP 코드 계산)

**예시:**

``` ts
// utils/date.ts
export function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}
```

------------------------------------------------------------------------

### 📂 hooks/

재사용 가능한 커스텀 훅을 모아둡니다.\
여러 컴포넌트에서 같은 로직을 공유할 때 유용합니다.

-   `useAuth.ts`\
-   `useUpload.ts`\
-   `useBaspQuestionnaire.ts`

**예시:**

``` ts
// hooks/useAuth.ts
import { useState } from "react";
import { login } from "@/services/auth.service";

export function useAuth() {
  const [user, setUser] = useState(null);

  async function handleLogin(email: string, pw: string) {
    const res = await login(email, pw);
    setUser(res.user);
  }

  return { user, handleLogin };
}
```

------------------------------------------------------------------------

### 📂 styles/

전역 스타일, 테마, 공통 CSS 파일을 저장합니다.

-   `globals.css`\
-   `theme.css`\
-   `tokens.css` (디자인 토큰)

------------------------------------------------------------------------

## ✅ 정리

-   **`public/`** → 외부 접근 가능, 가공되지 않음 (favicon, robots.txt,
    OG 이미지 등)\
-   **`assets/`** → 프로젝트 내 정적 리소스 (이미지, 폰트, CSS)\
-   **`components/`** → 재사용 가능한 UI 조각\
-   **`pages/`** → 라우팅되는 페이지 단위\
-   **`services/`** → API 통신\
-   **`utils/`** → 공통 함수\
-   **`hooks/`** → 상태/로직 재사용\
-   **`styles/`** → 전역 스타일 관리
