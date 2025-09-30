"""
RAG 기반 탈모 전문 챗봇 서비스 (LangChain 완전 활용)
LangChain의 ConversationalRetrievalChain과 MultiQueryRetriever 사용
"""
import os
import logging
from typing import List, Dict, Optional
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# 환경변수 로드
load_dotenv("../../../../.env")
load_dotenv("../../.env")

# LangChain imports
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import PromptTemplate, ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain.retrievers import MergerRetriever
from langchain.schema import Document

# Pinecone imports
from pinecone import Pinecone

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImprovedHairLossRAGChatbot:
    def __init__(self):
        """RAG 챗봇 초기화 - LangChain 완전 활용"""
        self.setup_apis()
        self.setup_vectorstores()
        self.setup_memory()
        self.setup_llm()
        self.setup_chain()

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

        # Google Gemini 설정 (생성용)
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        if not self.google_api_key:
            raise ValueError("GOOGLE_API_KEY가 설정되지 않았습니다.")

        logger.info(f"✅ API 키 설정 완료")

    def setup_vectorstores(self):
        """Pinecone 벡터스토어 설정 - LangChain VectorStore 사용"""
        try:
            # Pinecone 초기화
            pc = Pinecone(api_key=self.pinecone_api_key)

            # OpenAI 임베딩 모델
            self.embeddings = OpenAIEmbeddings(
                openai_api_key=self.openai_api_key,
                model="text-embedding-ada-002"
            )

            # 인덱스 이름들
            index_names = {
                'papers': os.getenv("PINECONE_INDEX_NAME1", "hair-loss-papers"),
                'encyclopedia': os.getenv("PINECONE_INDEX_NAME3", "hair-encyclopedia")
            }

            # LangChain VectorStore 생성
            self.vectorstores = {}
            for name, index_name in index_names.items():
                try:
                    if index_name in pc.list_indexes().names():
                        vectorstore = PineconeVectorStore(
                            index_name=index_name,
                            embedding=self.embeddings,
                            pinecone_api_key=self.pinecone_api_key
                        )
                        self.vectorstores[name] = vectorstore
                        logger.info(f"✅ {name} 벡터스토어 연결 성공: {index_name}")
                    else:
                        logger.warning(f"⚠️  인덱스 없음: {index_name}")
                except Exception as e:
                    logger.error(f"❌ {name} 벡터스토어 연결 실패: {e}")

            if not self.vectorstores:
                raise ValueError("사용 가능한 벡터스토어가 없습니다.")

            # MergerRetriever로 여러 벡터스토어 통합
            retrievers = [
                vs.as_retriever(search_kwargs={"k": 5})
                for vs in self.vectorstores.values()
            ]

            # 여러 retriever를 하나로 합치기
            self.retriever = MergerRetriever(retrievers=retrievers)

            logger.info("✅ 벡터스토어 설정 완료 (MergerRetriever 사용)")

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

    def setup_llm(self):
        """LLM 설정 - ChatGoogleGenerativeAI 사용"""
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-exp",
            google_api_key=self.google_api_key,
            temperature=0.3,
            convert_system_message_to_human=True
        )
        logger.info("✅ Gemini LLM 설정 완료")

    def setup_chain(self):
        """ConversationalRetrievalChain 설정"""

        # 시스템 프롬프트
        system_template = """당신은 탈모 전문 상담사입니다. 아래 제공된 의학 논문과 전문 자료를 **반드시 참고하여** 답변을 작성해주세요.

중요한 규칙:
1. **제공된 참고 문서의 내용을 기반으로** 구체적으로 답변하세요
2. 문서에서 찾은 정보를 인용하고, 출처를 명시하세요
3. 문서에 관련 내용이 없으면 "제공된 자료에서는 해당 정보를 찾을 수 없습니다"라고 답변하세요
4. 의학적 조언은 전문의 상담을 권장하고, 연구 기반 정보만 제공하세요
5. 친근하고 이해하기 쉬운 한국어로 답변하세요
6. 답변은 300자 이내로 간결하게 해주세요

참고 문서 (의학 논문 및 연구 자료):
{context}"""

        # 프롬프트 템플릿 생성
        messages = [
            SystemMessagePromptTemplate.from_template(system_template),
            HumanMessagePromptTemplate.from_template("{question}")
        ]
        qa_prompt = ChatPromptTemplate.from_messages(messages)

        # ConversationalRetrievalChain 생성
        self.chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.retriever,
            memory=self.memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": qa_prompt},
            verbose=False
        )

        logger.info("✅ ConversationalRetrievalChain 설정 완료")

    def chat(self, message: str, conversation_id: str = None) -> Dict:
        """챗봇 대화 메인 함수 - LangChain Chain 사용"""
        try:
            logger.info(f"💬 사용자 질문: {message}")

            # LangChain Chain 실행
            result = self.chain({"question": message})

            # 응답 추출
            answer = result.get("answer", "")
            source_docs = result.get("source_documents", [])

            # 소스 정보 추출
            sources = []
            for doc in source_docs[:3]:  # 최대 3개
                metadata = doc.metadata
                title = metadata.get('title', metadata.get('source', 'Unknown'))
                if title not in sources:
                    sources.append(title)

            logger.info(f"✅ 답변 생성 완료: {answer[:100]}...")
            logger.info(f"📚 사용된 문서 수: {len(source_docs)}")
            logger.info(f"📖 출처: {sources}")

            return {
                "response": answer,
                "sources": sources,
                "conversation_id": conversation_id or "default",
                "timestamp": datetime.now().isoformat(),
                "context_used": len(source_docs) > 0
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
            "vectorstores": list(self.vectorstores.keys()),
            "memory_messages": len(self.memory.chat_memory.messages) if hasattr(self.memory, 'chat_memory') else 0,
            "apis": {
                "pinecone": bool(self.pinecone_api_key),
                "openai": bool(self.openai_api_key),
                "gemini": bool(self.google_api_key)
            },
            "langchain_components": {
                "llm": "ChatGoogleGenerativeAI",
                "chain": "ConversationalRetrievalChain",
                "retriever": "MergerRetriever",
                "memory": "ConversationBufferMemory"
            }
        }

# 글로벌 인스턴스
_chatbot_instance = None

def get_improved_rag_chatbot() -> ImprovedHairLossRAGChatbot:
    """개선된 RAG 챗봇 싱글톤 인스턴스 반환"""
    global _chatbot_instance
    if _chatbot_instance is None:
        _chatbot_instance = ImprovedHairLossRAGChatbot()
    return _chatbot_instance

if __name__ == "__main__":
    # 테스트
    try:
        print("=" * 60)
        print("개선된 RAG 챗봇 테스트 (LangChain 완전 활용)")
        print("=" * 60)

        chatbot = ImprovedHairLossRAGChatbot()

        # 상태 확인
        status = chatbot.get_health_status()
        print(f"\n상태: {status}")

        # 테스트 질문
        test_questions = [
            "남성형 탈모(AGA)의 원인은 무엇인가요?",
            "피나스테리드와 미녹시딜의 효과 차이는?",
            "여성형 탈모는 어떻게 관리하나요?"
        ]

        for question in test_questions:
            print(f"\n질문: {question}")
            result = chatbot.chat(question)
            print(f"답변: {result['response']}")
            print(f"출처: {result['sources']}")

    except Exception as e:
        logger.error(f"테스트 실패: {e}")
        import traceback
        traceback.print_exc()