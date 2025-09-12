#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MOZARA 백엔드 서버 실행 스크립트
"""
import uvicorn
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

if __name__ == "__main__":
    # 환경 변수 확인
    api_key = os.getenv("ELEVEN_ST_API_KEY")
    if not api_key:
        print("WARNING: ELEVEN_ST_API_KEY가 설정되지 않았습니다.")
        print("   backend/.env 파일에 API 키를 설정해주세요.")
        print("   예: ELEVEN_ST_API_KEY=your_api_key_here")
        print("   API 키가 없어도 더미 데이터로 테스트할 수 있습니다.")
    else:
        print(f"SUCCESS: API 키가 설정되었습니다: {api_key[:10]}...")
    
    print("\nSTARTING: MOZARA 백엔드 서버를 시작합니다...")
    print("   서버 주소: http://localhost:8000")
    print("   API 문서: http://localhost:8000/docs")
    print("   헬스 체크: http://localhost:8000/health")
    print("\n   종료하려면 Ctrl+C를 누르세요.\n")
    
    # 서버 실행
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 개발 모드에서 코드 변경 시 자동 재시작
        log_level="info"
    )
