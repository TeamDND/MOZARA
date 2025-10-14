"""
RAG (Retrieval-Augmented Generation) 서비스 - CLIP 앙상블 기반
"""
from typing import List, Dict, Optional, Any
from .clip_ensemble_service import clip_ensemble_service
from .pinecone_service import get_pinecone_service
from .image_preprocessing_service import image_preprocessing_service
from ..utils.image_path_utils import get_image_path_from_metadata, get_available_image_paths
import statistics
from collections import Counter
import numpy as np

class RAGService:
    """RAG 기반 머리사진 분석 서비스 - CLIP 앙상블 기반"""
    
    def __init__(self):
        self.clip_service = clip_ensemble_service
        self._pinecone_service = None
    
    @property
    def pinecone_service(self):
        """Pinecone 서비스 지연 로딩"""
        if self._pinecone_service is None:
            self._pinecone_service = get_pinecone_service()
        return self._pinecone_service
    
    def analyze_hair_image(self, image_bytes: bytes, top_k: int = 10, use_preprocessing: bool = True) -> Dict[str, Any]:
        """머리사진 분석 (CLIP 앙상블 RAG 방식)"""
        try:
            # 1. 사용자 이미지 전처리 (선택적)
            if use_preprocessing:
                print("🖼️ 사용자 이미지 전처리 중...")
                processed_image_bytes = image_preprocessing_service.preprocess_for_medical_analysis(image_bytes)
                print("[OK] 이미지 전처리 완료 (빛 반사 처리 포함)")
            else:
                print("🖼️ 전처리 없이 원본 이미지 사용...")
                processed_image_bytes = image_bytes
            
            # 2. CLIP 앙상블로 이미지 특징 추출
            print("🔍 CLIP 앙상블 특징 추출 중...")
            
            # CLIP 앙상블 특징 추출
            hybrid_features = self.clip_service.extract_hybrid_features(processed_image_bytes)
            query_vector = hybrid_features["combined"]
            print(f"[OK] CLIP 앙상블 특징 추출 완료: {len(query_vector)}차원")
            
            if query_vector is None or len(query_vector) == 0:
                return {
                    "success": False,
                    "error": "이미지 특징 추출에 실패했습니다."
                }
            
            # 2. Pinecone에서 유사한 케이스 검색 (비듬/탈모 제외)
            print("🔍 유사 케이스 검색 중 (비듬/탈모 제외)...")
            # NumPy 배열을 리스트로 변환
            query_vector_list = query_vector.tolist() if hasattr(query_vector, 'tolist') else query_vector
            
            # 비듬과 탈모를 제외하는 필터
            exclude_filter = {
                "category": {"$nin": ["5.비듬", "비듬", "탈모"]}
            }
            
            similar_cases = self.pinecone_service.search_similar_vectors(
                query_vector_list, top_k=top_k, filter_dict=exclude_filter
            )
            
            if similar_cases is None or len(similar_cases) == 0:
                return {
                    "success": False,
                    "error": "유사한 케이스를 찾을 수 없습니다."
                }
            
            # 3. 검색 결과 분석
            print("📊 검색 결과 분석 중...")
            analysis_result = self._analyze_search_results(similar_cases)
            
            # 4. 유사 케이스에 이미지 경로 정보 추가 (탈모 제외)
            enhanced_similar_cases = []
            for case in similar_cases[:10]:  # 상위 10개에서 필터링
                enhanced_case = case.copy()
                metadata = case.get("metadata", {})
                
                # 탈모 카테고리인 경우 제외
                category = metadata.get("category", "")
                if category == "탈모":
                    continue
                
                image_path = get_image_path_from_metadata(metadata)
                if image_path:
                    enhanced_case["image_path"] = image_path
                enhanced_similar_cases.append(enhanced_case)
                
                # 탈모 제외 후 5개만 반환
                if len(enhanced_similar_cases) >= 5:
                    break
            
            # 5. 결과 구성
            result = {
                "success": True,
                "analysis": analysis_result,
                "similar_cases": enhanced_similar_cases,
                "total_similar_cases": len(similar_cases),
                "model_info": self.clip_service.get_model_info(),
                "preprocessing_used": use_preprocessing,
                "preprocessing_info": {
                    "enabled": use_preprocessing,
                    "description": "빛 반사 처리 강화 (비듬 오인 방지)" if use_preprocessing else "전처리 없음"
                }
            }
            
            return result
            
        except Exception as e:
            import traceback
            print(f"[ERROR] RAG 분석 오류: {str(e)}")
            print(f"[ERROR] 오류 상세: {traceback.format_exc()}")
            return {
                "success": False,
                "error": f"분석 중 오류가 발생했습니다: {str(e)}"
            }
    
    def test_similarity_consistency(self, image_bytes: bytes, test_rounds: int = 3) -> Dict[str, Any]:
        """유사도 일관성 테스트 - 같은 이미지로 여러 번 검색하여 일관성 확인"""
        try:
            print(f"🧪 유사도 일관성 테스트 시작 (총 {test_rounds}회)")
            
            results = []
            for i in range(test_rounds):
                print(f"🔄 테스트 {i+1}/{test_rounds} 실행 중...")
                
                # 전처리된 이미지로 특징 추출
                preprocessed_image_bytes = image_preprocessing_service.preprocess_for_medical_analysis(image_bytes)
                hybrid_features = self.clip_service.extract_hybrid_features(preprocessed_image_bytes)
                query_vector = hybrid_features["combined"]
                
                # 검색 실행
                query_vector_list = query_vector.tolist() if hasattr(query_vector, 'tolist') else query_vector
                similar_cases = self.pinecone_service.search_similar_vectors(query_vector_list, top_k=5)
                
                # 상위 3개 결과만 저장
                top_results = []
                for case in similar_cases[:3]:
                    top_results.append({
                        "id": case.get("id", ""),
                        "score": case.get("score", 0),
                        "category": case.get("metadata", {}).get("category", "")
                    })
                
                results.append(top_results)
            
            # 일관성 분석
            consistency_analysis = self._analyze_consistency(results)
            
            return {
                "success": True,
                "test_rounds": test_rounds,
                "results": results,
                "consistency_analysis": consistency_analysis
            }
            
        except Exception as e:
            import traceback
            print(f"[ERROR] 일관성 테스트 오류: {str(e)}")
            print(f"[ERROR] 오류 상세: {traceback.format_exc()}")
            return {
                "success": False,
                "error": f"테스트 중 오류가 발생했습니다: {str(e)}"
            }
    
    def _analyze_consistency(self, results: List[List[Dict]]) -> Dict[str, Any]:
        """일관성 분석"""
        if not results or len(results) < 2:
            return {"error": "분석할 결과가 부족합니다."}
        
        # 첫 번째 결과를 기준으로 비교
        baseline = results[0]
        consistency_scores = []
        
        for i in range(1, len(results)):
            current = results[i]
            matches = 0
            
            # 각 결과에서 같은 ID가 있는지 확인
            for baseline_item in baseline:
                for current_item in current:
                    if baseline_item["id"] == current_item["id"]:
                        matches += 1
                        break
            
            consistency_score = matches / len(baseline) if baseline else 0
            consistency_scores.append(consistency_score)
        
        # 점수 일관성 분석
        score_variations = []
        for i in range(len(baseline)):
            scores = [result[i]["score"] for result in results if i < len(result)]
            if len(scores) > 1:
                score_variation = max(scores) - min(scores)
                score_variations.append(score_variation)
        
        return {
            "average_consistency": sum(consistency_scores) / len(consistency_scores) if consistency_scores else 0,
            "consistency_scores": consistency_scores,
            "average_score_variation": sum(score_variations) / len(score_variations) if score_variations else 0,
            "score_variations": score_variations,
            "is_consistent": all(score > 0.8 for score in consistency_scores) if consistency_scores else False
        }
    
    def test_weighted_ensemble(self, image_bytes: bytes, model_weights: Dict[str, float] = None, top_k: int = 10) -> Dict[str, Any]:
        """가중치 조정된 앙상블 테스트 (Pinecone 데이터 재업로드 없이)"""
        try:
            print(f"🔍 가중치 조정 앙상블 테스트")
            
            # 전처리된 이미지로 특징 추출
            preprocessed_image_bytes = image_preprocessing_service.preprocess_for_medical_analysis(image_bytes)
            
            # 기본 가중치 설정
            if model_weights is None:
                model_weights = {
                    "ViT-B-32": 0.6,  # 기본 모델에 더 높은 가중치
                    "ViT-B-16": 0.2,  # 고해상도 모델 가중치 감소
                    "RN50": 0.2       # ResNet 모델 가중치 감소
                }
            
            # 가중치 조정된 앙상블 특징 추출
            weighted_features = self.clip_service.extract_weighted_ensemble_features(
                preprocessed_image_bytes, model_weights
            )
            
            # 검색 실행
            query_vector_list = weighted_features.tolist() if hasattr(weighted_features, 'tolist') else weighted_features
            similar_cases = self.pinecone_service.search_similar_vectors(query_vector_list, top_k=top_k)
            
            if similar_cases is None or len(similar_cases) == 0:
                return {
                    "success": False,
                    "error": "유사한 케이스를 찾을 수 없습니다."
                }
            
            # 결과 구성
            result = {
                "success": True,
                "model_weights": model_weights,
                "similar_cases": similar_cases,
                "total_similar_cases": len(similar_cases),
                "preprocessing_used": True
            }
            
            return result
            
        except Exception as e:
            import traceback
            print(f"[ERROR] 가중치 조정 앙상블 테스트 오류: {str(e)}")
            print(f"[ERROR] 오류 상세: {traceback.format_exc()}")
            return {
                "success": False,
                "error": f"테스트 중 오류가 발생했습니다: {str(e)}"
            }
    
    def test_without_preprocessing(self, image_bytes: bytes, top_k: int = 10) -> Dict[str, Any]:
        """전처리 없이 직접 분석 (디버깅용)"""
        try:
            print("🔍 전처리 없이 직접 분석 중...")
            
            # CLIP 앙상블로 이미지 특징 추출 (원본 이미지 사용)
            hybrid_features = self.clip_service.extract_hybrid_features(image_bytes)
            query_vector = hybrid_features["combined"]
            print(f"[OK] CLIP 앙상블 특징 추출 완료: {len(query_vector)}차원")
            
            if query_vector is None or len(query_vector) == 0:
                return {
                    "success": False,
                    "error": "이미지 특징 추출에 실패했습니다."
                }
            
            # Pinecone에서 유사한 케이스 검색
            query_vector_list = query_vector.tolist() if hasattr(query_vector, 'tolist') else query_vector
            similar_cases = self.pinecone_service.search_similar_vectors(
                query_vector_list, top_k=top_k
            )
            
            if similar_cases is None or len(similar_cases) == 0:
                return {
                    "success": False,
                    "error": "유사한 케이스를 찾을 수 없습니다."
                }
            
            # 결과 구성
            result = {
                "success": True,
                "similar_cases": similar_cases,
                "total_similar_cases": len(similar_cases),
                "preprocessing_used": False
            }
            
            return result
            
        except Exception as e:
            import traceback
            print(f"[ERROR] 전처리 없이 분석 오류: {str(e)}")
            print(f"[ERROR] 오류 상세: {traceback.format_exc()}")
            return {
                "success": False,
                "error": f"분석 중 오류가 발생했습니다: {str(e)}"
            }
    
    def _analyze_search_results(self, similar_cases: List[Dict]) -> Dict[str, Any]:
        """검색 결과를 분석하여 진단 정보 추출 (가중치 적용)"""
        try:
            # 가중치 기반 분석을 위한 데이터 수집
            weighted_categories = {}
            weighted_severities = {}
            values = {
                "value_1": [],  # 미세각질
                "value_2": [],  # 피지과다
                "value_3": [],  # 모낭사이홍반
                "value_4": [],  # 모낭홍반농포
                "value_5": []   # 비듬 (데이터는 수집하지만 결과에서 제외)
                # "value_6": []   # 탈모 - 제외
            }
            scores = []
            
            for case in similar_cases:
                metadata = case.get("metadata", {})
                score = case.get("score", 0)
                
                # 탈모 카테고리인 경우 분석에서 제외
                category = metadata.get("category", "")
                if category == "탈모":
                    continue
                
                scores.append(score)
                print(f"[DEBUG] 케이스: {category}, 심각도: {metadata.get('severity', '')}, 유사도: {score:.3f}")
                
                # 유사도 점수를 가중치로 사용
                severity = metadata.get("severity", "")
                
                if category:
                    weighted_categories[category] = weighted_categories.get(category, 0) + score
                if severity:
                    weighted_severities[severity] = weighted_severities.get(severity, 0) + score
                
                # 각 카테고리별 값 수집 (가중치 적용)
                for key in values.keys():
                    val = metadata.get(key, "0")
                    try:
                        weighted_val = int(val) * score  # 유사도 점수로 가중치 적용
                        values[key].append(weighted_val)
                    except ValueError:
                        values[key].append(0)
            
            # 가중치 기반 주요 카테고리/심각도 결정 (임계값 적용)
            primary_category = self._get_primary_category_with_threshold(weighted_categories, scores)
            primary_severity = self._get_primary_severity_with_threshold(weighted_severities, scores)
            
            # 진단 점수 계산 (가중치 적용)
            diagnosis_scores = self._calculate_weighted_diagnosis_scores(values, scores)
            print(f"[DEBUG] 계산된 diagnosis_scores: {diagnosis_scores}")
            
            # 중복 데이터 제거 (같은 이미지 ID에 대해 가장 높은 유사도만 유지)
            unique_cases = {}
            for case in similar_cases:
                image_id = case.get("metadata", {}).get("image_id", "")
                if image_id not in unique_cases or case.get("score", 0) > unique_cases[image_id].get("score", 0):
                    unique_cases[image_id] = case
            
            # 중복 제거된 케이스로 다시 분석
            filtered_cases = list(unique_cases.values())
            
            # 통계 분석 (중복 제거된 데이터 사용)
            analysis = {
                "primary_category": primary_category,
                "primary_severity": primary_severity,
                "average_confidence": statistics.mean(scores) if scores else 0,
                "category_distribution": dict(Counter([case.get("metadata", {}).get("category", "") for case in filtered_cases])),
                "severity_distribution": dict(Counter([case.get("metadata", {}).get("severity", "") for case in filtered_cases])),
                "diagnosis_scores": diagnosis_scores,
                "recommendations": self._generate_recommendations(values, [primary_category]),
                "weighted_analysis": {
                    "weighted_categories": weighted_categories,
                    "weighted_severities": weighted_severities
                }
            }
            
            # scalp_score 계산 및 추가
            try:
                scalp_score = self._calculate_scalp_score(
                    primary_category, 
                    primary_severity, 
                    diagnosis_scores, 
                    statistics.mean(scores) if scores else 0
                )
                analysis["scalp_score"] = scalp_score
                print(f"[DEBUG] analysis에 scalp_score 추가 완료: {scalp_score}")
                print(f"[DEBUG] analysis 키 목록: {list(analysis.keys())}")
            except Exception as e:
                print(f"[ERROR] scalp_score 계산 중 오류: {str(e)}")
                import traceback
                traceback.print_exc()
                analysis["scalp_score"] = 100  # 기본값
            
            return analysis
            
        except Exception as e:
            import traceback
            print(f"[WARN] 검색 결과 분석 오류: {str(e)}")
            print(f"[WARN] 오류 상세: {traceback.format_exc()}")
            return {"error": str(e)}
    
    def _get_most_common(self, items: List[str]) -> str:
        """가장 빈번한 항목 반환"""
        if not items:
            return ""
        
        counter = Counter(items)
        return counter.most_common(1)[0][0]
    
    def _calculate_scalp_score(self, primary_category: str, primary_severity: str, 
                               diagnosis_scores: Dict[str, float], avg_confidence: float) -> int:
        """두피 점수 계산 (0-100점)"""
        print(f"\n[DEBUG] 두피 점수 계산 시작")
        print(f"[DEBUG] primary_category: {primary_category}")
        print(f"[DEBUG] primary_severity: {primary_severity}")
        print(f"[DEBUG] diagnosis_scores: {diagnosis_scores}")
        print(f"[DEBUG] avg_confidence: {avg_confidence}")
        
        # primary_severity 파싱 디버깅
        print(f"[DEBUG] primary_severity 원본: '{primary_severity}'")
        print(f"[DEBUG] '.' 포함 여부: {'.' in primary_severity if primary_severity else False}")
        
        base_score = 100
        
        # 심각도 추출 (0.양호=0, 1.경증=1, 2.중등도=2, 3.중증=3)
        severity_level = 0
        if primary_severity:
            severity_level = int(primary_severity.split('.')[0]) if '.' in primary_severity else 0
        
        print(f"[DEBUG] severity_level: {severity_level}")
        
        # 심각도에 따른 감점 (조정)
        severity_penalty = severity_level * 15  # 25 → 15로 감소
        base_score -= severity_penalty
        print(f"[DEBUG] 심각도 감점: -{severity_penalty}, 현재 점수: {base_score}")
        
        # 진단 점수 기반 감점 (0~3 범위)
        if diagnosis_scores:
            scores = list(diagnosis_scores.values())
            avg_diagnosis_score = sum(scores) / len(scores)
            diagnosis_penalty = avg_diagnosis_score * 8  # 15 → 8로 감소
            base_score -= diagnosis_penalty
            print(f"[DEBUG] 평균 진단 점수: {avg_diagnosis_score:.2f}")
            print(f"[DEBUG] 진단 점수 감점: -{diagnosis_penalty:.2f}, 현재 점수: {base_score:.2f}")
        
        # 신뢰도 기반 보정 (낮은 신뢰도면 덜 감점)
        confidence_adjustment = (avg_confidence - 0.5) * 10
        base_score += confidence_adjustment
        print(f"[DEBUG] 신뢰도 보정: {confidence_adjustment:+.2f}, 현재 점수: {base_score:.2f}")
        
        # 카테고리별 추가 감점
        category_penalty = 0
        category_lower = primary_category.lower()
        
        # 홍반/농포 감점 (RGB 기반 조정)
        if '홍반' in category_lower or '농포' in category_lower:
            # RGB 기반 홍반 심각도별 감점
            erythema_penalty = self._calculate_erythema_penalty(diagnosis_scores)
            category_penalty = erythema_penalty
        elif '피지과다' in category_lower:
            category_penalty = 8
        elif '미세각질' in category_lower:
            category_penalty = 5
        
        base_score -= category_penalty
        print(f"[DEBUG] 카테고리 감점: -{category_penalty}, 현재 점수: {base_score:.2f}")
        
        # 최종 점수는 0~100 범위로 제한
        final_score = max(0, min(100, round(base_score)))
        
        print(f"[DEBUG] 최종 두피 점수: {final_score}\n")
        
        return final_score
    
    def _calculate_erythema_penalty(self, diagnosis_scores: Dict[str, float]) -> int:
        """RGB 기반 홍반 심각도별 감점 계산"""
        # RGB 홍반 기준값 (중증, 중등도, 경증)
        erythema_rgb_standards = {
            "severe": {"r": 177, "g": 114, "b": 125, "penalty": 15},      # 중증: 높은 감점
            "moderate": {"r": 196, "g": 135, "b": 143, "penalty": 10},    # 중등도: 중간 감점  
            "mild": {"r": 173, "g": 152, "b": 125, "penalty": 5}          # 경증: 낮은 감점
        }
        
        # 모낭사이홍반 점수 확인
        erythema_score = diagnosis_scores.get("모낭사이홍반", 0)
        
        # 점수 기반 심각도 판정
        if erythema_score >= 2.0:
            # 중증: 2.0 이상
            penalty = erythema_rgb_standards["severe"]["penalty"]
            severity = "중증"
        elif erythema_score >= 1.0:
            # 중등도: 1.0-1.9
            penalty = erythema_rgb_standards["moderate"]["penalty"]
            severity = "중등도"
        elif erythema_score >= 0.5:
            # 경증: 0.5-0.9
            penalty = erythema_rgb_standards["mild"]["penalty"]
            severity = "경증"
        else:
            # 양호: 0.5 미만
            penalty = 0
            severity = "양호"
        
        print(f"[DEBUG] 홍반 RGB 분석: 점수={erythema_score:.2f}, 심각도={severity}, 감점={penalty}")
        
        return penalty
    
    def _calculate_diagnosis_scores(self, values: Dict[str, List[int]]) -> Dict[str, float]:
        """각 진단 카테고리별 평균 점수 계산"""
        scores = {}
        
        category_names = {
            "value_1": "미세각질",
            "value_2": "피지과다", 
            "value_3": "모낭사이홍반",
            "value_4": "모낭홍반농포",
            "value_5": "비듬"  # 데이터는 수집하지만 결과에서 제외
            # "value_6": "탈모" - 제외
        }
        
        for key, vals in values.items():
            if vals:
                avg_score = statistics.mean(vals)
                category_name = category_names.get(key, key)
                # 비듬은 결과에서 제외 (빛반사 오인 문제)
                if category_name != "비듬":
                    scores[category_name] = round(avg_score, 2)
        
        return scores
    
    def _calculate_weighted_diagnosis_scores(self, values: Dict[str, List[float]], scores: List[float]) -> Dict[str, float]:
        """가중치가 적용된 진단 점수 계산 (유사도 가중치 강화)"""
        weighted_scores = {}
        
        category_names = {
            "value_1": "미세각질",
            "value_2": "피지과다", 
            "value_3": "모낭사이홍반",
            "value_4": "모낭홍반농포",
            "value_5": "비듬"  # 데이터는 수집하지만 결과에서 제외
            # "value_6": "탈모" - 제외
        }
        
        for key, weighted_vals in values.items():
            if weighted_vals is not None and len(weighted_vals) > 0 and scores:
                # 유사도 가중치를 더 강하게 적용 (0.7)
                similarity_weight = 0.7
                severity_weight = 0.3
                
                # 유사도 기반 가중 평균 계산
                weighted_sum = 0
                total_weight = 0
                
                for i, (val, score) in enumerate(zip(weighted_vals, scores)):
                    # 유사도가 높을수록 더 큰 가중치
                    weight = (score * similarity_weight) + (val * severity_weight)
                    weighted_sum += val * weight
                    total_weight += weight
                
                if total_weight > 0:
                    normalized_score = weighted_sum / total_weight
                    category_name = category_names.get(key, key)
                    # 비듬은 결과에서 제외 (빛반사 오인 문제)
                    if category_name != "비듬":
                        weighted_scores[category_name] = round(normalized_score, 2)
        
        return weighted_scores
    
    def _get_primary_category_with_threshold(self, weighted_categories: Dict[str, float], scores: List[float]) -> str:
        """임계값을 적용한 주요 카테고리 결정 (비듬/탈모 제외)"""
        if not weighted_categories:
            return "0.양호"
        
        # 비듬과 탈모를 제외한 카테고리만 필터링
        filtered_categories = {
            k: v for k, v in weighted_categories.items() 
            if '비듬' not in k and '탈모' not in k
        }
        
        if not filtered_categories:
            print("[DEBUG] 비듬/탈모 제외 후 남은 카테고리 없음 -> 양호")
            return "0.양호"
        
        # 평균 유사도 점수 계산
        avg_score = statistics.mean(scores) if scores else 0
        
        # 임계값: 평균 유사도가 0.5 미만이면 "양호" 반환
        if avg_score < 0.5:
            return "0.양호"
        
        # 가장 높은 가중치를 가진 카테고리 선택 (비듬/탈모 제외된 카테고리에서)
        primary_category = max(filtered_categories.items(), key=lambda x: float(x[1]))[0]
        category_score = float(filtered_categories[primary_category])
        
        print(f"[DEBUG] 비듬/탈모 제외 후 primary_category: {primary_category}, score: {category_score}")
        
        # 엄격한 기준 적용
        if category_score < 0.6:
            # 두 번째로 높은 카테고리 확인
            sorted_categories = sorted(filtered_categories.items(), key=lambda x: float(x[1]), reverse=True)
            if len(sorted_categories) > 1 and float(sorted_categories[1][1]) >= 0.6:
                primary_category = sorted_categories[1][0]
            else:
                return "0.양호"
        
        return primary_category
    
    def _get_primary_severity_with_threshold(self, weighted_severities: Dict[str, float], scores: List[float]) -> str:
        """임계값을 적용한 주요 심각도 결정 (엄격한 기준)"""
        if not weighted_severities:
            return "0.양호"
        
        # 평균 유사도 점수 계산
        avg_score = statistics.mean(scores) if scores else 0
        
        # 임계값: 평균 유사도가 낮으면 양호로 판단 (더 엄격하게)
        if avg_score < 0.5:  # 0.3 → 0.5로 강화
            return "0.양호"
        
        # 가장 높은 가중치를 가진 심각도 선택
        primary_severity = max(weighted_severities.items(), key=lambda x: float(x[1]))[0]
        
        # 중등도/중증 진단을 위해서는 더 높은 유사도 필요 (더 엄격하게)
        if primary_severity in ["2.중등도", "3.중증"]:
            severity_score = float(weighted_severities[primary_severity])
            if severity_score < 0.8:  # 0.6 → 0.8로 강화
                # 경증으로 다운그레이드
                if "1.경증" in weighted_severities:
                    primary_severity = "1.경증"
                else:
                    primary_severity = "0.양호"
        
        # 경증 진단도 더 엄격한 기준 적용
        elif primary_severity == "1.경증":
            severity_score = float(weighted_severities[primary_severity])
            if severity_score < 0.6:  # 경증도 0.6 이상 필요
                primary_severity = "0.양호"
        
        return primary_severity
    
    def _generate_recommendations(self, values: Dict[str, List[int]], categories: List[str]) -> List[str]:
        """진단 결과 기반 추천사항 생성"""
        recommendations = []
        
        # 각 카테고리별 추천사항
        category_recommendations = {
            "미세각질": [
                "부드러운 각질 제거 제품 사용",
                "과도한 마사지 피하기",
                "수분 공급에 집중"
            ],
            "피지과다": [
                "깨끗한 샴푸 사용",
                "두피 마사지로 혈액순환 개선",
                "지성 두피 전용 제품 사용"
            ],
            "모낭사이홍반": [
                "자극이 적은 샴푸 사용",
                "두피 보습 관리",
                "스트레스 관리"
            ],
            "모낭홍반농포": [
                "의료진 상담 권장",
                "항균 샴푸 사용",
                "두피 청결 유지"
            ],
            "비듬": [  # 데이터는 유지하지만 결과에서 제외
                "항진균 샴푸 사용",
                "규칙적인 샴푸",
                "두피 건조 방지"
            ],
            "탈모": [
                "두피 마사지",
                "영양 균형 잡힌 식단",
                "충분한 수면",
                "의료진 상담 권장"
            ]
        }
        
        # 주요 카테고리별 추천사항 추가
        primary_category = self._get_most_common(categories)
        if primary_category in category_recommendations:
            recommendations.extend(category_recommendations[primary_category])
        
        # 높은 점수 카테고리별 추가 추천
        for key, vals in values.items():
            if vals is not None and len(vals) > 0 and statistics.mean(vals) > 1.5:  # 중등도 이상
                category_name = {
                    "value_1": "미세각질",
                    "value_2": "피지과다",
                    "value_3": "모낭사이홍반", 
                    "value_4": "모낭홍반농포",
                    "value_5": "비듬"  # 데이터는 수집하지만 결과에서 제외
                    # "value_6": "탈모" - 제외
                }.get(key, "")
                
                if category_name and category_name != primary_category and category_name != "비듬":
                    recommendations.extend(category_recommendations.get(category_name, []))
        
        # 중복 제거 및 상위 5개만 반환
        unique_recommendations = list(dict.fromkeys(recommendations))
        return unique_recommendations[:5]
    
    def search_by_specific_condition(self, 
                                   image_bytes: bytes, 
                                   category: str, 
                                   top_k: int = 5) -> Dict[str, Any]:
        """특정 조건으로 필터링하여 검색"""
        try:
            # 사용자 이미지 전처리 (의료용 이미지 수준으로)
            preprocessed_image_bytes = image_preprocessing_service.preprocess_for_medical_analysis(image_bytes)
            
            # CLIP 앙상블로 이미지 특징 추출 (전처리된 이미지 사용)
            hybrid_features = self.clip_service.extract_hybrid_features(preprocessed_image_bytes)
            query_vector = hybrid_features["combined"]
            
            if query_vector is None or len(query_vector) == 0:
                return {"success": False, "error": "이미지 특징 추출 실패"}
            
            # 특정 카테고리로 검색
            # NumPy 배열을 리스트로 변환
            query_vector_list = query_vector.tolist() if hasattr(query_vector, 'tolist') else query_vector
            similar_cases = self.pinecone_service.search_by_category(
                query_vector_list, category, top_k
            )
            
            if similar_cases is None or len(similar_cases) == 0:
                return {
                    "success": False,
                    "error": f"{category} 카테고리의 유사 케이스를 찾을 수 없습니다."
                }
            
            # 유사 케이스에 이미지 경로 정보 추가 (탈모 제외)
            enhanced_similar_cases = []
            for case in similar_cases:
                enhanced_case = case.copy()
                metadata = case.get("metadata", {})
                
                # 탈모 카테고리인 경우 제외
                case_category = metadata.get("category", "")
                if case_category == "탈모":
                    continue
                
                image_path = get_image_path_from_metadata(metadata)
                if image_path:
                    enhanced_case["image_path"] = image_path
                enhanced_similar_cases.append(enhanced_case)
            
            return {
                "success": True,
                "category": category,
                "similar_cases": enhanced_similar_cases,
                "total_cases": len(similar_cases)
            }
            
        except Exception as e:
            import traceback
            print(f"[ERROR] 카테고리 검색 오류: {str(e)}")
            print(f"[ERROR] 오류 상세: {traceback.format_exc()}")
            return {"success": False, "error": str(e)}

# 전역 인스턴스
rag_service = RAGService()
