import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings


# 환경 변수 로드
load_dotenv("../../../.env")
load_dotenv(".env")


def _get_genai_client():
    """google-generativeai 클라이언트를 구성하여 반환."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY가 설정되지 않았습니다.")
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    return genai


def _get_encyclopedia_vectorstore():
    """탈모 백과사전 벡터스토어 반환."""
    pinecone_api_key = os.getenv("PINECONE_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")

    if not pinecone_api_key or not openai_api_key:
        raise RuntimeError("PINECONE_API_KEY 또는 OPENAI_API_KEY가 설정되지 않았습니다.")

    embeddings = OpenAIEmbeddings(
        openai_api_key=openai_api_key,
        model="text-embedding-ada-002"
    )

    index_name = os.getenv("PINECONE_INDEX_NAME3", "hair-encyclopedia")

    vectorstore = PineconeVectorStore(
        index_name=index_name,
        embedding=embeddings,
        pinecone_api_key=pinecone_api_key
    )

    return vectorstore


def _retrieve_encyclopedia_context(vectorstore, topic: str) -> str:
    """
    벡터스토어에서 주제와 관련된 문서 내용을 검색하여 문자열로 반환.

    Args:
        vectorstore: Pinecone 벡터스토어 인스턴스
        topic: 검색할 주제 (예: "남성형 탈모", "미노시딜")

    Returns:
        검색된 문서 내용을 결합한 문자열
    """
    try:
        # 유사도 검색으로 관련 문서 가져오기 (상위 5개)
        docs = vectorstore.similarity_search(topic, k=5)

        # 문서 내용 추출 및 결합
        context_parts = []
        for doc in docs:
            content = doc.page_content.strip()
            if content:
                # 메타데이터가 있으면 출처 표시
                metadata = doc.metadata
                source = metadata.get('title', metadata.get('source', ''))
                if source:
                    context_parts.append(f"[출처: {source}]\n{content}")
                else:
                    context_parts.append(content)

        return "\n\n---\n\n".join(context_parts)

    except Exception as e:
        print(f"❌ 백과사전 검색 실패 (topic: {topic}): {e}")
        return ""


def generate_hair_quiz_service(topic: str = None) -> List[Dict[str, str]]:
    """
    주어진 주제에 대해 백과사전 내용을 검색하고, 이를 기반으로 OX 퀴즈 12개를 생성한다.

    Args:
        topic: 퀴즈 주제 (예: "남성형 탈모"). None이면 다양한 주제로 퀴즈 생성

    Returns:
        퀴즈 리스트 [{"question": "...", "answer": "O/X", "explanation": "..."}]
    """

    # 1. 벡터스토어를 가져온다
    print("📚 탈모 백과사전 벡터스토어 연결 중...")
    try:
        vectorstore = _get_encyclopedia_vectorstore()
        print("✅ 벡터스토어 연결 성공")
    except Exception as e:
        print(f"❌ 벡터스토어 연결 실패: {e}")
        vectorstore = None

    # 2. 주어진 topic으로 문서를 검색해서 context를 가져온다
    context = ""

    if vectorstore:
        if topic:
            # 특정 주제가 주어진 경우
            print(f"🔍 주제 '{topic}'에 대한 문서 검색 중...")
            context = _retrieve_encyclopedia_context(vectorstore, topic)
        else:
            # 주제가 없으면 다양한 주제 검색 (랜덤하게)
            print("🔍 다양한 탈모 주제에 대한 문서 검색 중...")
            import random

            quiz_topics = [
                "남성형 탈모", "여성형 탈모", "원형 탈모",
                "탈모 치료", "미노시딜", "피나스테리드", "두타스테리드",
                "두피 관리", "탈모 예방", "DHT", "안드로겐",
                "탈모 영양제", "탈모 샴푸", "모발 이식", "레이저 치료",
                "스트레스성 탈모", "휴지기 탈모", "BASP 분류", "루드비히 분류",
                "탈모 진단", "탈모 자가진단", "갑상선과 탈모", "빈혈과 탈모"
            ]

            # 랜덤하게 5개 주제 선택
            selected_topics = random.sample(quiz_topics, min(5, len(quiz_topics)))
            print(f"📌 선택된 주제: {', '.join(selected_topics)}")

            all_contexts = []
            for t in selected_topics:
                ctx = _retrieve_encyclopedia_context(vectorstore, t)
                if ctx:
                    all_contexts.append(ctx)

            context = "\n\n========\n\n".join(all_contexts)

    # 3. 만약 context 검색에 실패하면, 기본 방식으로 퀴즈 생성
    if not context:
        print("⚠️  백과사전 내용을 찾지 못했습니다. 기본 방식으로 퀴즈를 생성합니다.")
    else:
        print(f"✅ 백과사전 내용 검색 완료 (길이: {len(context)} 자)")

    # 4. Gemini 클라이언트 준비
    genai = _get_genai_client()

    # temperature 설정으로 다양성 증가
    generation_config = {
        'temperature': 1.0,  # 높은 temperature로 다양한 퀴즈 생성
        'top_p': 0.95,
        'top_k': 40,
    }

    model = genai.GenerativeModel(
        'gemini-2.0-flash-exp',
        generation_config=generation_config
    )

    # 5. LLM 프롬프트 구성 (context 포함 여부에 따라)
    import random
    import datetime

    # 매번 다른 퀴즈를 위한 랜덤 시드
    random_seed = random.randint(1, 100000)
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")

    if context:
        # RAG 방식: 백과사전 내용 기반
        prompt = f"""당신은 탈모 전문가이자 퀴즈 출제자입니다.

[퀴즈 생성 ID: {timestamp}-{random_seed}]

**🚨 중요 지시사항:**
1. 이전에 생성한 문제와 **완전히 다른** 새로운 문제를 만드세요!
2. **같은 주제를 반복하지 마세요!** (예: 남성형 탈모 유전 관련 문제는 최대 1-2개만)
3. 아래 백과사전의 **다양한 주제를 골고루** 활용하세요!
4. 여성형 탈모, 원형 탈모, 치료제, 두피 관리, 진단 방법 등 **여러 카테고리**에서 문제를 만드세요!

아래는 탈모 백과사전에서 검색한 전문 지식입니다.
**반드시 이 내용을 근거로** O/X 퀴즈 12개를 생성해주세요.

=== 탈모 백과사전 내용 ===
{context}

=== 퀴즈 생성 요구사항 ===
1. 위 백과사전 내용에 나온 사실을 기반으로 문제 출제
2. 답변(answer)은 반드시 'O' 또는 'X'만 사용
3. **IMPORTANT: explanation 필드는 절대 생략 불가**
4. explanation(문제풀이)에는 다음을 포함:
   - **백과사전의 어떤 내용이 근거인지 명확히 언급**
   - 왜 O 또는 X인지 구체적 설명
   - 탈모 관리에 도움되는 실용적 조언
   - 최소 2-3문장 (70자 이상)

5. 결과는 반드시 아래 JSON 배열 형식으로만 응답:

[
  {{
    "question": "DHT는 남성형 탈모의 주요 원인 호르몬이다.",
    "answer": "O",
    "explanation": "백과사전에 따르면 DHT(디하이드로테스토스테론)는 남성 호르몬인 테스토스테론이 5-알파 환원효소에 의해 변환된 형태로, 모낭을 축소시켜 남성형 탈모를 유발합니다. 따라서 DHT 억제가 탈모 치료의 핵심입니다."
  }},
  {{
    "question": "두 번째 문제",
    "answer": "X",
    "explanation": "두 번째 문제에 대한 상세한 해설"
  }}
]

**주의: question, answer, explanation 세 필드 모두 필수입니다!**"""

    else:
        # 기본 방식: 일반 지식 기반
        prompt = f"""당신은 탈모 전문가이자 퀴즈 출제자입니다.
탈모에 관한 O/X 퀴즈 12개를 생성해주세요.

=== 퀴즈 생성 요구사항 ===
1. 탈모와 관련된 다양한 주제 포함 (원인, 치료, 예방, 두피 관리 등)
2. 답변(answer)은 반드시 'O' 또는 'X'만 사용
3. explanation(문제풀이)은 구체적이고 실용적으로 작성 (최소 70자 이상)
4. 결과는 반드시 아래 JSON 배열 형식으로만 응답 (다른 텍스트 절대 금지):

[
  {{"question": "스트레스는 탈모를 유발할 수 있다.", "answer": "O", "explanation": "스트레스는 원형 탈모와 같은 급성 탈모의 주요 원인 중 하나입니다. 스트레스 호르몬인 코르티솔이 과도하게 분비되면 모낭의 성장 주기가 방해받아 탈모가 발생할 수 있습니다. 스트레스 관리와 충분한 휴식이 탈모 예방에 도움이 됩니다."}},
  ...
]

위 형식의 JSON 배열만 출력하세요."""

    # 6. LLM 호출
    print("🤖 Gemini로 OX 퀴즈 생성 중...")
    try:
        response = model.generate_content(prompt)
        raw_text = response.text.strip()

        # JSON 파싱 전처리: 코드 블록 제거
        if raw_text.startswith("```"):
            # ```json ... ``` 형태 제거
            lines = raw_text.split("\n")
            lines = [line for line in lines if not line.strip().startswith("```")]
            raw_text = "\n".join(lines).strip()

        # JSON 파싱
        quiz_list = json.loads(raw_text)

        # 디버깅: Gemini 응답 출력
        print(f"📋 Gemini 원본 응답 (첫 번째 항목): {quiz_list[0] if quiz_list else 'empty'}")

        if not isinstance(quiz_list, list):
            raise ValueError("응답이 JSON 배열 형식이 아닙니다.")

        # 검증 및 후처리: 각 퀴즈 항목이 question, answer, explanation을 포함하는지 확인
        for idx, quiz in enumerate(quiz_list):
            # 필수 필드 확인
            if not all(key in quiz for key in ["question", "answer"]):
                raise ValueError(f"퀴즈 항목 {idx}에 필수 필드(question, answer)가 누락되었습니다: {quiz}")

            # explanation이 없거나 비어있으면 기본 해설 추가
            if "explanation" not in quiz or not quiz["explanation"] or len(quiz["explanation"].strip()) < 10:
                # 백과사전 기반 기본 해설 생성
                if quiz["answer"] == "O":
                    quiz["explanation"] = f"백과사전 내용에 따르면 이 내용은 사실입니다. 탈모 관리를 위해 이 지식을 기억하세요."
                else:
                    quiz["explanation"] = f"백과사전 내용에 따르면 이 내용은 잘못된 정보입니다. 올바른 지식으로 탈모를 예방하세요."

            # answer가 O 또는 X인지 확인
            if quiz["answer"] not in ["O", "X"]:
                raise ValueError(f"퀴즈 항목 {idx}의 답변이 'O' 또는 'X'가 아닙니다: {quiz['answer']}")

        print(f"✅ OX 퀴즈 {len(quiz_list)}개 생성 완료!")
        return quiz_list

    except json.JSONDecodeError as e:
        print(f"❌ JSON 파싱 실패: {e}")
        print(f"응답 내용:\n{raw_text}")
        return []
    except Exception as e:
        print(f"❌ 퀴즈 생성 실패: {e}")
        return []


# 테스트용 코드 (직접 실행 시)
if __name__ == "__main__":
    # 예시 1: 특정 주제로 퀴즈 생성
    # quizzes = generate_hair_quiz_service(topic="남성형 탈모")

    # 예시 2: 다양한 주제로 퀴즈 생성
    quizzes = generate_hair_quiz_service()

    # 결과 출력
    print("\n=== 생성된 퀴즈 ===")
    for i, quiz in enumerate(quizzes, 1):
        print(f"\n{i}. {quiz['question']}")
        print(f"   답: {quiz['answer']}")
        print(f"   해설: {quiz['explanation']}")
