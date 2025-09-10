# basp.md

> 목적: BASP 분류(간소화)를 이용한 **탈모 자가진단** 기능을 모바일 웹에 구현한다. 의학적 진단이 아닌 **참고용 평가**이며, 결과는 사용자 친화적 텍스트와 가이드로 제공한다.

---

## 1) 기준 개요

- **BASP (Basic And Specific classification)**  
  - **Basic**: 이마/헤어라인 형태 (A/M/C/U 등)  
  - **Specific**: 정수리(Vertex) 진행 정도 (V0~V3 등)  
- 본 문서는 **일반 사용자 자가진단**을 위해 BASP를 단순화하여 적용한다.
- **법적 고지**: “본 도구는 의료 진단이 아닌 참고용입니다. 증상이 지속·악화되면 전문의 상담을 권장합니다.”

---

## 2) 사용자 여정(UX 플로우)

1. **인트로**  
   - 카피: “간단한 질문으로 현재 모발 상태를 확인해요. 의료 진단이 아닌 참고용입니다.”  
   - 버튼: 시작하기

2. **Step 1 — 헤어라인(앞이마) 선택**  
   - 질문: “당신의 앞이마 헤어라인은 어떤가요?”  
   - 옵션(이미지/아이콘 병행):  
     - **A**: 일자형·안정적  
     - **M**: 양측 이마 후퇴(M자 경향)  
     - **C**: 곡선형 후퇴  
     - **U**: 넓은 이마 상승(전체 후퇴)

3. **Step 2 — 정수리(Vertex) 상태**  
   - 질문: “정수리 부위의 두피 노출 정도를 선택해 주세요.”  
   - 옵션(썸네일 4단계):  
     - **V0**: 정상(두피 거의 안 보임)  
     - **V1**: 약간 감소  
     - **V2**: 감소  
     - **V3**: 넓은 감소

4. **Step 3 — 전체 밀도(Density)**  
   - 질문: “전체적으로 모발 밀도는 어떤가요?”  
   - 옵션(4단계): **0 풍성 / 1 살짝 얇음 / 2 줄어듦 / 3 심함**

5. **Step 4 — 생활 습관(Lifestyle) 보조지표**  
   - 체크/선택:  
     - 최근 6개월간 빠짐 증가 느낌 (예/아니오)  
     - 가족력 (예/아니오)  
     - 수면 시간 (4시간 미만 / 5~7시간 / 8시간 이상)  
     - 흡연 (예/아니오)  
     - 음주 (안 함 / 가끔 / 잦음)

6. **결과(Result)**  
   - 노출 항목:  
     - **BASP 기본형**: A/M/C/U  
     - **정수리 특이**: V0~V3  
     - **진행 정도**: 정상 / 초기 / 중등도 / 진행성  
     - 사용자 친화 요약 텍스트  
     - 생활/제품/상담 가이드(리스트)  
     - 고지 문구(디스클레이머)  
   - CTA: “관리 루틴 받기”, “전문의 상담”

---

## 3) 데이터 모델(프론트 기준)

```ts
type HairlineType = 'A' | 'M' | 'C' | 'U';
type VertexLevel = 0 | 1 | 2 | 3;   // V0~V3
type DensityLevel = 0 | 1 | 2 | 3;  // 0~3

interface LifestyleAnswers {
  shedding6m: boolean;              // 6개월간 탈락모 증가 느낌
  familyHistory: boolean;           // 가족력
  sleepHours: 'lt4' | '5to7' | 'ge8';
  smoking: boolean;
  alcohol: 'none' | 'light' | 'heavy';
}

interface SelfCheckAnswers {
  hairline: HairlineType | null;
  vertex: VertexLevel | null;
  density: DensityLevel | null;
  lifestyle: LifestyleAnswers;
}

interface BaselineResult {
  baspBasic: HairlineType;          // A/M/C/U
  baspSpecific: `V${VertexLevel}`;  // V0~V3
  stageLabel: '정상' | '초기' | '중등도' | '진행성';
  summaryText: string;
  recommendations: string[];
  disclaimers: string[];
}
```

---

## 4) 평가(스코어링) 로직

- **Lifestyle Risk (0~8)**  
  - shedding6m: +2  
  - familyHistory: +2  
  - sleepHours: lt4 = +2 / 5to7 = +1 / ge8 = +0  
  - smoking: +1  
  - alcohol: heavy = +1 (light/none = +0)

- **Raw Score 계산**  
  ```
  v = vertex(0~3)
  d = density(0~3)
  risk = lifestyleRisk(0~8)
  riskBucket = min(2, floor(risk/3))   // 0~2

  raw = v + d + riskBucket              // 0~8
  ```

- **진행 정도(stageLabel) 매핑**  
  - 0: **정상**  
  - 1~2: **초기**  
  - 3~5: **중등도**  
  - 6~8: **진행성**

- **결과 텍스트 구성 규칙**  
  - 헤어라인 설명:  
    - A: “이마 라인 안정적”  
    - M: “양측 이마 후퇴(M형 경향)”  
    - C: “곡선형 후퇴(C형 경향)”  
    - U: “넓은 이마 상승(U형 경향)”  
  - 정수리 설명:  
    - V0: “정수리 정상” / V1: “약간 감소” / V2: “감소” / V3: “넓은 감소”  
  - 샘플: `“양측 이마 후퇴(M형 경향), 정수리 약간 감소. 생활습관 리스크 점수: 5”`

- **권장 가이드(예시)**  
  - 단계 공통: “본 도구는 의료 진단이 아닌 참고용입니다. 지속 시 전문의 상담 권장.”  
  - 정상/초기: 순한 두피 샴푸, 7~8시간 수면, 분기별 셀프 체크  
  - 중등도/진행성: 전문의 상담/치료 옵션 안내, 주간 관찰 리포트

---

## 5) UI 구성 요구사항

- **선택형 카드**(A/M/C/U, V0~V3, Density 0~3)는 이미지 썸네일 + 라벨 병행  
- **다음 버튼 비활성화 규칙**: hairline/vertex/density 중 null 존재 시 비활성화  
- **접근성**: aria-pressed, 키보드 포커스 스타일 적용  
- **진행바**: 인트로 → 1/4 → 2/4 → 3/4 → 4/4 → 결과  
- **디스클레이머**: 인트로 & 결과 화면 하단 고정 노출

---

## 6) 백엔드 최소 요구사항

- **저장 선택형**: 규제/프라이버시 이슈로 기본은 **미저장**.  
  - 저장이 필요하면 최소 필드(타임스탬프, stageLabel, baspBasic, baspSpecific, risk 합계)만 익명화해 적재.  
- **엔드포인트**  
  - `POST /api/selfcheck/evaluate`  
    - 요청: `SelfCheckAnswers`  
    - 응답: `{ ok: true }` (또는 서버측 규칙/모델을 추가로 수행 시 결과 포함)

---

## 7) 검증 및 수락 기준(AC)

1. hairline/vertex/density가 모두 선택되면 결과를 산출한다.  
2. 결과에는 **baspBasic, baspSpecific, stageLabel, summaryText, recommendations, disclaimers** 가 포함된다.  
3. 동일 입력에 대해 **결과 산식(raw & stageLabel)** 이 안정적으로 재현된다.  
4. 모바일(375px~)에서 한 손 조작이 가능하며, 3~5분 내 완료 가능하다.  
5. 모든 화면에 **의료 고지 문구**가 노출된다(인트로/결과 필수).  
6. 접근성(키보드 포커스, aria-* 속성) 기본 준수.

---

## 8) 샘플 I/O

**입력**
```json
{
  "hairline": "M",
  "vertex": 1,
  "density": 1,
  "lifestyle": {
    "shedding6m": true,
    "familyHistory": true,
    "sleepHours": "5to7",
    "smoking": false,
    "alcohol": "light"
  }
}
```

**평가 과정**  
- v=1, d=1 → 2  
- lifestyleRisk: 2(빠짐) + 2(가족력) + 1(수면 5~7) + 0 + 0 = **5**  
- riskBucket = floor(5/3)=1 → min(2,1)=**1**  
- raw = 1 + 1 + 1 = **3** → **중등도**

**출력(요지)**
```json
{
  "baspBasic": "M",
  "baspSpecific": "V1",
  "stageLabel": "중등도",
  "summaryText": "양측 이마 후퇴(M형 경향), 정수리 약간 감소. 생활습관 리스크 점수: 5",
  "recommendations": [
    "순한 두피 전용 샴푸 사용",
    "수면 7~8시간 확보",
    "지속 시 전문의 상담 권장",
    "가족력 있으므로 정기적 모니터링"
  ],
  "disclaimers": [
    "본 도구는 의료 진단이 아닌 참고용입니다.",
    "증상이 지속·악화되면 피부과 전문의 상담을 권장합니다."
  ]
}
```

---

## 9) Cursor 작업 지시(Tasks 예시)

1. **타입/모델 생성**  
   - `src/features/selfcheck/types.ts` 및 `logic.ts` 생성  
   - 위 데이터 모델 & 스코어링 규칙 구현

2. **UI 컴포넌트**  
   - `HairlineSelector`, `VertexSelector`, `DensitySelector`, `LifestyleForm` 생성  
   - 접근성/모바일 레이아웃 반영

3. **페이지 라우팅**  
   - `/check/intro`, `/check/step-1..4`, `/check/result` 라우트 추가  
   - 진행바/다음 버튼 상태 관리

4. **결과 페이지**  
   - `computeResult` 결과 바인딩  
   - 추천/디스클레이머/CTA 노출

5. **백엔드(옵션)**  
   - `POST /api/selfcheck/evaluate` 엔드포인트 생성  
   - (기본 미저장) 응답 `{ ok: true }` 반환

6. **테스트**  
   - 샘플 I/O로 결과 **중등도**가 일치하는지 확인  
   - hairline/vertex/density 미선택 시 이동 차단 확인

---

## 10) 확장 가이드(선택)

- 썸네일: 간단한 **SVG 실루엣**으로 A/M/C/U, V0~V3 차이 표현  
- i18n: `ko` → `en` 키 기반 사전 분리  
- 관리자용: 입력값을 BASP 코드(A/M/C/U + V0~V3)로 저장하여 통계/리서치 활용  
- 개인정보: 이미지·개인 식별정보는 기본 **비수집**, 수집 시 명시적 동의 및 최소화

---

**끝.**  
이 문서를 Cursor “Tasks”에 붙여 넣고 단계별로 생성/수정 지시하면 됩니다.
