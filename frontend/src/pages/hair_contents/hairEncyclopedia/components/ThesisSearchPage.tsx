import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import apiClient from '../../../../services/apiClient';

interface PaperCard {
  id: string;
  title: string;
  source: string;
  summary_preview: string;
}

interface PaperAnalysis {
  id: string;
  title: string;
  source: string;
  main_topics: string[];
  key_conclusions: string;
  section_summaries: Array<{
    section: string;
    summary: string;
  }>;
}

const ThesisSearchPage = () => {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<PaperCard[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<PaperAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [paperCount, setPaperCount] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  // 페이지 로드 시 맨 위로 스크롤
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    apiClient.get('/ai/encyclopedia/papers/count')
      .then(res => setPaperCount(res.data.count))
      .catch(err => console.error('Failed to fetch paper count:', err));
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setPapers([]);
    setSelectedPaper(null);
    setShowModal(false);
    
    try {
      const response = await apiClient.post('/ai/encyclopedia/search', {
        question: query,
        max_results: 5
      });
      
      const data: PaperCard[] = response.data;
      const uniqueByTitle: PaperCard[] = Array.from(new Map<string, PaperCard>(data.map((p) => [p.title, p])).values());
      setPapers(uniqueByTitle);
    } catch (error) {
      console.error('Search error:', error);
      alert('검색 중 오류가 발생했습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaperClick = async (paperId: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/ai/encyclopedia/paper/${paperId}/analysis`);
      const paperAnalysis: PaperAnalysis = response.data;
      setSelectedPaper(paperAnalysis);
      setShowModal(true);
    } catch (error) {
      console.error('Paper analysis error:', error);
      alert('논문 분석 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPaper(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            to="/hair-encyclopedia"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm">탈모 백과</span>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">논문 검색</h1>
          <div className="w-16"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4">
        {/* Header Info */}
        <div className="text-center py-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl mb-4">
          <h1 className="text-lg font-bold text-gray-900 mb-2">논문 검색</h1>
          {paperCount !== null && (
            <p className="text-xs text-gray-500">
              현재 {paperCount}개의 논문이 저장되어 있습니다
            </p>
          )}
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="탈모 관련 질문을 입력하세요"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium active:scale-95 touch-manipulation"
            >
              {loading ? '검색 중...' : '검색'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !showModal && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600 text-sm">검색 중...</p>
          </div>
        )}

        {/* Search Results */}
        {!loading && papers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 mb-3 text-center">검색 결과 ({papers.length}건)</h2>
            {papers.map((paper) => (
              <div 
                key={paper.id} 
                className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all border border-gray-200 hover:border-blue-300 active:scale-95 touch-manipulation"
                onClick={() => handlePaperClick(paper.id)}
              >
                <div className="flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 flex-1 pr-2 leading-relaxed">
                      {paper.title}
                    </h3>
                    <span className={`${paper.source === 'RISS' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'} px-2 py-1 rounded-full text-xs font-medium flex-shrink-0`}>
                      {paper.source}
                    </span>
                  </div>
                  {paper.summary_preview && (
                    <p className="text-gray-600 text-xs mt-2 line-clamp-2">
                      {paper.summary_preview}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && papers.length === 0 && query === '' && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">📚</div>
            <p className="text-gray-500 text-sm mb-2">탈모 관련 질문을 검색해보세요</p>
            <p className="text-gray-400 text-xs">
              예시: "미녹시딜 효과", "남성형 탈모 원인", "레이저 치료"
            </p>
          </div>
        )}

        {/* No Results */}
        {!loading && papers.length === 0 && query !== '' && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">🔍</div>
            <p className="text-gray-500 text-sm mb-2">
              "{query}"에 대한 논문을 찾을 수 없습니다
            </p>
            <p className="text-gray-400 text-xs">다른 키워드로 다시 검색해보세요</p>
          </div>
        )}

        {/* Bottom Spacing for Mobile Navigation */}
        <div className="h-20"></div>
      </div>

      {/* Paper Analysis Modal - Mobile Optimized */}
      {showModal && selectedPaper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex-1 pr-4">
                <h2 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                  {selectedPaper.title}
                </h2>
                <span className={`${selectedPaper.source === 'RISS' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'} px-2 py-1 rounded-full text-xs font-medium`}>
                  {selectedPaper.source}
                </span>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold active:scale-95 touch-manipulation"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Main Topics */}
              {selectedPaper.main_topics && selectedPaper.main_topics.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">🎯 주요 주제</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPaper.main_topics.map((topic, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Conclusions */}
              {selectedPaper.key_conclusions && (
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">💡 핵심 결론 및 쉬운 요약</h3>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                      {selectedPaper.key_conclusions}
                    </p>
                  </div>
                </div>
              )}

              {/* Section Summaries */}
              {selectedPaper.section_summaries && selectedPaper.section_summaries.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">📋 섹션별 요약</h3>
                  <div className="space-y-3">
                    {selectedPaper.section_summaries.map((section, index) => (
                      <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 active:scale-95 touch-manipulation">
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                          {section.section}
                        </h4>
                        <p className="text-gray-700 leading-relaxed text-sm">
                          {section.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThesisSearchPage;