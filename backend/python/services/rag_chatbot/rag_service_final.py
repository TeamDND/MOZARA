"""
RAG 기반 탈모 전문 챗봇 서비스 (사용자별 메모리 관리)
LangChain + 사용자별 대화 기억 기능
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

class HairLossRAGChatbotWithMemory:
    """사용자별 메모리 관리를 지원하는 RAG 챗봇"""

    def __init__(self):
        """RAG 챗봇 초기화"""
        self.setup_apis()
        self.setup_vectorstores()
        self.setup_llm()

        # 사용자별 메모리 저장소 (conversation_id: memory)
        self.user_memories = {}
        # 사용자별 체인 저장소 (conversation_id: chain)
        self.user_chains = {}

        logger.info("✅ RAG 챗봇 초기화 완료 (사용자별 메모리 관리)")

    def setup_apis(self):
        """API 키 설정"""
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        if not self.pinecone_api_key:
            raise ValueError("PINECONE_API_KEY가 설정되지 않았습니다.")

        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        if not self.google_api_key:
            raise ValueError("GOOGLE_API_KEY가 설정되지 않았습니다.")

        logger.info(f"✅ API 키 설정 완료")

    def setup_vectorstores(self):
        """Pinecone 벡터스토어 설정"""
        try:
            pc = Pinecone(api_key=self.pinecone_api_key)

            self.embeddings = OpenAIEmbeddings(
                openai_api_key=self.openai_api_key,
                model="text-embedding-ada-002"
            )

            index_names = {
                'papers': os.getenv("PINECONE_INDEX_NAME1", "hair-loss-papers"),
                'encyclopedia': os.getenv("PINECONE_INDEX_NAME3", "hair-encyclopedia")
            }

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
                        logger.info(f"✅ {name} 벡터스토어 연결: {index_name}")
                    else:
                        logger.warning(f"⚠️  인덱스 없음: {index_name}")
                except Exception as e:
                    logger.error(f"❌ {name} 연결 실패: {e}")

            if not self.vectorstores:
                raise ValueError("사용 가능한 벡터스토어가 없습니다.")

            # MergerRetriever
            retrievers = [
                vs.as_retriever(search_kwargs={"k": 5})
                for vs in self.vectorstores.values()
            ]
            self.retriever = MergerRetriever(retrievers=retrievers)

            logger.info("✅ 벡터스토어 설정 완료")

        except Exception as e:
            logger.error(f"벡터스토어 설정 실패: {e}")
            raise

    def setup_llm(self):
        """LLM 설정"""
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-exp",
            google_api_key=self.google_api_key,
            temperature=0.3,
            convert_system_message_to_human=True
        )
        logger.info("✅ Gemini LLM 설정 완료")

    def get_or_create_chain(self, conversation_id: str) -> ConversationalRetrievalChain:
        """사용자별 체인 가져오기 또는 생성"""

        # 이미 존재하는 체인이면 반환
        if conversation_id in self.user_chains:
            logger.info(f"🔄 기존 체인 사용: {conversation_id}")
            return self.user_chains[conversation_id]

        # 새 메모리 생성
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )
        self.user_memories[conversation_id] = memory

        # 프롬프트 템플릿
        system_template = """당신은 탈모 전문 상담사입니다. 아래 제공된 의학 논문과 전문 자료를 **반드시 참고하여** 답변을 작성해주세요.

중요한 규칙:
1. **제공된 참고 문서의 내용을 기반으로** 구체적으로 답변하세요
2. 문서에서 찾은 정보를 인용하고, 출처를 명시하세요
3. 문서에 관련 내용이 없으면 "제공된 자료에서는 해당 정보를 찾을 수 없습니다"라고 답변하세요
4. 의학적 조언은 전문의 상담을 권장하고, 연구 기반 정보만 제공하세요
5. 친근하고 이해하기 쉬운 한국어로 답변하세요
6. 답변은 300자 이내로 간결하게 해주세요
7. **이전 대화 내용을 기억하고 연속적인 대화를 진행하세요**

참고 문서:
{context}"""

        messages = [
            SystemMessagePromptTemplate.from_template(system_template),
            HumanMessagePromptTemplate.from_template("{question}")
        ]
        qa_prompt = ChatPromptTemplate.from_messages(messages)

        # 새 체인 생성
        chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.retriever,
            memory=memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": qa_prompt},
            verbose=False
        )

        self.user_chains[conversation_id] = chain
        logger.info(f"🆕 새 체인 생성: {conversation_id}")

        return chain

    def chat(self, message: str, conversation_id: str = None) -> Dict:
        """챗봇 대화 - 사용자별 메모리 유지"""
        try:
            # conversation_id가 없으면 기본값
            if not conversation_id:
                conversation_id = "default"

            logger.info(f"💬 [{conversation_id}] 사용자 질문: {message}")

            # 사용자별 체인 가져오기
            chain = self.get_or_create_chain(conversation_id)

            # 대화 기록 확인
            memory = self.user_memories.get(conversation_id)
            if memory and hasattr(memory, 'chat_memory'):
                msg_count = len(memory.chat_memory.messages)
                logger.info(f"📚 [{conversation_id}] 대화 기록: {msg_count}개 메시지")

            # LangChain Chain 실행
            result = chain.invoke({"question": message})

            # 응답 추출
            answer = result.get("answer", "")
            source_docs = result.get("source_documents", [])

            # 소스 정보
            sources = []
            for doc in source_docs[:3]:
                metadata = doc.metadata
                title = metadata.get('title', metadata.get('source', 'Unknown'))
                if title not in sources:
                    sources.append(title)

            logger.info(f"✅ [{conversation_id}] 답변 생성 완료")
            logger.info(f"📖 출처: {sources}")

            return {
                "response": answer,
                "sources": sources,
                "conversation_id": conversation_id,
                "timestamp": datetime.now().isoformat(),
                "context_used": len(source_docs) > 0,
                "message_count": len(memory.chat_memory.messages) if memory else 0
            }

        except Exception as e:
            logger.error(f"❌ 채팅 처리 실패: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "response": "죄송합니다. 현재 서비스에 문제가 있습니다. 잠시 후 다시 시도해주세요.",
                "sources": [],
                "conversation_id": conversation_id or "default",
                "timestamp": datetime.now().isoformat(),
                "context_used": False,
                "message_count": 0
            }

    def clear_conversation(self, conversation_id: str):
        """특정 대화 기록 삭제"""
        if conversation_id in self.user_chains:
            del self.user_chains[conversation_id]
        if conversation_id in self.user_memories:
            del self.user_memories[conversation_id]
        logger.info(f"🗑️  대화 기록 삭제: {conversation_id}")

    def get_health_status(self) -> Dict:
        """서비스 상태 확인"""
        return {
            "status": "healthy",
            "vectorstores": list(self.vectorstores.keys()),
            "active_conversations": len(self.user_chains),
            "conversation_ids": list(self.user_chains.keys()),
            "apis": {
                "pinecone": bool(self.pinecone_api_key),
                "openai": bool(self.openai_api_key),
                "gemini": bool(self.google_api_key)
            },
            "features": {
                "multi_user_memory": True,
                "langchain_chain": "ConversationalRetrievalChain",
                "retriever": "MergerRetriever",
                "memory_per_user": True
            }
        }

# 글로벌 싱글톤 (체인 팩토리 역할)
_chatbot_instance = None

def get_final_rag_chatbot() -> HairLossRAGChatbotWithMemory:
    """RAG 챗봇 인스턴스 반환 (사용자별 메모리 관리)"""
    global _chatbot_instance
    if _chatbot_instance is None:
        _chatbot_instance = HairLossRAGChatbotWithMemory()
    return _chatbot_instance

if __name__ == "__main__":
    # 테스트
    try:
        print("=" * 60)
        print("사용자별 메모리 관리 RAG 챗봇 테스트")
        print("=" * 60)

        chatbot = HairLossRAGChatbotWithMemory()

        # 사용자 1 대화
        print("\n[사용자 1] 대화 시작")
        result1 = chatbot.chat("남성형 탈모의 원인은?", "user-1")
        print(f"답변: {result1['response'][:100]}...")
        print(f"메시지 수: {result1['message_count']}")

        result2 = chatbot.chat("방금 말한 원인 중 가장 중요한 건 뭐야?", "user-1")
        print(f"답변: {result2['response'][:100]}...")
        print(f"메시지 수: {result2['message_count']}")

        # 사용자 2 대화
        print("\n[사용자 2] 대화 시작")
        result3 = chatbot.chat("여성형 탈모는 어떻게 관리하나요?", "user-2")
        print(f"답변: {result3['response'][:100]}...")
        print(f"메시지 수: {result3['message_count']}")

        # 상태 확인
        status = chatbot.get_health_status()
        print(f"\n활성 대화: {status['active_conversations']}개")
        print(f"대화 ID: {status['conversation_ids']}")

    except Exception as e:
        print(f"테스트 실패: {e}")
        import traceback
        traceback.print_exc()