#!/usr/bin/env python3
"""
LLM JSON 파싱 문제 디버그 - 1건 테스트
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from PIL import Image

# config 설정
class HardcodedSettings:
    UPLOAD_DIR = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend/uploads"
    EMBEDDING_DIMENSION = 1536
    MODEL_NAME = "convnext_large.fb_in22k_ft_in1k_384"
    DATASET_PATH = "C:/Users/301/Desktop/hair_loss_rag/hair_rag_dataset_image/hair_rag_dataset_ragging"
    FAISS_INDEX_PATH = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend/data/vector_index.faiss"
    STAGE_DESCRIPTIONS = {
        2: "경미한 탈모", 3: "초기 탈모", 4: "중기 탈모",
        5: "진행된 탈모", 6: "심한 탈모", 7: "매우 심한 탈모"
    }

# config를 직접 덮어쓰기
import app.config
app.config.settings = HardcodedSettings()

from app.services.hair_loss_analyzer import HairLossAnalyzer

async def debug_single_llm():
    """1건 LLM 테스트로 JSON 응답 확인"""
    print("=" * 60)
    print("LLM JSON 파싱 디버그 - 1건 테스트")
    print("=" * 60)

    # 테스트 이미지 경로
    test_image_path = "C:/Users/301/Desktop/test_data_set/test/2/20231109103954UbVvLx_jpg.rf.08bf8f0253ff6ec4a392e60407a7ca05.jpg"

    if not Path(test_image_path).exists():
        print(f"[ERROR] 테스트 이미지를 찾을 수 없습니다: {test_image_path}")
        return

    print(f"테스트 이미지: {test_image_path}")
    print(f"정답 레벨: 2")

    try:
        # 애널라이저 초기화
        analyzer = HairLossAnalyzer()
        print("HairLossAnalyzer 초기화 완료")

        # 이미지 로드
        image = Image.open(test_image_path).convert('RGB')
        print("이미지 로드 완료")

        # 1. FAISS 전용 분석
        print("\n--- FAISS 전용 분석 ---")
        faiss_result = await analyzer.analyze_image(image, "test.jpg", use_llm=False)
        print(f"FAISS 예측: {faiss_result.get('predicted_stage')}")
        print(f"FAISS 신뢰도: {faiss_result.get('confidence')}")
        print(f"FAISS 성공: {faiss_result.get('success')}")

        # 2. LLM 통합 분석 (디버그 모드)
        print("\n--- LLM 통합 분석 (디버그) ---")
        llm_result = await analyzer.analyze_image(image, "test.jpg", use_llm=True)

        print(f"LLM 성공: {llm_result.get('success')}")
        print(f"LLM 예측: {llm_result.get('predicted_stage')}")
        print(f"LLM 신뢰도: {llm_result.get('confidence')}")

        # 분석 세부사항 확인
        analysis_details = llm_result.get('analysis_details', {})
        print(f"분석 방법: {analysis_details.get('method', 'unknown')}")

        # 토큰 사용량 확인
        token_usage = analysis_details.get('token_usage', {})
        print(f"토큰 사용량: {token_usage}")

        # 원시 응답 확인 (JSON 파싱 실패시)
        if 'raw_response' in analysis_details:
            print(f"\n--- LLM 원시 응답 ---")
            print(analysis_details['raw_response'][:500] + "..." if len(analysis_details.get('raw_response', '')) > 500 else analysis_details.get('raw_response', ''))

        # LLM 애널라이저 직접 호출해보기
        print("\n--- LLM 애널라이저 직접 테스트 ---")
        llm_analyzer = analyzer.llm_analyzer

        # FAISS 결과를 LLM에 전달
        direct_llm_result = await llm_analyzer.analyze_with_llm(image, faiss_result)
        print(f"직접 호출 성공: {direct_llm_result.get('success')}")

        if 'raw_response' in direct_llm_result:
            print(f"\n--- 직접 호출 원시 응답 ---")
            raw_response = direct_llm_result['raw_response']
            print(f"응답 길이: {len(raw_response)} 문자")
            print(f"응답 미리보기:\n{raw_response[:1000]}")

            # JSON 파싱 시도
            print(f"\n--- JSON 파싱 시도 ---")
            try:
                if "```json" in raw_response:
                    json_start = raw_response.find("```json") + 7
                    json_end = raw_response.find("```", json_start)
                    json_content = raw_response[json_start:json_end].strip()
                    print(f"마크다운 JSON 추출: {json_content[:200]}")
                elif "{" in raw_response and "}" in raw_response:
                    json_start = raw_response.find("{")
                    json_end = raw_response.rfind("}") + 1
                    json_content = raw_response[json_start:json_end]
                    print(f"JSON 부분 추출: {json_content[:200]}")
                else:
                    json_content = raw_response
                    print(f"전체 응답을 JSON으로 시도: {json_content[:200]}")

                parsed_json = json.loads(json_content)
                print(f"JSON 파싱 성공!")
                print(f"파싱된 데이터: {json.dumps(parsed_json, indent=2, ensure_ascii=False)}")

            except json.JSONDecodeError as e:
                print(f"JSON 파싱 실패: {e}")
                print(f"파싱 시도한 내용: {json_content}")

        # 토큰 사용량 재확인
        if 'token_usage' in direct_llm_result:
            print(f"\n토큰 사용량: {direct_llm_result['token_usage']}")

    except Exception as e:
        print(f"[ERROR] 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_single_llm())