"""
CLIP 앙상블 서비스 - 다중 CLIP 모델과 프롬프트를 활용한 고성능 특징 추출
"""
import torch
import open_clip
import numpy as np
from PIL import Image
import io
from typing import List, Dict, Optional, Tuple
import logging
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import hashlib

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CLIPEnsembleService:
    """CLIP 앙상블 서비스 - 다중 모델과 프롬프트 조합"""
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.models = {}
        self.prompt_sets = {}
        self.model_weights = {}
        self._initialize_models()
        self._initialize_prompts()
        logger.info(f"✅ CLIP 앙상블 서비스 초기화 완료 (디바이스: {self.device})")
    
    def _initialize_models(self):
        """CLIP 모델 초기화 (open_clip_torch 사용) - 메모리 최적화된 앙상블"""
        model_configs = [
            ("ViT-B-32", "openai", 0.4, "기본 모델 - 빠르고 안정적"),
            ("ViT-B-16", "openai", 0.3, "고해상도 모델 - 세밀한 특징"),
            ("RN50", "openai", 0.3, "ResNet 기반 - 다른 아키텍처")
        ]
        
        for model_name, pretrained, weight, description in model_configs:
            try:
                model, _, preprocess = open_clip.create_model_and_transforms(
                    model_name, 
                    pretrained=pretrained, 
                    device=self.device
                )
                tokenizer = open_clip.get_tokenizer(model_name)
                
                # 메모리 최적화: 모델을 eval 모드로 설정
                model.eval()
                
                # GPU 메모리 정리
                if self.device == "cuda":
                    torch.cuda.empty_cache()
                
                self.models[model_name] = {
                    "model": model,
                    "preprocess": preprocess,
                    "tokenizer": tokenizer,
                    "weight": weight,
                    "description": description
                }
                logger.info(f"✅ {model_name} 로드 완료 ({description})")
            except Exception as e:
                logger.warning(f"⚠️ {model_name} 로드 실패: {str(e)}")
                # 메모리 부족 시 GPU 메모리 정리
                if self.device == "cuda":
                    torch.cuda.empty_cache()
        
        # 가중치 정규화
        if self.models:
            total_weight = sum(config["weight"] for config in self.models.values())
            for model_name in self.models:
                self.models[model_name]["weight"] /= total_weight
    
    def _initialize_prompts(self):
        """다양한 관점의 프롬프트 세트 초기화"""
        self.prompt_sets = {
            "medical": {
                "prompts": [
                    "healthy scalp with clean skin",
                    "scalp with dandruff flakes",
                    "oily scalp with excess sebum production",
                    "scalp with red inflammation",
                    "scalp with clogged hair follicles"
                ],
                "weight": 0.4,
                "description": "의료적 관점 (탈모 제외)"
            },
            "descriptive": {
                "prompts": [
                    "scalp with white spots and flakes",
                    "shiny oily scalp surface",
                    "red inflamed scalp area",
                    "scalp with visible hair follicles",
                    "scalp with skin irritation",
                    "clean healthy scalp skin"
                ],
                "weight": 0.3,
                "description": "시각적 설명"
            },
            "symptom_based": {
                "prompts": [
                    "scalp showing signs of dandruff",
                    "scalp with excessive oil production",
                    "scalp with inflammation signs",
                    "scalp with skin problems",
                    "normal healthy scalp condition"
                ],
                "weight": 0.3,
                "description": "증상 기반 (탈모 제외)"
            }
        }
    
    def _get_image_hash(self, image_bytes: bytes) -> str:
        """이미지 해시 생성 (캐싱용)"""
        return hashlib.md5(image_bytes).hexdigest()
    
    def _extract_single_model_features(self, image_bytes: bytes, model_name: str) -> Tuple[np.ndarray, np.ndarray]:
        """단일 모델 특징 추출"""
        if model_name not in self.models:
            raise ValueError(f"모델 {model_name}이 로드되지 않았습니다")
        
        config = self.models[model_name]
        model = config["model"]
        preprocess = config["preprocess"]
        
        # 이미지 로드 및 전처리
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image_input = preprocess(image).unsqueeze(0).to(self.device)
        
        # 특징 추출 (메모리 최적화)
        with torch.no_grad():
            image_features = model.encode_image(image_input)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            # CPU로 이동하여 GPU 메모리 해제
            result = image_features.cpu().numpy().flatten()
            
            # GPU 메모리 정리
            del image_features, image_input
            if self.device == "cuda":
                torch.cuda.empty_cache()
        
        return result, None
    
    def extract_single_model_features(self, image_bytes: bytes, model_name: str) -> np.ndarray:
        """단일 모델로 특징 추출"""
        features, _ = self._extract_single_model_features(image_bytes, model_name)
        return features.flatten()
    
    def extract_ensemble_features(self, image_bytes: bytes) -> np.ndarray:
        """앙상블 특징 추출 (다중 모델)"""
        all_features = []
        weights = []
        
        # 병렬 처리로 모든 모델에서 특징 추출
        with ThreadPoolExecutor(max_workers=len(self.models)) as executor:
            futures = {}
            
            for model_name, config in self.models.items():
                future = executor.submit(
                    self.extract_single_model_features, 
                    image_bytes, 
                    model_name
                )
                futures[future] = (model_name, config["weight"])
            
            # 결과 수집
            for future in futures:
                model_name, weight = futures[future]
                try:
                    features = future.result()
                    all_features.append(features)
                    weights.append(weight)
                    logger.debug(f"✅ {model_name} 특징 추출 완료")
                except Exception as e:
                    logger.error(f"❌ {model_name} 특징 추출 실패: {str(e)}")
        
        if not all_features:
            raise RuntimeError("모든 모델에서 특징 추출에 실패했습니다")
        
        # 가중 평균으로 앙상블
        # 모든 특징 벡터를 동일한 차원으로 맞춤
        min_dim = min(features.shape[0] for features in all_features)
        normalized_features = []
        
        for features in all_features:
            if features.shape[0] > min_dim:
                # 차원이 큰 경우 앞부분만 사용
                normalized_features.append(features[:min_dim])
            else:
                # 차원이 작은 경우 패딩
                padded = np.zeros(min_dim)
                padded[:features.shape[0]] = features
                normalized_features.append(padded)
        
        # 특징 결합 (concatenation) 방식으로 앙상블
        # 모든 모델의 특징을 연결하여 차원 증가
        ensemble_features = np.concatenate(normalized_features, axis=0)
        
        # L2 정규화
        ensemble_features = ensemble_features / (np.linalg.norm(ensemble_features) + 1e-8)
        
        # 메모리 정리
        del normalized_features, all_features, weights
        if self.device == "cuda":
            torch.cuda.empty_cache()
        
        logger.info(f"🔍 앙상블 특징 추출 완료: {len(ensemble_features)}차원, {len(self.models)}개 모델 사용")
        return ensemble_features
    
    def extract_prompt_ensemble_features(self, image_bytes: bytes) -> Dict[str, np.ndarray]:
        """프롬프트 앙상블 특징 추출"""
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        prompt_features = {}
        
        for category, config in self.prompt_sets.items():
            prompts = config["prompts"]
            weight = config["weight"]
            
            # 각 모델에서 프롬프트별 특징 추출
            category_features = []
            
            for model_name, model_config in self.models.items():
                model = model_config["model"]
                preprocess = model_config["preprocess"]
                tokenizer = model_config["tokenizer"]
                model_weight = model_config["weight"]
                
                # 텍스트 토큰화 (open_clip_torch 사용)
                text_inputs = tokenizer(prompts).to(self.device)
                
                # 이미지 전처리
                image_input = preprocess(image).unsqueeze(0).to(self.device)
                
                with torch.no_grad():
                    # 이미지와 텍스트 특징 추출
                    image_features = model.encode_image(image_input)
                    text_features = model.encode_text(text_inputs)
                    
                    # 정규화
                    image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                    text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                    
                    # 유사도 계산
                    similarities = torch.matmul(image_features, text_features.T)
                    
                    # 가중 평균
                    weighted_similarities = similarities * model_weight
                    category_features.append(weighted_similarities.cpu().numpy())
            
            # 모델별 결과 결합
            if category_features:
                combined_features = np.mean(category_features, axis=0)
                prompt_features[category] = combined_features.flatten()
                logger.debug(f"✅ {category} 프롬프트 특징 추출 완료")
        
        return prompt_features
    
    def extract_hybrid_features(self, image_bytes: bytes) -> Dict[str, np.ndarray]:
        """하이브리드 특징 추출 (모델 앙상블 + 프롬프트 앙상블)"""
        # 모델 앙상블 특징
        model_features = self.extract_ensemble_features(image_bytes)
        
        # 프롬프트 앙상블 특징
        prompt_features = self.extract_prompt_ensemble_features(image_bytes)
        
        # 모든 특징 결합
        hybrid_features = {
            "model_ensemble": model_features,
            **prompt_features
        }
        
        # 통합 특징 벡터 생성
        all_feature_vectors = [model_features]
        for features in prompt_features.values():
            all_feature_vectors.append(features)
        
        # 결합된 특징 벡터 (차원 확인 후 결합)
        try:
            combined_features = np.concatenate(all_feature_vectors)
        except ValueError as e:
            # 차원이 맞지 않는 경우, 모든 벡터를 동일한 차원으로 맞춤
            min_dim = min(len(fv) for fv in all_feature_vectors)
            normalized_vectors = []
            
            for fv in all_feature_vectors:
                if len(fv) > min_dim:
                    normalized_vectors.append(fv[:min_dim])
                else:
                    padded = np.zeros(min_dim)
                    padded[:len(fv)] = fv
                    normalized_vectors.append(padded)
            
            combined_features = np.concatenate(normalized_vectors)
        hybrid_features["combined"] = combined_features
        
        logger.info(f"🔍 하이브리드 특징 추출 완료: {len(combined_features)}차원")
        return hybrid_features
    
    def extract_weighted_ensemble_features(self, image_bytes: bytes, model_weights: Dict[str, float]) -> np.ndarray:
        """가중치 조정된 앙상블 특징 추출 (Pinecone 데이터 재업로드 없이)"""
        all_features = []
        weights = []
        
        # 병렬 처리로 모든 모델에서 특징 추출
        with ThreadPoolExecutor(max_workers=len(self.models)) as executor:
            futures = {}
            
            for model_name, config in self.models.items():
                # 사용자 지정 가중치 사용
                weight = model_weights.get(model_name, config["weight"])
                future = executor.submit(
                    self.extract_single_model_features, 
                    image_bytes, 
                    model_name
                )
                futures[future] = (model_name, weight)
            
            # 결과 수집
            for future in futures:
                model_name, weight = futures[future]
                try:
                    features = future.result()
                    all_features.append(features)
                    weights.append(weight)
                    logger.debug(f"✅ {model_name} 특징 추출 완료 (가중치: {weight})")
                except Exception as e:
                    logger.error(f"❌ {model_name} 특징 추출 실패: {str(e)}")
        
        if not all_features:
            raise RuntimeError("모든 모델에서 특징 추출에 실패했습니다")
        
        # 가중 평균으로 앙상블 (기존 concatenation 대신)
        # 모든 특징 벡터를 동일한 차원으로 맞춤
        min_dim = min(features.shape[0] for features in all_features)
        normalized_features = []
        
        for features in all_features:
            if features.shape[0] > min_dim:
                # 차원이 큰 경우 앞부분만 사용
                normalized_features.append(features[:min_dim])
            else:
                # 차원이 작은 경우 패딩
                padded = np.zeros(min_dim)
                padded[:features.shape[0]] = features
                normalized_features.append(padded)
        
        # 가중 평균 계산
        weighted_ensemble = np.zeros(min_dim)
        total_weight = sum(weights)
        
        for features, weight in zip(normalized_features, weights):
            weighted_ensemble += features * (weight / total_weight)
        
        # L2 정규화
        weighted_ensemble = weighted_ensemble / (np.linalg.norm(weighted_ensemble) + 1e-8)
        
        # 메모리 정리
        del normalized_features, all_features, weights
        if self.device == "cuda":
            torch.cuda.empty_cache()
        
        logger.info(f"🔍 가중치 조정 앙상블 특징 추출 완료: {len(weighted_ensemble)}차원")
        return weighted_ensemble
    
    def get_model_info(self) -> Dict[str, any]:
        """모델 정보 반환"""
        return {
            "service_name": "CLIP Ensemble Service",
            "device": self.device,
            "models": {
                name: {
                    "weight": config["weight"],
                    "description": config["description"]
                } for name, config in self.models.items()
            },
            "prompt_sets": {
                name: {
                    "weight": config["weight"],
                    "description": config["description"],
                    "prompt_count": len(config["prompts"])
                } for name, config in self.prompt_sets.items()
            },
            "feature_dimensions": {
                "model_ensemble": 512,  # CLIP 기본 차원
                "prompt_ensemble": 512 * len(self.prompt_sets),
                "combined": 512 * (1 + len(self.prompt_sets))
            }
        }
    
    def health_check(self) -> Dict[str, any]:
        """서비스 상태 확인"""
        return {
            "status": "healthy" if self.models else "unavailable",
            "loaded_models": list(self.models.keys()),
            "prompt_sets": list(self.prompt_sets.keys()),
            "device": self.device,
            "cache_size": self._cached_single_model_features.cache_info().currsize
        }

# 전역 인스턴스
clip_ensemble_service = CLIPEnsembleService()
