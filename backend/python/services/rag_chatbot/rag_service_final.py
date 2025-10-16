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

# 로깅 설정 (먼저 설정)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경변수 로드 - 프로젝트 루트의 .env 파일 찾기
current_dir = Path(__file__).resolve().parent  # services/rag_chatbot/
project_root = current_dir.parent.parent.parent.parent  # MOZARA/
env_path = project_root / ".env"

if env_path.exists():
    load_dotenv(str(env_path))
    logger.info(f"✅ .env 파일 로드: {env_path}")
else:
    logger.warning(f"⚠️ .env 파일 없음: {env_path}")

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

class HairLossRAGChatbotWithMemory:
    """사용자별 메모리 관리를 지원하는 RAG 챗봇"""

    def __init__(self):
        """RAG 챗봇 초기화"""
        self.setup_apis()
        self.setup_vectorstores()
        self.setup_llm()

        # 사용자별 메모리 저장소 (user_id: memory)
        self.user_memories = {}
        # 사용자별 체인 저장소 (user_id: chain)
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

        # GOOGLE_API_KEY 사용
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        if not self.google_api_key:
            raise ValueError("GOOGLE_API_KEY가 설정되지 않았습니다.")

        logger.info(f"✅ API 키 설정 완료")

    def setup_vectorstores(self):
        """Pinecone 벡터스토어 설정"""
        try:
            logger.info("🔄 Pinecone 초기화 시작...")
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

            # list_indexes() 호출 제거하고 직접 연결 시도
            for name, index_name in index_names.items():
                try:
                    logger.info(f"🔄 {name} 벡터스토어 연결 시도: {index_name}")
                    vectorstore = PineconeVectorStore(
                        index_name=index_name,
                        embedding=self.embeddings,
                        pinecone_api_key=self.pinecone_api_key
                    )
                    self.vectorstores[name] = vectorstore
                    logger.info(f"✅ {name} 벡터스토어 연결 성공: {index_name}")
                except Exception as e:
                    logger.warning(f"⚠️  {name} 연결 실패 (건너뜀): {e}")
                    continue

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
            logger.error(f"❌ 벡터스토어 설정 실패: {e}")
            raise

    def setup_llm(self):
        """LLM 설정"""
        # 환경변수로도 설정
        os.environ["GOOGLE_API_KEY"] = self.google_api_key

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=self.google_api_key,
            temperature=0.3,
            convert_system_message_to_human=False
        )
        logger.info("✅ Gemini LLM 설정 완료 (model: gemini-2.5-flash)")

    def get_or_create_chain(self, user_id: str) -> ConversationalRetrievalChain:
        """사용자별 체인 가져오기 또는 생성"""

        # 이미 존재하는 체인이면 반환
        if user_id in self.user_chains:
            logger.info(f"🔄 기존 체인 사용: {user_id}")
            return self.user_chains[user_id]

        # 새 메모리 생성
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )
        self.user_memories[user_id] = memory

        # Condense Question Prompt - 대화 기록을 고려하여 독립적인 질문으로 변환
        condense_template = """이전 대화 기록과 후속 질문이 주어졌을 때, 독립적이고 완전한 질문으로 변환하세요.

중요:
- 대화 기록에 있는 정보를 질문에 포함시키세요
- "내 이름"처럼 대화 맥락을 참조하는 부분은 실제 값으로 대체하세요
- 대화 기록에만 답이 있는 질문이라면 그대로 유지하세요

이전 대화 기록:
{chat_history}

후속 질문: {question}
독립적인 질문:"""

        condense_question_prompt = PromptTemplate.from_template(condense_template)

        # QA Prompt - 답변 생성용 (이전 대화 기록 포함)
        qa_template = """당신은 탈모 전문 상담사입니다.

답변 규칙:
1. 질문이 이전 대화 내용을 참조하는 경우, 대화 기록을 우선적으로 확인하세요
2. 탈모 관련 의학 질문은 제공된 참고 문서를 기반으로 답변하세요
3. 문서에 관련 내용이 없으면 일반적인 정보로 답변하되, 전문의 상담을 권장하세요
4. 친근하고 이해하기 쉬운 한국어로 답변하세요
5. 답변은 300자 이내로 간결하게 해주세요

참고 문서:
{context}

질문: {question}

답변:"""

        qa_prompt = PromptTemplate.from_template(qa_template)

        # 새 체인 생성 - get_chat_history 추가
        def get_chat_history(inputs) -> str:
            """대화 기록을 문자열로 변환"""
            res = []
            for msg in inputs:
                if hasattr(msg, 'content'):
                    role = "사용자" if msg.__class__.__name__ == "HumanMessage" else "AI"
                    res.append(f"{role}: {msg.content}")
            return "\n".join(res) if res else "이전 대화 없음"

        chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.retriever,
            memory=memory,
            return_source_documents=True,
            condense_question_prompt=condense_question_prompt,
            combine_docs_chain_kwargs={"prompt": qa_prompt},
            get_chat_history=get_chat_history,
            verbose=True
        )

        self.user_chains[user_id] = chain
        logger.info(f"🆕 새 체인 생성: {user_id}")

        return chain

    def is_hair_related_question(self, message: str, source_docs: List) -> bool:
        """질문이 탈모 관련인지 판별"""
        # 1. 검색된 문서가 있고 유사도 점수가 충분히 높은지 확인
        if source_docs and len(source_docs) > 0:
            # 문서에 score 속성이 있는지 확인
            if hasattr(source_docs[0], 'metadata'):
                # 유사도 점수 확인 (보통 0.7 이상이면 관련성이 높음)
                # LangChain Document는 score를 직접 가지지 않으므로 문서 존재 여부로 판단
                return True
        
        # 2. 탈모 관련 키워드 확인
        hair_keywords = [
            '탈모', '모발', '머리', '헤어', '모낭', '두피', 
            '미녹시딜', '피나스테리드', '프로페시아', '아보다트',
            '모발이식', 'aga', 'fphl', 'dht', '안드로겐',
            '원형탈모', '지루성', '비듬', '가르마', '정수리',
            'hair', 'baldness', 'alopecia', 'finasteride', 'minoxidil'
        ]
        
        message_lower = message.lower()
        if any(keyword in message_lower for keyword in hair_keywords):
            return True
        
        # 3. 검색 결과도 없고 키워드도 없으면 탈모 관련 아님
        return False

    def chat(self, message: str, conversation_id: str = None, user_id: str = None) -> Dict:
        """챗봇 대화 - 사용자별 메모리 유지"""
        try:
            # conversation_id가 없으면 기본값
            if not conversation_id:
                conversation_id = "default"
            
            # user_id가 없으면 anonymous로 설정
            if not user_id:
                user_id = "anonymous"

            logger.info(f"💬 [{conversation_id}] 사용자 질문: {message}")

            # 사용자별 체인 가져오기
            chain = self.get_or_create_chain(user_id)

            # 대화 기록 확인
            memory = self.user_memories.get(user_id)
            if memory and hasattr(memory, 'chat_memory'):
                msg_count = len(memory.chat_memory.messages)
                logger.info(f"📚 [{user_id}] 대화 기록: {msg_count}개 메시지")

            # LangChain Chain 실행
            result = chain.invoke({"question": message})

            # 응답 추출
            answer = result.get("answer", "")
            source_docs = result.get("source_documents", [])

            # 탈모 관련 질문인지 확인
            is_hair_related = self.is_hair_related_question(message, source_docs)
            
            # 소스 정보 - 탈모 관련일 때만 표시
            sources = []
            if is_hair_related:
                for doc in source_docs[:3]:
                    metadata = doc.metadata
                    title = metadata.get('title', metadata.get('source', 'Unknown'))
                    if title not in sources:
                        sources.append(title)

            logger.info(f"✅ [{user_id}] 답변 생성 완료")
            logger.info(f"🔍 탈모 관련 질문: {is_hair_related}")
            logger.info(f"📖 출처: {sources}")

            # 응답 후 메모리 카운트 (체인이 메모리에 저장한 후)
            final_memory = self.user_memories.get(user_id)
            final_count = len(final_memory.chat_memory.messages) if final_memory and hasattr(final_memory, 'chat_memory') else 0

            logger.info(f"💾 [{user_id}] 최종 메시지 수: {final_count}")

            return {
                "response": answer,
                "sources": sources,
                "conversation_id": conversation_id,
                "timestamp": datetime.now().isoformat(),
                "context_used": len(source_docs) > 0 and is_hair_related,
                "message_count": final_count,
                "is_hair_related": is_hair_related
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

    def clear_conversation(self, conversation_id: str, user_id: str):
        """특정 사용자의 대화 기록 삭제"""
        if user_id in self.user_chains:
            del self.user_chains[user_id]
        if user_id in self.user_memories:
            del self.user_memories[user_id]
        logger.info(f"🗑️  사용자 {user_id} 대화 기록 삭제: {conversation_id}")

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