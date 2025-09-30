"""
RAG 기반 탈모 전문 챗봇 서비스
LangChain과 Pinecone을 활용한 검색 증강 생성
"""
import os
import logging
from typing import List, Dict, Optional
from datetime import datetime
from dotenv import load_dotenv

# LangChain imports
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory

# Pinecone imports
from pinecone import Pinecone

# Google Gemini imports
import google.generativeai as genai

# 환경변수 로드
from pathlib import Path

# 프로젝트 루트 디렉토리 찾기
current_file = Path(__file__)
project_root = current_file.parent.parent.parent.parent.parent  # backend/python/services/rag_chatbot/에서 프로젝트 루트로
env_path = project_root / ".env"

load_dotenv(str(env_path))

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HairLossRAGChatbot:
    def __init__(self):
        """RAG 챗봇 초기화"""
        self.setup_apis()
        self.setup_vectorstore()
        self.setup_memory()
        self.setup_chains()

    def setup_apis(self):
        """API 키 설정"""
        # Pinecone 설정
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        if not self.pinecone_api_key:
            raise ValueError("PINECONE_API_KEY가 설정되지 않았습니다.")

        # OpenAI 설정 (임베딩용)
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        # Google Gemini 설정 (생성용) - GOOGLE_API_KEY 사용
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        if not self.google_api_key:
            raise ValueError("GOOGLE_API_KEY가 설정되지 않았습니다.")

        logger.info(f"🔑 사용할 Gemini API 키: {self.google_api_key[:20]}... (길이: {len(self.google_api_key)})")

        # Gemini 설정
        genai.configure(api_key=self.google_api_key)
        self.gemini_model = genai.GenerativeModel('gemini-2.5-flash-lite')

        logger.info("✅ API 키 설정 완료")

    def setup_vectorstore(self):
        """Pinecone 벡터스토어 설정 - 각 인덱스마다 맞는 임베딩 사용"""
        try:
            # Pinecone 초기화
            pc = Pinecone(api_key=self.pinecone_api_key)

            # 인덱스 이름들 (papers + encyclopedia)
            self.index_names = {
                'papers': os.getenv("PINECONE_INDEX_NAME1", "hair-loss-papers"),
                'encyclopedia': os.getenv("PINECONE_INDEX_NAME3", "hair-encyclopedia")  # 47개 벡터
            }

            # 각 인덱스별 Pinecone 인덱스 객체와 임베딩 모델 저장
            self.indexes = {}
            self.embeddings_map = {}

            # OpenAI 임베딩 (1536 dimension - papers용)
            self.openai_embeddings = OpenAIEmbeddings(
                openai_api_key=self.openai_api_key,
                model="text-embedding-ada-002"
            )

            # 각 인덱스 연결
            for name, index_name in self.index_names.items():
                try:
                    if index_name in pc.list_indexes().names():
                        index = pc.Index(index_name)
                        stats = index.describe_index_stats()
                        dimension = stats.get('dimension', 0)

                        self.indexes[name] = {
                            'index': index,
                            'dimension': dimension,
                            'name': index_name
                        }

                        logger.info(f"✅ {name} 인덱스 연결 성공: {index_name} (dimension: {dimension})")
                    else:
                        logger.warning(f"⚠️  인덱스 없음: {index_name}")
                except Exception as e:
                    logger.error(f"❌ {name} 인덱스 연결 실패: {e}")

            if not self.indexes:
                raise ValueError("사용 가능한 인덱스가 없습니다.")

        except Exception as e:
            logger.error(f"벡터스토어 설정 실패: {e}")
            raise

    def setup_memory(self):
        """대화 메모리 설정"""
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )
        logger.info("✅ 대화 메모리 설정 완료")

    def setup_chains(self):
        """RAG 체인 설정"""
        # 프롬프트 템플릿
        self.prompt_template = PromptTemplate(
            template="""당신은 탈모 전문 상담사입니다. 아래 제공된 의학 논문과 전문 자료를 **반드시 참고하여** 답변을 작성해주세요.

중요한 규칙:
1. **제공된 참고 문서의 내용을 기반으로** 구체적으로 답변하세요
2. 문서에서 찾은 정보를 인용하고, 출처를 명시하세요
3. 문서에 관련 내용이 없으면 "제공된 자료에서는 해당 정보를 찾을 수 없습니다"라고 답변하세요
4. 의학적 조언은 전문의 상담을 권장하고, 연구 기반 정보만 제공하세요
5. 친근하고 이해하기 쉬운 한국어로 답변하세요
6. 답변은 300자 이내로 간결하게 해주세요

참고 문서 (의학 논문 및 연구 자료):
{context}

대화 기록:
{chat_history}

사용자 질문: {question}

답변 (참고 문서의 내용을 기반으로 작성):""",
            input_variables=["context", "chat_history", "question"]
        )

        logger.info("✅ RAG 체인 설정 완료")

    def search_relevant_docs(self, query: str, k: int = 10) -> List[Dict]:
        """여러 인덱스에서 관련 문서 검색 - 각 인덱스에 맞는 임베딩 사용"""
        all_results = []

        for name, index_info in self.indexes.items():
            try:
                index = index_info['index']
                dimension = index_info['dimension']

                # dimension에 맞는 임베딩 생성
                if dimension == 1536:
                    # OpenAI 임베딩 사용
                    query_embedding = self.openai_embeddings.embed_query(query)
                elif dimension == 512:
                    # HuggingFace 임베딩 사용 (512 dimension)
                    from langchain_huggingface import HuggingFaceEmbeddings
                    hf_embeddings = HuggingFaceEmbeddings(
                        model_name="sentence-transformers/all-mpnet-base-v2"  # 768 -> 512로 조정 필요
                    )
                    query_embedding = hf_embeddings.embed_query(query)
                    # 512로 자르기
                    query_embedding = query_embedding[:512]
                else:
                    logger.warning(f"{name} 인덱스의 dimension({dimension})을 지원하지 않습니다. 건너뜁니다.")
                    continue

                # Pinecone 직접 검색
                results = index.query(
                    vector=query_embedding,
                    top_k=k,
                    include_metadata=True
                )

                # 결과 추가
                for match in results.get('matches', []):
                    metadata = match.get('metadata', {})
                    text = metadata.get('text', metadata.get('content', ''))

                    if text:  # 텍스트가 있는 경우만 추가
                        all_results.append({
                            'content': text,
                            'metadata': metadata,
                            'source': name,
                            'score': match.get('score', 0)
                        })

            except Exception as e:
                logger.error(f"{name} 검색 실패: {e}")
                import traceback
                logger.error(traceback.format_exc())

        # 점수순 정렬 (높을수록 유사) 후 상위 k개 반환
        all_results.sort(key=lambda x: x.get('score', 0), reverse=True)
        return all_results[:k]

    def generate_answer_with_gemini(self, question: str, context: str, chat_history: str = "") -> str:
        """Gemini를 사용한 답변 생성"""
        try:
            prompt = self.prompt_template.format(
                context=context,
                chat_history=chat_history,
                question=question
            )

            logger.info(f"🔍 Gemini API 호출 시작")
            logger.info(f"📝 프롬프트 길이: {len(prompt)} 문자")
            logger.info(f"📦 컨텍스트 길이: {len(context)} 문자")

            response = self.gemini_model.generate_content(prompt)

            logger.info(f"✅ Gemini API 응답 받음")
            logger.info(f"📤 응답 텍스트: {response.text[:100] if response.text else 'None'}...")

            if response.text:
                return response.text
            else:
                logger.warning("⚠️ Gemini 응답이 비어있음")
                return "죄송합니다. 답변을 생성할 수 없습니다."

        except Exception as e:
            logger.error(f"❌ Gemini 답변 생성 실패: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"스택 트레이스:\n{traceback.format_exc()}")
            return "죄송합니다. 현재 답변을 생성할 수 없습니다."

    def chat(self, message: str, conversation_id: str = None) -> Dict:
        """챗봇 대화 메인 함수"""
        try:
            logger.info(f"💬 사용자 질문: {message}")

            # 1. 관련 문서 검색
            logger.info("🔍 벡터 검색 시작...")
            relevant_docs = self.search_relevant_docs(message, k=10)
            logger.info(f"📚 검색된 문서 수: {len(relevant_docs)}")

            # 2. 컨텍스트 구성 - 점수와 함께 출력
            context_parts = []
            sources = []

            for idx, doc in enumerate(relevant_docs):
                score = doc.get('score', 0)
                logger.info(f"📄 문서 {idx+1}: [{score:.4f}] {doc['source']} - {doc['content'][:100]}...")

                # 제목과 내용을 명확하게 구분하여 컨텍스트 작성
                title = doc['metadata'].get('title', '제목 없음')
                content = doc['content']
                context_parts.append(f"[논문 {idx+1}] 제목: {title}\n내용: {content}")

                # 소스 정보 추가
                source_info = doc['metadata'].get('title', doc['source'])
                if source_info not in sources:
                    sources.append(source_info)

            context = "\n\n".join(context_parts)
            logger.info(f"📦 컨텍스트 준비 완료 (총 {len(context)} 문자)")
            logger.info(f"📖 참고 자료: {sources}")

            # 3. 대화 기록 가져오기
            chat_history = ""
            if hasattr(self.memory, 'chat_memory') and self.memory.chat_memory.messages:
                history_messages = []
                for msg in self.memory.chat_memory.messages[-6:]:  # 최근 3턴
                    if hasattr(msg, 'content'):
                        history_messages.append(f"{msg.__class__.__name__}: {msg.content}")
                chat_history = "\n".join(history_messages)
                logger.info(f"💭 대화 기록: {len(history_messages)}개 메시지")

            # 4. Gemini로 답변 생성
            logger.info("🤖 Gemini 답변 생성 시작...")
            answer = self.generate_answer_with_gemini(message, context, chat_history)
            logger.info(f"✅ 답변 생성 완료: {answer[:100]}...")

            # 5. 메모리에 저장
            self.memory.save_context(
                {"question": message},
                {"answer": answer}
            )

            return {
                "response": answer,
                "sources": sources[:3],  # 최대 3개 소스
                "conversation_id": conversation_id or "default",
                "timestamp": datetime.now().isoformat(),
                "context_used": len(relevant_docs) > 0
            }

        except Exception as e:
            logger.error(f"❌ 채팅 처리 실패: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"스택 트레이스:\n{traceback.format_exc()}")
            return {
                "response": "죄송합니다. 현재 서비스에 문제가 있습니다. 잠시 후 다시 시도해주세요.",
                "sources": [],
                "conversation_id": conversation_id or "default",
                "timestamp": datetime.now().isoformat(),
                "context_used": False
            }

    def get_health_status(self) -> Dict:
        """서비스 상태 확인"""
        return {
            "status": "healthy",
            "indexes": list(self.indexes.keys()),
            "index_details": {name: {"dimension": info["dimension"], "name": info["name"]} for name, info in self.indexes.items()},
            "memory_messages": len(self.memory.chat_memory.messages) if hasattr(self.memory, 'chat_memory') else 0,
            "apis": {
                "pinecone": bool(self.pinecone_api_key),
                "openai": bool(self.openai_api_key),
                "gemini": bool(self.google_api_key)
            }
        }

# 글로벌 인스턴스
_chatbot_instance = None

def get_rag_chatbot() -> HairLossRAGChatbot:
    """RAG 챗봇 싱글톤 인스턴스 반환"""
    global _chatbot_instance
    if _chatbot_instance is None:
        _chatbot_instance = HairLossRAGChatbot()
    return _chatbot_instance

if __name__ == "__main__":
    # 테스트
    try:
        chatbot = HairLossRAGChatbot()

        # 상태 확인
        status = chatbot.get_health_status()
        print(f"상태: {status}")

        # 테스트 질문
        test_questions = [
            "탈모의 주요 원인은 무엇인가요?",
            "미녹시딜의 효과는 어떤가요?",
            "여성 탈모와 남성 탈모의 차이점은?"
        ]

        for question in test_questions:
            print(f"\n질문: {question}")
            result = chatbot.chat(question)
            print(f"답변: {result['response']}")
            print(f"출처: {result['sources']}")

    except Exception as e:
        logger.error(f"테스트 실패: {e}")