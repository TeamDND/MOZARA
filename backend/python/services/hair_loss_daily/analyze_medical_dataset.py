"""
의료 데이터셋 통계 분석 스크립트
의료 데이터셋의 통계 정보를 수집하여 전처리에 활용
"""
import os
import json
import numpy as np
import cv2
from PIL import Image
import glob
from typing import Dict, List, Tuple
import argparse
from pathlib import Path

def calculate_image_statistics(image_path: str) -> Dict:
    """단일 이미지의 통계 정보 계산"""
    try:
        # 한글 경로 문제 해결을 위해 numpy로 이미지 로드
        import numpy as np
        image_array = np.fromfile(image_path, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if image is None:
            return None
        
        # BGR to RGB 변환
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # 기본 통계
        stats = {
            "mean": np.mean(image, axis=(0, 1)).tolist(),  # [R, G, B]
            "std": np.std(image, axis=(0, 1)).tolist(),    # [R, G, B]
            "min": np.min(image, axis=(0, 1)).tolist(),    # [R, G, B]
            "max": np.max(image, axis=(0, 1)).tolist(),    # [R, G, B]
        }
        
        # 히스토그램 (각 채널별)
        hist_r = cv2.calcHist([image], [0], None, [256], [0, 256])
        hist_g = cv2.calcHist([image], [1], None, [256], [0, 256])
        hist_b = cv2.calcHist([image], [2], None, [256], [0, 256])
        
        stats["histogram"] = {
            "r": hist_r.flatten().tolist(),
            "g": hist_g.flatten().tolist(),
            "b": hist_b.flatten().tolist()
        }
        
        # 조명 특성
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        stats["lighting"] = {
            "brightness_mean": float(np.mean(gray)),
            "brightness_std": float(np.std(gray)),
            "contrast": float(np.std(gray) / np.mean(gray)) if np.mean(gray) > 0 else 0
        }
        
        return stats
        
    except Exception as e:
        print(f"[WARN] 이미지 분석 실패: {image_path} - {str(e)}")
        return None

def analyze_medical_dataset(data_path: str, labeling_path: str = None) -> Dict:
    """의료 데이터셋 전체 분석"""
    print(f"🔍 의료 데이터셋 분석 시작: {data_path}")
    
    # 라벨링 데이터 경로 설정
    if labeling_path is None:
        labeling_path = os.path.join(os.path.dirname(data_path), "라벨링데이터")
    
    print(f"📋 라벨링 데이터 경로: {labeling_path}")
    
    # 카테고리별로 분석
    categories = ["1.미세각질", "2.피지과다", "3.모낭사이홍반", "4.모낭홍반농포", "5.비듬"]
    severity_levels = ["0.양호", "1.경증", "2.중등도", "3.중증"]
    
    all_stats = []
    category_stats = {}
    
    for category in categories:
        print(f"📁 카테고리 '{category}' 분석 중...")
        category_stats[category] = {}
        
        for severity in severity_levels:
            category_path = os.path.join(data_path, category, severity)
            
            if not os.path.exists(category_path):
                continue
            
            print(f"  📂 심각도 '{severity}' 분석 중...")
            
            # 이미지 파일 찾기
            image_files = []
            for ext in ['*.jpg', '*.jpeg', '*.png', '*.bmp']:
                pattern = os.path.join(category_path, ext)
                print(f"    🔍 검색 패턴: {pattern}")
                found_files = glob.glob(pattern)
                print(f"    📁 발견된 파일 수: {len(found_files)}")
                image_files.extend(found_files)
            
            if not image_files:
                print(f"    [WARN] 이미지 파일을 찾을 수 없습니다: {category_path}")
                continue
            
            severity_stats = []
            for image_path in image_files:
                stats = calculate_image_statistics(image_path)
                if stats:
                    severity_stats.append(stats)
                    all_stats.append(stats)
            
            if severity_stats:
                # 심각도별 평균 통계
                category_stats[category][severity] = {
                    "count": len(severity_stats),
                    "mean_rgb": np.mean([s["mean"] for s in severity_stats], axis=0).tolist(),
                    "std_rgb": np.mean([s["std"] for s in severity_stats], axis=0).tolist(),
                    "lighting_avg": {
                        "brightness_mean": np.mean([s["lighting"]["brightness_mean"] for s in severity_stats]),
                        "brightness_std": np.mean([s["lighting"]["brightness_std"] for s in severity_stats]),
                        "contrast": np.mean([s["lighting"]["contrast"] for s in severity_stats])
                    }
                }
    
    if not all_stats:
        raise ValueError("분석할 이미지를 찾을 수 없습니다.")
    
    # 전체 데이터셋 통계
    overall_stats = {
        "total_images": len(all_stats),
        "mean_rgb": np.mean([s["mean"] for s in all_stats], axis=0).tolist(),
        "std_rgb": np.mean([s["std"] for s in all_stats], axis=0).tolist(),
        "lighting_overall": {
            "brightness_mean": np.mean([s["lighting"]["brightness_mean"] for s in all_stats]),
            "brightness_std": np.mean([s["lighting"]["brightness_std"] for s in all_stats]),
            "contrast": np.mean([s["lighting"]["contrast"] for s in all_stats])
        },
        "categories": category_stats
    }
    
    # 히스토그램 평균 계산
    hist_r_avg = np.mean([s["histogram"]["r"] for s in all_stats], axis=0)
    hist_g_avg = np.mean([s["histogram"]["g"] for s in all_stats], axis=0)
    hist_b_avg = np.mean([s["histogram"]["b"] for s in all_stats], axis=0)
    
    overall_stats["histogram_avg"] = {
        "r": hist_r_avg.tolist(),
        "g": hist_g_avg.tolist(),
        "b": hist_b_avg.tolist()
    }
    
    return overall_stats

def main():
    parser = argparse.ArgumentParser(description="의료 데이터셋 통계 분석")
    parser.add_argument("--data_path", required=True, help="원천데이터 경로 (이미지 파일들)")
    parser.add_argument("--labeling_path", help="라벨링데이터 경로 (JSON 파일들) - 선택사항")
    parser.add_argument("--output", default="data/medical_dataset_stats.json", help="출력 파일 경로")
    
    args = parser.parse_args()
    
    try:
        print(f"🔍 원천데이터 경로 확인: {args.data_path}")
        if not os.path.exists(args.data_path):
            print(f"[ERROR] 원천데이터 경로가 존재하지 않습니다: {args.data_path}")
            return 1
        
        # 라벨링 데이터 경로 확인
        if args.labeling_path:
            print(f"📋 라벨링데이터 경로 확인: {args.labeling_path}")
            if not os.path.exists(args.labeling_path):
                print(f"[WARN] 라벨링데이터 경로가 존재하지 않습니다: {args.labeling_path}")
                args.labeling_path = None
        
        # 데이터셋 분석
        stats = analyze_medical_dataset(args.data_path, args.labeling_path)
        
        # 출력 디렉토리 생성
        output_dir = os.path.dirname(args.output)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # JSON 파일로 저장
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        
        print(f"[OK] 분석 완료: {args.output}")
        print(f"📊 총 이미지 수: {stats['total_images']}")
        print(f"🎨 평균 RGB: {[round(x, 2) for x in stats['mean_rgb']]}")
        print(f"💡 평균 밝기: {stats['lighting_overall']['brightness_mean']:.2f}")
        
    except Exception as e:
        print(f"[ERROR] 분석 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
