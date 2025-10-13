# 헤어 밀도 시각화

BiSeNet 기반 헤어 밀도 분석 결과를 초록색 동그라미로 시각화

## 빠른 시작

```bash
# 방법 1: BAT 파일 (추천)
run_test.bat 더블클릭

# 방법 2: Python
python test_visualizer_real.py

# 결과: test_output_fake.jpg 생성
```

---

## API 사용법

### 저밀도 영역 표시
```http
POST /timeseries/visualize-density
{
  "image_url": "https://example.com/hair.jpg",
  "threshold": 30.0
}
```

### 밀도 변화 표시
```http
POST /timeseries/visualize-change
{
  "current_image_url": "...",
  "past_image_urls": ["...", "..."]
}
```

**응답:** `image/jpeg` (시각화된 이미지)

---

## 프론트엔드 예시

```typescript
// React/TypeScript
const visualize = async (imageUrl: string) => {
  const response = await fetch('/timeseries/visualize-density', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, threshold: 30.0 })
  });

  const blob = await response.blob();
  setImage(URL.createObjectURL(blob));
};
```

---

## 커스터마이징

### 임계값 조정
```python
visualizer = DensityVisualizer(threshold=20.0)  # 심각한 탈모만
visualizer = DensityVisualizer(threshold=40.0)  # 조기 징후도
```

### 색상 변경
```python
# BGR 색상
visualizer = DensityVisualizer(circle_color=(0, 255, 0))   # 초록 (기본)
visualizer = DensityVisualizer(circle_color=(0, 0, 255))   # 빨강
visualizer = DensityVisualizer(circle_color=(0, 255, 255)) # 노랑
```

---

## 동작 원리

```
1. BiSeNet 세그멘테이션
   → 머리 영역 추출 (클래스 17)

2. 8x8 그리드 분할
   → 각 셀의 밀도 계산 (0-100%)

3. 저밀도 영역 표시
   → threshold 이하 셀에 초록 타원만 표시 (텍스트 없음)
```

---

## 문제 해결

| 문제 | 해결 |
|------|------|
| Python 없음 | `python --version` 확인 |
| 모듈 없음 | `pip install opencv-python pillow numpy` |
| 이미지 없음 | 콘솔 에러 확인 |
| 동그라미 안 보임 | threshold 높이기 (40.0) |

---

## 파일 구조

```
time_series/
├── services/
│   ├── density_visualizer.py    # 시각화 로직
│   └── density_analyzer.py      # BiSeNet 분석
├── api/router.py                # API 엔드포인트
└── test/
    ├── run_test.bat             # 실행 스크립트
    ├── test_visualizer_real.py  # 테스트 코드
    └── README.md                # 이 문서
```
