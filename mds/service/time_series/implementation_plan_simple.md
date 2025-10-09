# Time-Series 독립 모듈 구현 계획 (단순화)

> **작성일**: 2025-10-07
> **원칙**: 기존 Swin 코드와 완전 분리, 최소한의 의존성

---

## 📁 폴더 구조

```
main_project/
│
├── backend/
│   ├── python/
│   │   └── services/
│   │       ├── swin_hair_classification/    # 기존 코드 (수정 안 함)
│   │       │   ├── models/
│   │       │   ├── hair_swin_check.py
│   │       │   └── ...
│   │       │
│   │       └── time_series/                 # ✨ 신규 폴더 (완전 독립)
│   │           ├── __init__.py
│   │           ├── density_analyzer.py      # BiSeNet 밀도 측정
│   │           ├── feature_extractor.py     # Swin feature 추출
│   │           ├── timeseries_comparator.py # 시계열 비교
│   │           └── api.py                   # FastAPI 엔드포인트
│   │
│   └── springboot/
│       └── src/main/java/.../controller/
│           └── TimeSeriesController.java    # ✨ 신규 컨트롤러
│
└── frontend/
    └── src/
        ├── pages/hair_dailycare/
        │   └── DailyCare.tsx                # 기존 파일 (최소 수정)
        │
        └── components/timeseries/           # ✨ 신규 컴포넌트 폴더
            ├── TimeSeriesChart.tsx
            ├── DensityHeatmap.tsx
            └── TrendSummary.tsx
```

---

## 🔄 데이터 흐름 (단순화)

### Step 1: 분석 시점에 데이터 저장 (기존 흐름 활용)

```
사용자가 DailyCare에서 사진 업로드
  ↓
기존 Swin API 호출 (/ai/hair-loss-daily/analyze)
  ↓
분석 결과 + 이미지 URL → DB 저장
  ✅ 기존 코드 그대로 사용 (수정 없음)
```

### Step 2: 시계열 분석 요청 (신규)

```
사용자가 "변화 추이 보기" 버튼 클릭
  ↓
Frontend → Spring Boot (/api/timeseries/analyze)
  ↓
Spring Boot → DB에서 과거 분석 결과 조회 (이미지 URL 포함)
  ↓
Spring Boot → Python Time-Series API 호출
  ↓
Python:
  1. 이미지 URL로 S3에서 이미지 다운로드
  2. BiSeNet으로 밀도 측정
  3. Swin으로 feature 추출
  4. 시계열 비교 분석
  ↓
결과 반환 → Frontend 시각화
```

---

## 🎯 핵심 원칙

### 1. 기존 Swin 코드 수정 ❌
- `swin_hair_classification/` 폴더는 **절대 수정 안 함**
- 대신 **모델만 import**해서 사용

### 2. DB 스키마 최소 변경
- 기존 `analysis_result` 테이블 활용
- 이미 저장된 `imageUrl`, `grade`, `inspectionDate` 사용
- 추가 필드는 **선택적** (없어도 동작)

### 3. 독립적 실행 가능
- time_series 모듈만으로 분석 가능
- 기존 API 영향 없음

---

## 📦 Backend - Python 구현

### 폴더: `backend/python/services/time_series/`

#### 파일 1: `density_analyzer.py`

```python
"""
BiSeNet을 활용한 헤어 밀도 측정
기존 모델만 import, 코드 수정 없음
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from swin_hair_classification.models.face_parsing.model import BiSeNet
import torch
import cv2
import numpy as np
from PIL import Image
import io

class DensityAnalyzer:
    def __init__(self, device='cpu'):
        self.device = torch.device(device)

        # 기존 BiSeNet 모델 로드 (기존 코드 재사용)
        self.model = BiSeNet(n_classes=19)
        model_path = '../swin_hair_classification/models/face_parsing/res/cp/79999_iter.pth'
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()

    def calculate_density(self, image_bytes: bytes) -> dict:
        """
        이미지로부터 헤어 밀도 측정

        Returns:
            {
                'hair_density_percentage': float,
                'total_hair_pixels': int,
                'distribution_map': list  # 8x8 그리드
            }
        """
        # 이미지 전처리
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image_np = np.array(image)
        image_resized = cv2.resize(image_np, (512, 512))

        # 텐서 변환
        from torchvision import transforms
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
        ])
        input_tensor = transform(image_resized).unsqueeze(0).to(self.device)

        # BiSeNet으로 마스크 생성
        with torch.no_grad():
            output = self.model(input_tensor)[0]
            mask = torch.argmax(output, dim=1).squeeze().cpu().numpy()

        # 헤어 마스크 (클래스 17)
        hair_mask = (mask == 17).astype(np.uint8) * 255

        # 밀도 계산
        total_hair_pixels = int(np.sum(hair_mask > 0))
        total_pixels = hair_mask.shape[0] * hair_mask.shape[1]
        density_percentage = (total_hair_pixels / total_pixels) * 100

        # 8x8 그리드 분포
        grid_size = 8
        cell_h = 512 // grid_size
        cell_w = 512 // grid_size
        distribution_map = []

        for i in range(grid_size):
            row = []
            for j in range(grid_size):
                cell = hair_mask[i*cell_h:(i+1)*cell_h, j*cell_w:(j+1)*cell_w]
                cell_density = np.sum(cell > 0) / (cell_h * cell_w) * 100
                row.append(round(cell_density, 2))
            distribution_map.append(row)

        return {
            'hair_density_percentage': round(density_percentage, 2),
            'total_hair_pixels': total_hair_pixels,
            'distribution_map': distribution_map
        }
```

---

#### 파일 2: `feature_extractor.py`

```python
"""
SwinTransformer feature vector 추출
기존 모델만 import
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from swin_hair_classification.models.swin_hair_classifier import SwinHairClassifier
from swin_hair_classification.models.face_parsing.model import BiSeNet
import torch
import numpy as np
from PIL import Image
import io
import cv2

class FeatureExtractor:
    def __init__(self, device='cpu'):
        self.device = torch.device(device)

        # BiSeNet 로드 (마스킹용)
        self.face_parser = BiSeNet(n_classes=19)
        face_model_path = '../swin_hair_classification/models/face_parsing/res/cp/79999_iter.pth'
        self.face_parser.load_state_dict(torch.load(face_model_path, map_location=self.device))
        self.face_parser.to(self.device)
        self.face_parser.eval()

        # Swin 모델 로드
        self.swin_model = SwinHairClassifier(num_classes=4)
        swin_model_path = '../swin_hair_classification/models/best_swin_hair_classifier_top.pth'
        checkpoint = torch.load(swin_model_path, map_location=self.device)
        if 'model_state_dict' in checkpoint:
            self.swin_model.load_state_dict(checkpoint['model_state_dict'])
        else:
            self.swin_model.load_state_dict(checkpoint)
        self.swin_model.to(self.device)
        self.swin_model.eval()

    def extract_features(self, image_bytes: bytes) -> dict:
        """
        768차원 feature vector 추출

        Returns:
            {
                'feature_vector': list,  # 768차원
                'feature_norm': float
            }
        """
        # 1. 마스크 생성
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image_np = np.array(image)
        image_resized = cv2.resize(image_np, (512, 512))

        from torchvision import transforms
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
        ])
        input_tensor = transform(image_resized).unsqueeze(0).to(self.device)

        with torch.no_grad():
            output = self.face_parser(input_tensor)[0]
            mask = torch.argmax(output, dim=1).squeeze().cpu().numpy()

        hair_mask = (mask == 17).astype(np.uint8) * 255

        # 2. 이미지 + 마스크 결합 (6채널)
        image_224 = cv2.resize(image_np, (224, 224))
        mask_224 = cv2.resize(hair_mask, (224, 224)) / 255.0

        img_transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        image_tensor = img_transform(Image.fromarray(image_224))  # [3, 224, 224]
        mask_tensor = torch.from_numpy(mask_224.astype(np.float32)).unsqueeze(0).repeat(3, 1, 1)  # [3, 224, 224]

        combined = torch.cat([image_tensor, mask_tensor], dim=0).unsqueeze(0).to(self.device)  # [1, 6, 224, 224]

        # 3. Feature 추출
        with torch.no_grad():
            features = self.swin_model.forward_features(combined)  # [1, 768]
            features_np = features.cpu().numpy()[0]

        return {
            'feature_vector': features_np.tolist(),
            'feature_norm': float(np.linalg.norm(features_np))
        }
```

---

#### 파일 3: `timeseries_comparator.py`

```python
"""
시계열 비교 분석
"""

import numpy as np
from scipy.spatial.distance import cosine

class TimeSeriesComparator:

    def compare_density(self, current: dict, past_list: list) -> dict:
        """
        밀도 변화 분석

        Args:
            current: {'hair_density_percentage': 48.5, ...}
            past_list: [{'hair_density_percentage': 50.2, ...}, ...]

        Returns:
            {
                'trend': 'improving' | 'stable' | 'declining',
                'change_percentage': -3.4,
                'weekly_change': -1.7,
                'monthly_change': -3.4
            }
        """
        if not past_list:
            return {'trend': 'insufficient_data'}

        current_density = current['hair_density_percentage']

        # 주간 변화 (가장 최근과 비교)
        weekly_change = current_density - past_list[-1]['hair_density_percentage']

        # 월간 변화 (4주 전과 비교)
        monthly_change = current_density - past_list[-4]['hair_density_percentage'] if len(past_list) >= 4 else weekly_change

        # 트렌드 (선형 회귀)
        densities = [p['hair_density_percentage'] for p in past_list] + [current_density]
        x = np.arange(len(densities))
        slope = np.polyfit(x, densities, 1)[0]

        trend = 'improving' if slope > 0.5 else ('declining' if slope < -0.5 else 'stable')

        return {
            'trend': trend,
            'change_percentage': round(weekly_change, 2),
            'weekly_change': round(weekly_change, 2),
            'monthly_change': round(monthly_change, 2)
        }

    def compare_distribution(self, current_map: list, past_maps: list) -> dict:
        """
        분포 변화 분석 (8x8 히트맵)
        """
        if not past_maps:
            return {'similarity': 1.0}

        current_flat = np.array(current_map).flatten()
        past_flat = np.array(past_maps[-1]).flatten()

        similarity = 1 - cosine(current_flat, past_flat)

        return {
            'similarity': round(similarity, 3),
            'change_detected': similarity < 0.9
        }

    def compare_features(self, current_feature: list, past_features: list) -> dict:
        """
        Feature vector 유사도
        """
        if not past_features:
            return {'similarity': 1.0}

        current_np = np.array(current_feature)
        past_np = np.array(past_features[-1])

        similarity = 1 - cosine(current_np, past_np)
        distance = np.linalg.norm(current_np - past_np)

        return {
            'similarity': round(similarity, 3),
            'distance': round(distance, 2),
            'change_score': min(round(distance * 10, 1), 100)  # 0-100 점수
        }
```

---

#### 파일 4: `api.py`

```python
"""
FastAPI 엔드포인트 (독립 실행 가능)
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import requests

from .density_analyzer import DensityAnalyzer
from .feature_extractor import FeatureExtractor
from .timeseries_comparator import TimeSeriesComparator

app = FastAPI()

# 전역 인스턴스
density_analyzer = DensityAnalyzer()
feature_extractor = FeatureExtractor()
comparator = TimeSeriesComparator()


class ImageAnalysisRequest(BaseModel):
    image_url: str  # S3 URL


class TimeSeriesRequest(BaseModel):
    current_image_url: str
    past_image_urls: List[str]


@app.post("/timeseries/analyze-single")
async def analyze_single_image(request: ImageAnalysisRequest):
    """
    단일 이미지 분석 (밀도 + feature)
    """
    try:
        # S3에서 이미지 다운로드
        response = requests.get(request.image_url)
        image_bytes = response.content

        # 밀도 측정
        density_result = density_analyzer.calculate_density(image_bytes)

        # Feature 추출
        feature_result = feature_extractor.extract_features(image_bytes)

        return {
            "success": True,
            "density": density_result,
            "features": feature_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/timeseries/compare")
async def compare_timeseries(request: TimeSeriesRequest):
    """
    시계열 비교 분석
    """
    try:
        # 현재 이미지 분석
        current_response = requests.get(request.current_image_url)
        current_bytes = current_response.content

        current_density = density_analyzer.calculate_density(current_bytes)
        current_features = feature_extractor.extract_features(current_bytes)

        # 과거 이미지들 분석
        past_densities = []
        past_features = []
        past_maps = []

        for url in request.past_image_urls:
            past_response = requests.get(url)
            past_bytes = past_response.content

            past_density = density_analyzer.calculate_density(past_bytes)
            past_feature = feature_extractor.extract_features(past_bytes)

            past_densities.append(past_density)
            past_features.append(past_feature['feature_vector'])
            past_maps.append(past_density['distribution_map'])

        # 시계열 비교
        density_comparison = comparator.compare_density(current_density, past_densities)
        distribution_comparison = comparator.compare_distribution(
            current_density['distribution_map'],
            past_maps
        )
        feature_comparison = comparator.compare_features(
            current_features['feature_vector'],
            past_features
        )

        return {
            "success": True,
            "current": {
                "density": current_density,
                "features": current_features
            },
            "comparison": {
                "density": density_comparison,
                "distribution": distribution_comparison,
                "features": feature_comparison
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 📦 Backend - Spring Boot 구현

### 파일: `TimeSeriesController.java`

```java
package com.example.springboot.controller;

import com.example.springboot.data.dao.AnalysisResultDAO;
import com.example.springboot.data.entity.AnalysisResultEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/timeseries")
@RequiredArgsConstructor
public class TimeSeriesController {

    private final AnalysisResultDAO analysisResultDAO;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String PYTHON_TIMESERIES_API = "http://localhost:8000/timeseries";

    /**
     * 시계열 분석 실행
     */
    @GetMapping("/analyze/{userId}")
    public ResponseEntity<Map<String, Object>> analyzeTimeSeries(@PathVariable Integer userId) {

        // 1. DB에서 최근 3개월 분석 결과 조회
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(3);

        List<AnalysisResultEntity> results = analysisResultDAO.findByUserIdAndAnalysisTypeAndDateRange(
                userId, "swin_dual_model_llm_enhanced", startDate, endDate);

        if (results.size() < 2) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "비교할 데이터가 부족합니다. 최소 2개 이상의 분석 결과가 필요합니다."
            ));
        }

        // 2. 이미지 URL 추출
        String currentImageUrl = results.get(0).getImageUrl();
        List<String> pastImageUrls = results.stream()
                .skip(1)
                .map(AnalysisResultEntity::getImageUrl)
                .collect(Collectors.toList());

        // 3. Python API 호출
        Map<String, Object> requestBody = Map.of(
                "current_image_url", currentImageUrl,
                "past_image_urls", pastImageUrls
        );

        try {
            Map<String, Object> pythonResponse = restTemplate.postForObject(
                    PYTHON_TIMESERIES_API + "/compare",
                    requestBody,
                    Map.class
            );

            return ResponseEntity.ok(pythonResponse);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 시계열 데이터 조회 (시각화용)
     */
    @GetMapping("/data/{userId}")
    public ResponseEntity<Map<String, Object>> getTimeSeriesData(@PathVariable Integer userId) {

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(3);

        List<AnalysisResultEntity> results = analysisResultDAO.findByUserIdAndAnalysisTypeAndDateRange(
                userId, "swin_dual_model_llm_enhanced", startDate, endDate);

        List<Map<String, Object>> data = results.stream()
                .map(r -> Map.of(
                        "date", r.getInspectionDate().toString(),
                        "grade", r.getGrade() != null ? r.getGrade() : 0,
                        "imageUrl", r.getImageUrl() != null ? r.getImageUrl() : ""
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", data
        ));
    }
}
```

---

## 🎨 Frontend 구현

### 폴더: `frontend/src/components/timeseries/`

#### 파일 1: `TimeSeriesChart.tsx`

```typescript
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TimeSeriesChartProps {
  data: Array<{ date: string; grade: number }>;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="grade" stroke="#1f0101" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

---

#### 파일 2: `DensityHeatmap.tsx`

```typescript
import React from 'react';

interface DensityHeatmapProps {
  distributionMap: number[][];  // 8x8 그리드
}

export const DensityHeatmap: React.FC<DensityHeatmapProps> = ({ distributionMap }) => {
  return (
    <div className="grid grid-cols-8 gap-1">
      {distributionMap.map((row, i) =>
        row.map((cell, j) => (
          <div
            key={`${i}-${j}`}
            className="aspect-square rounded"
            style={{
              backgroundColor: `rgba(31, 1, 1, ${cell / 100})`,
            }}
            title={`밀도: ${cell.toFixed(1)}%`}
          />
        ))
      )}
    </div>
  );
};
```

---

#### 파일 3: `TrendSummary.tsx`

```typescript
import React from 'react';
import { Card, CardContent } from '../../components/ui/card';

interface TrendSummaryProps {
  trend: 'improving' | 'stable' | 'declining';
  weeklyChange: number;
  monthlyChange: number;
}

export const TrendSummary: React.FC<TrendSummaryProps> = ({ trend, weeklyChange, monthlyChange }) => {
  const getTrendEmoji = () => {
    if (trend === 'improving') return '🟢';
    if (trend === 'declining') return '🔴';
    return '🟡';
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Card>
        <CardContent className="p-3 text-center">
          <p className="text-xs text-gray-600">주간 변화</p>
          <p className={`text-lg font-bold ${weeklyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-center">
          <p className="text-xs text-gray-600">월간 변화</p>
          <p className={`text-lg font-bold ${monthlyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-center">
          <p className="text-xs text-gray-600">트렌드</p>
          <p className="text-lg font-bold">
            {getTrendEmoji()} {trend === 'improving' ? '개선' : trend === 'declining' ? '악화' : '유지'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

### DailyCare.tsx에 통합

```typescript
// DailyCare.tsx 최소 수정

import { TimeSeriesChart } from '../../components/timeseries/TimeSeriesChart';
import { DensityHeatmap } from '../../components/timeseries/DensityHeatmap';
import { TrendSummary } from '../../components/timeseries/TrendSummary';

// 추가 state
const [timeSeriesData, setTimeSeriesData] = useState(null);
const [showTimeSeries, setShowTimeSeries] = useState(false);

// 시계열 분석 호출
const handleTimeSeriesAnalysis = async () => {
  if (!userId) return;

  try {
    const response = await apiClient.get(`/api/timeseries/analyze/${userId}`);
    setTimeSeriesData(response.data);
    setShowTimeSeries(true);
  } catch (error) {
    console.error('시계열 분석 실패:', error);
  }
};

// UI에 버튼 추가
<Button onClick={handleTimeSeriesAnalysis} className="w-full mt-4">
  변화 추이 보기
</Button>

{/* 시계열 분석 결과 */}
{showTimeSeries && timeSeriesData && (
  <Card className="mx-4 mt-4">
    <CardHeader>
      <CardTitle>📊 머리 밀도 변화 추이</CardTitle>
    </CardHeader>
    <CardContent>
      {/* 트렌드 요약 */}
      <TrendSummary
        trend={timeSeriesData.comparison.density.trend}
        weeklyChange={timeSeriesData.comparison.density.weekly_change}
        monthlyChange={timeSeriesData.comparison.density.monthly_change}
      />

      {/* 히트맵 */}
      <div className="mt-4">
        <DensityHeatmap distributionMap={timeSeriesData.current.density.distribution_map} />
      </div>
    </CardContent>
  </Card>
)}
```

---

## 📝 구현 순서

### Week 1: Python 독립 모듈 (5일)
1. `time_series/` 폴더 생성
2. `density_analyzer.py` 구현 (2일)
3. `feature_extractor.py` 구현 (2일)
4. `timeseries_comparator.py` + `api.py` (1일)

### Week 2: Backend 연동 (3일)
5. `TimeSeriesController.java` 구현 (2일)
6. Python API 연동 테스트 (1일)

### Week 3: Frontend 시각화 (4일)
7. `TimeSeriesChart.tsx` (1일)
8. `DensityHeatmap.tsx` (1일)
9. `TrendSummary.tsx` (1일)
10. DailyCare 통합 (1일)

---

## ✅ 체크리스트

- [ ] 기존 Swin 코드 수정 없음
- [ ] DB 스키마 변경 최소화 (기존 테이블 활용)
- [ ] 독립 실행 가능 (time_series 모듈만으로)
- [ ] API 응답 시간 < 3초
- [ ] 에러 발생 시 기존 시스템 영향 없음

---

**원칙 요약**:
- ✅ 완전 독립 모듈
- ✅ 기존 코드 수정 없음
- ✅ 최소한의 의존성
- ✅ 점진적 추가 가능

