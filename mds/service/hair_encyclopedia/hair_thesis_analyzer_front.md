# Hair Encyclopedia 프론트엔드 시스템 분석

## 1. 개요

Hair Encyclopedia 프론트엔드 시스템은 사용자가 탈모 관련 정보를 탐색하는 두 가지 주요 기능을 제공합니다. 첫째는 AI 기반의 **논문 검색 기능**이며, 둘째는 전문가가 작성한 컨텐츠를 카테고리별로 탐색하는 **정적 백과사전 기능**입니다.

본 문서는 프론트엔드의 전체적인 구조, 핵심 컴포넌트의 역할, 각 기능별 데이터 흐름 및 상태 관리 원리를 기술합니다.

## 2. 전체 시스템 아키텍처

이 시스템은 **React**와 **TypeScript**를 기반으로 한 **컴포넌트 기반 아키텍처(CBA)**로 구성되어 있습니다. `react-router-dom`을 통해 기능별 페이지 라우팅을 관리하며, `axios` 기반의 `apiClient`를 통해 백엔드(Spring Boot)와 통신합니다.

- **`App.tsx`**: 전체 애플리케이션의 최상위 라우터 및 진입점입니다.
- **`features/hairEncyclopedia`**: 기능의 최상위 폴더입니다.
    - **`HairEncyclopediaMain.tsx`**: Hair Encyclopedia 기능 내의 하위 페이지들을 연결하는 서브 라우터 역할을 합니다.
    - **`components/`**: 실제 UI와 로직을 담고 있는 컴포넌트들이 위치합니다.
        - **`ThesisSearchPage.tsx`**: **AI 논문 검색** 기능의 핵심 페이지입니다.
        - **`HomePage.tsx`, `CategoryPage.tsx`, `ArticlePage.tsx`**: **정적 백과사전** 기능의 핵심 페이지들입니다.

---

## 3. 프론트엔드 흐름 및 구조

### 3.1. 핵심 컴포넌트 역할

1.  **`App.tsx` (애플리케이션 최상위 라우터)**
    - **역할**: 전체 React 애플리케이션의 **최상위 진입점(Entry Point)**이자 **메인 라우터**입니다.
    - **원리**: 모든 페이지 경로를 정의하고, 특정 경로와 컴포넌트를 매핑합니다. `Hair Encyclopedia` 기능과 관련해서는 다음 라우팅 규칙을 통해 연결합니다.
      ```tsx
      <Route path="/hair-encyclopedia/*" element={<HairEncyclopediaMain />} />
      ```
      이 코드는 URL 경로가 `/hair-encyclopedia/`로 시작하는 모든 요청을 `HairEncyclopediaMain` 컴포넌트에게 위임합니다. `*` 와일드카드는 하위 경로에 대한 라우팅 제어권을 `HairEncyclopediaMain`에게 넘긴다는 의미입니다.

2.  **`HairEncyclopediaMain.tsx` (기능 서브 라우터)**
    - **역할**: `App.tsx`로부터 위임받은 Hair Encyclopedia 기능의 **서브 라우터(Sub-router)**이자 **기능 게이트웨이**입니다.
    - **원리**: `App.tsx`로부터 `/hair-encyclopedia/*` 경로의 제어권을 넘겨받아, 그 하위 경로를 다시 정의합니다. 예를 들어, 사용자가 `/hair-encyclopedia/thesis-search` 경로로 접근하면 `ThesisSearchPage` 컴포넌트를, `/hair-encyclopedia/article/123`으로 접근하면 `ArticlePage`를 보여주는 등 기능 내의 상세 페이지 이동을 관리합니다.

3.  **`ThesisSearchPage.tsx` (논문 검색 페이지)**
    - **역할**: **AI 논문 검색 기능의 모든 UI와 비즈니스 로직을 총괄**하는 컨테이너 컴포넌트입니다.
    - **주요 기능**: 백엔드 API와 통신하여 AI 기반으로 논문을 검색하고, 상세 분석 결과를 모달창으로 제공합니다.

4. **`HomePage.tsx`, `CategoryPage.tsx`, `ArticlePage.tsx` (정적 백과사전 페이지)**
    - **역할**: 미리 작성된 전문가 컨텐츠를 보여주는 역할을 합니다. 데이터는 백엔드 API가 아닌, 프론트엔드 프로젝트 내의 로컬 데이터(`src/data/articles.ts`)를 사용합니다.
    - **`HomePage`**: 백과사전의 메인 페이지로, 주요 카테고리 목록을 보여줍니다.
    - **`CategoryPage`**: 특정 카테고리에 속한 아티클 목록을 카드 형태로 보여줍니다.
    - **`ArticlePage`**: 선택된 아티클의 상세 본문을 보여줍니다.

### 3.2. 사용자 흐름 및 데이터 흐름 (AI 논문 검색)

사용자가 AI를 통해 논문을 검색하고 상세 분석을 확인하는 전체 과정은 다음과 같습니다.

**1단계: 페이지 진입 및 초기 데이터 로드**
1.  사용자가 '논문 검색' 메뉴를 통해 `ThesisSearchPage`에 진입합니다.
2.  컴포넌트가 렌더링될 때 `useEffect` 훅이 실행됩니다.
3.  `apiClient.get('/ai/encyclopedia/papers/count')` API를 호출하여 백엔드에 저장된 총 논문 개수를 가져와 화면에 표시합니다. (`paperCount` state)

**2단계: 논문 검색**
1.  사용자가 검색창에 '미녹시딜 효과'와 같은 질문을 입력합니다. 입력값은 `query` state에 실시간으로 저장됩니다.
2.  '검색' 버튼을 클릭하면 `handleSearch` 함수가 실행됩니다.
3.  `loading` 상태를 `true`로 변경하여 로딩 스피너를 표시합니다.
4.  `apiClient.post('/ai/encyclopedia/search', { question: query })` API를 호출하여 백엔드에 검색을 요청합니다.
5.  백엔드로부터 받은 논문 목록(배열)을 `papers` state에 저장합니다.
6.  `loading` 상태를 `false`로 변경하고, `papers` 배열을 화면에 매핑하여 검색 결과를 카드 형태로 렌더링합니다.

**3단계: 상세 분석 결과 확인**
1.  사용자가 검색 결과 목록에서 특정 논문 카드를 클릭하면 `handlePaperClick` 함수가 실행됩니다.
2.  `loading` 상태를 `true`로 변경합니다.
3.  `apiClient.get('/ai/encyclopedia/paper/{paperId}/analysis')` API를 호출하여 해당 논문의 상세 분석 데이터를 요청합니다.
4.  백엔드로부터 받은 상세 분석 데이터(주요 토픽, 핵심 결론, 섹션별 요약 등)를 `selectedPaper` state에 저장합니다.
5.  `showModal` 상태를 `true`로 변경하여 화면에 모달창을 띄웁니다.
6.  모달창 내부는 `selectedPaper` state의 데이터를 사용하여 AI가 분석한 상세 내용을 보여줍니다.
7.  사용자가 닫기 버튼을 누르면 `showModal` 상태가 `false`가 되어 모달이 닫힙니다.

### 3.3. 사용자 흐름 및 데이터 흐름 (정적 컨텐츠 백과사전)

사용자가 미리 작성된 카테고리별 아티클을 탐색하고 읽는 과정입니다. 이 흐름은 백엔드 API 통신 없이 프론트엔드 내부 데이터로만 동작합니다.

**1단계: 진입 및 카테고리 탐색**
1.  사용자가 백과사전 메인(`HomePage`)에 진입하면, 로컬 데이터(`src/data/articles.ts`)에서 가져온 주요 카테고리 목록이 카드 형태로 표시됩니다.
2.  사용자는 특정 카테고리 카드를 클릭하거나, '전체보기'를 통해 `AllCategoriesPage`로 이동하여 원하는 카테고리를 선택합니다.

**2단계: 카테고리별 아티클 목록 보기**
1.  카테고리를 선택하면 `CategoryPage`로 이동합니다. 이때 URL은 `/hair-encyclopedia/category/{categoryId}` 형태가 됩니다.
2.  `CategoryPage` 컴포넌트는 URL의 `categoryId` 파라미터를 읽어옵니다.
3.  로컬 데이터(`articles` 배열)에서 해당 `categoryId`와 일치하는 모든 아티클을 필터링합니다.
4.  필터링된 아티클 목록을 화면에 카드 형태로 렌더링합니다.

**3단계: 아티클 본문 읽기**
1.  사용자가 `CategoryPage`에서 특정 아티클 카드를 클릭하면 `ArticlePage`로 이동합니다. URL은 `/hair-encyclopedia/article/{articleId}` 형태가 됩니다.
2.  `ArticlePage` 컴포넌트는 URL의 `articleId` 파라미터를 읽어옵니다.
3.  로컬 데이터(`articles` 배열)에서 해당 `articleId`와 일치하는 아티클 객체를 찾습니다.
4.  찾아낸 아티클 객체의 `content` (본문)를 정규식을 통해 HTML 태그로 변환하여 화면에 렌더링합니다. 관련 아티클 목록도 같은 방식으로 필터링하여 하단에 보여줍니다.

---

## 4. 상태 관리 및 API 통신

-   **상태 관리 (State Management)**
    -   별도의 전역 상태 관리 라이브러리(Redux, Recoil 등) 없이, React의 기본 훅인 **`useState`** 와 **`useEffect`** 를 사용하여 컴포넌트 내부의 로컬 상태를 관리합니다.
    -   이는 각 기능(AI 검색, 정적 컨텐츠)이 특정 페이지 내에서 독립적으로 동작하여 복잡한 전역 상태 공유가 불필요하기 때문입니다.

-   **API 통신 (API Communication)**
    -   AI 논문 검색 기능(`ThesisSearchPage`)에서만 백엔드와 통신합니다.
    -   `src/api/apiClient.ts` 파일에 `axios` 인스턴스가 설정되어 있으며, 이를 통해 백엔드 API(Spring Boot)와 통신하며 모든 HTTP 요청(GET, POST)을 처리합니다.
    -   API 요청 실패 시 `catch` 블록을 통해 에러를 콘솔에 기록하고 사용자에게 알림창을 띄웁니다.