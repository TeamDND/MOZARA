# 📋 관리자 페이지 구현 계획

## 🎯 전체 흐름
```
Admin Dashboard → User Detail → Report View
     ↓                ↓              ↓
  유저 목록      유저정보+레포트    레포트 상세
  (Pageable)      카드 목록        (읽기전용)
```

---

## 🏗️ 1. 백엔드 구조

### 📁 새로 생성할 파일
**`AdminController.java`**
```
경로: backend/springboot/src/main/java/com/example/springboot/controller/admin/
기능:
  - GET /api/admin/users?page=0&size=20
    → 전체 유저 목록 (Pageable, userId + username만)
  - GET /api/admin/user/{username}/info
    → UserController의 /userinfo/{username} 재사용
  - GET /api/admin/user/{username}/reports
    → MyPageController의 /analysis-results/username/{username} 재사용
```

---

## 🎨 2. 프론트엔드 구조

### 📁 생성할 파일 구조
```
frontend/src/pages/admin/
├── AdminDashboard.tsx     // 메인: 유저 목록 (페이징)
├── AdminUserDetail.tsx    // 유저 상세: 정보 + 레포트 목록
└── AdminReportView.tsx    // 레포트 상세 (MyReportPage 재사용)
```

---

### 📄 **AdminDashboard.tsx** (유저 목록)
**기능:**
- 전체 유저를 20개씩 페이징으로 표시
- 카드 형태: `userId | username`
- 카드 클릭 → AdminUserDetail로 이동

**참고:**
- `AdminReport.js`의 테이블 스타일 참고
- 페이징은 `@mui/material Pagination` 또는 커스텀 구현

**API:**
```typescript
GET /api/admin/users?page=0&size=20
Response: {
  content: [{ userId: 1, username: "user1" }, ...],
  totalPages: 5,
  currentPage: 0
}
```

---

### 📄 **AdminUserDetail.tsx** (유저 상세 + 레포트 목록)
**구성:**
1. **상단: 유저 정보 섹션**
   - UserInfoDTO 전체 필드 표시
   - 카드 형태로 예쁘게 정리

2. **하단: 레포트 목록**
   - MyPage처럼 카드 형태
   - 클릭 시 AdminReportView로 이동

**API:**
```typescript
// 1. 유저 정보
GET /api/userinfo/{username}

// 2. 레포트 목록
GET /api/analysis-results/username/{username}
```

---

### 📄 **AdminReportView.tsx** (레포트 상세)
**기능:**
- MyReportPage.tsx와 동일한 UI
- 읽기 전용 (수정 기능 비활성화)

**구현:**
```typescript
// MyReportPage를 재사용하고 readOnly prop 추가
<MyReportPage
  analysisResult={selectedReport}
  readOnly={true}
/>
```

---

## 🔐 3. 권한 처리

### Header 수정
**위치:** `frontend/src/pages/Header.tsx` 또는 `MainLayout.tsx`

**추가 내용:**
```tsx
const user = useSelector((state: RootState) => state.user);

{user.role === 'ROLE_ADMIN' && (
  <IconButton onClick={() => navigate('/admin')}>
    <Settings /> {/* 톱니바퀴 아이콘 */}
  </IconButton>
)}
```

### 라우팅 (App.tsx)
```tsx
<Route path="admin" element={<AdminDashboard />} />
<Route path="admin/user/:username" element={<AdminUserDetail />} />
<Route path="admin/report/:reportId" element={<AdminReportView />} />
```

### 백엔드 SecurityConfig
```java
.requestMatchers("/api/admin/**").hasRole("ADMIN")
```
→ 이미 설정되어 있는지 확인 필요

---

## 📊 4. 데이터 흐름

```
1. AdminDashboard
   ↓ GET /api/admin/users?page=0&size=20
   [{ userId: 1, username: "user1" }, ...]

2. Click user card → navigate('/admin/user/user1')
   ↓ GET /api/userinfo/user1
   ↓ GET /api/analysis-results/username/user1
   { userInfo: {...}, reports: [...] }

3. Click report card → navigate('/admin/report/123')
   ↓ GET /api/analysis-result/123
   { reportDetail: {...} }
```

---

## ✅ 체크리스트

**백엔드:**
- [ ] AdminController.java 생성
- [ ] AdminService.java 생성 (유저 목록 페이징 로직)
- [ ] SecurityConfig에 `/api/admin/**` 권한 설정 확인

**프론트엔드:**
- [ ] AdminDashboard.tsx 생성
- [ ] AdminUserDetail.tsx 생성
- [ ] AdminReportView.tsx 생성
- [ ] Header에 톱니바퀴 아이콘 추가 (ROLE_ADMIN만 표시)
- [ ] App.tsx 라우팅 추가

**테스트:**
- [ ] ADMIN 계정으로 로그인 → 톱니바퀴 보이는지
- [ ] 유저 목록 페이징 동작 확인
- [ ] 유저 상세 정보 + 레포트 목록 표시 확인
- [ ] 레포트 상세 보기 확인 (읽기전용)

---

## 📝 참고 파일
- 참고 프로젝트: `C:\Users\301\Desktop\project_template\hibnb\HIBNB_Project_testing\frontend\src\AdminPage\AdminReport.js`
- UserController: `backend/springboot/src/main/java/com/example/springboot/controller/user/UserController.java`
- MyPageController: `backend/springboot/src/main/java/com/example/springboot/controller/user/MyPageController.java`
