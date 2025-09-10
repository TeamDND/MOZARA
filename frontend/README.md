# MOZARA Frontend

이 프로젝트는 TypeScript와 Tailwind CSS를 사용한 React 기반 프론트엔드 애플리케이션입니다.

## 🚀 기술 스택

- **TypeScript**: 타입 안전성을 제공하는 JavaScript의 상위 집합
- **React 19**: 사용자 인터페이스 구축을 위한 JavaScript 라이브러리
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **Redux Toolkit**: 상태 관리 라이브러리
- **React Router**: 클라이언트 사이드 라우팅
- **Axios**: HTTP 클라이언트

## 📦 설치 및 실행

### 필수 요구사항
- Node.js 16.0.0 이상
- npm 또는 yarn

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm start
```

### 빌드
```bash
npm run build
```

### 테스트
```bash
npm test
```

## 🏗️ 프로젝트 구조

```
src/
├── api/           # API 클라이언트 및 통신 관련
├── components/    # 재사용 가능한 UI 컴포넌트
├── page/          # 페이지 레이아웃 컴포넌트
├── store/         # Redux 상태 관리
├── style/         # 스타일 관련 파일들
├── user/          # 사용자 관련 컴포넌트
└── service/       # 비즈니스 로직 서비스
```

## 🎨 TypeScript 주요 특징

### 타입 정의
- 모든 컴포넌트에 `React.FC` 타입 적용
- 이벤트 핸들러에 적절한 이벤트 타입 지정
- 상태 관리에 제네릭 타입 사용

### 예시
```typescript
// 컴포넌트 타입 정의
const Login: React.FC = () => {
  // 상태 타입 정의
  const [id, setId] = useState<string>('');
  
  // 이벤트 핸들러 타입 정의
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    // ...
  };
};
```

## 🎨 Tailwind CSS 주요 특징

### 유틸리티 클래스
- 반응형 디자인을 위한 브레이크포인트 클래스
- 색상, 간격, 타이포그래피 등의 유틸리티 클래스
- 커스텀 색상 및 테마 설정

### 예시
```jsx
// 반응형 컨테이너
<div className="container mx-auto px-4 py-8">

// 반응형 텍스트
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">

// 색상 및 간격
<button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90">
```

## 🔧 개발 가이드

### 새로운 컴포넌트 생성
1. `.tsx` 확장자 사용
2. `React.FC` 타입 지정
3. Tailwind CSS 클래스 활용

### 상태 관리
- Redux Toolkit 사용
- TypeScript 인터페이스로 상태 타입 정의
- 액션 페이로드 타입 지정

### API 통신
- Axios 인터셉터 활용
- 타입 안전한 요청/응답 처리
- 에러 핸들링

## 📝 주요 변경사항

### TypeScript 마이그레이션
- 모든 `.js` 파일을 `.tsx`로 변환
- 타입 정의 및 인터페이스 추가
- 이벤트 핸들러 타입 지정

### Tailwind CSS 적용
- 기존 CSS 파일을 Tailwind 유틸리티 클래스로 대체
- 반응형 디자인 구현
- 커스텀 색상 테마 설정

## 🤝 팀원들을 위한 가이드

### TypeScript 학습 포인트
1. **타입 정의**: 변수, 함수, 컴포넌트의 타입을 명시적으로 정의
2. **인터페이스**: 객체의 구조를 정의하여 타입 안전성 확보
3. **제네릭**: 재사용 가능한 타입을 만드는 방법

### Tailwind CSS 학습 포인트
1. **유틸리티 클래스**: HTML 클래스로 스타일을 직접 적용
2. **반응형 디자인**: `sm:`, `md:`, `lg:` 등의 브레이크포인트 활용
3. **커스텀 설정**: `tailwind.config.js`에서 테마 커스터마이징

## 🐛 문제 해결

### TypeScript 오류
- 타입 정의 확인
- `tsconfig.json` 설정 검토
- 필요한 타입 패키지 설치

### Tailwind CSS 스타일 미적용
- `tailwind.config.js` 설정 확인
- 클래스명 철자 확인
- PostCSS 설정 검토

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.
