import { useParams, Link } from 'react-router-dom';
import { Clock, User, Tag, Share2, BookOpen, ChevronRight, ExternalLink, ArrowLeft } from 'lucide-react';
import { articles } from '../../../../utils/data/transformed-articles';

const ArticlePage = () => {
  const { articleId } = useParams<{ articleId: string }>();
  
  // 실제 아티클 데이터 찾기
  const article = articles.find(a => a.id === articleId);
  
  // 관련 아티클 찾기
  const relatedArticles = article?.relatedArticles 
    ? articles.filter(a => article.relatedArticles?.includes(a.id))
    : articles.filter(a => a.category.id === article?.category.id && a.id !== articleId).slice(0, 3);

  if (!articleId || !article) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">아티클을 찾을 수 없습니다</h1>
        <Link to="/" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            to={`/hair-encyclopedia/category/${article.category.id}`}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm">{article.category.name}</span>
          </Link>
          <button className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <Share2 className="w-4 h-4" />
            <span className="text-xs font-medium">공유</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <article className="space-y-6">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <div className={`w-8 h-8 ${article.category.color} rounded-lg flex items-center justify-center`}>
                <span className="text-white text-sm">{article.category.icon}</span>
              </div>
              <span className="text-xs font-medium text-gray-600">{article.subcategory}</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                article.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                article.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {article.difficulty === 'beginner' ? '초급' :
                 article.difficulty === 'intermediate' ? '중급' : '고급'}
              </span>
            </div>

            <h1 className="text-lg font-bold text-gray-900 leading-tight text-center">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 py-3 border-y border-gray-200 text-xs text-gray-600">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {article.readTime}분 읽기
              </div>
              {article.author && (
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  {article.author}
                </div>
              )}
              <div className="text-gray-500">
                {article.lastUpdated} 업데이트
              </div>
            </div>
          </header>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div 
              className="article-content text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: article.content
                  .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-gray-900 mb-3 mt-6 first:mt-0">$1</h1>')
                  .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-gray-900 mb-2 mt-6">$1</h2>')
                  .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-gray-900 mb-2 mt-4">$1</h3>')
                  .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold text-gray-900 mb-2 mt-3">$1</h4>')
                  .replace(/^\*\*(.+)\*\*: (.+)$/gm, '<div class="mb-2"><strong class="text-gray-900">$1</strong>: $2</div>')
                  .replace(/^\*\*(\d+단계)\*\*: (.+)$/gm, '<div class="mb-2 p-2 bg-blue-50 rounded-lg"><strong class="text-blue-600">$1</strong>: $2</div>')
                  .replace(/^⚠️ (.+)$/gm, '<div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3"><p class="text-yellow-800 font-medium text-sm">⚠️ $1</p></div>')
                  .replace(/^- \*\*(.+?)\*\*: (.+)$/gm, '<div class="mb-2 pl-3 border-l-2 border-gray-200"><strong class="text-gray-900">$1</strong>: $2</div>')
                  .replace(/^- (.+)$/gm, '<div class="mb-2 pl-3 text-gray-700">• $1</div>')
                  .replace(/\n\n/g, '</p><p class="mb-3 text-gray-700 leading-relaxed text-sm">')
                  .replace(/^(.+)$/gm, '<p class="mb-3 text-gray-700 leading-relaxed text-sm">$1</p>')
              }} 
            />
          </div>

          {/* 출처 정보 추가 */}
          {(article.source || article.sourceUrl) && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">출처</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-gray-600" />
                  {article.sourceUrl ? (
                    <a 
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 text-sm"
                    >
                      <span>{article.source}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-700 font-medium text-sm">{article.source}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm text-center">태그</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {article.tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                >
                  <Tag className="w-2 h-2 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </article>

        <aside className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm text-center">관련 아티클</h3>
          <div className="space-y-3">
            {relatedArticles.map((relatedArticle) => (
              <Link
                key={relatedArticle.id}
                to={`/hair-encyclopedia/article/${relatedArticle.id}`}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 touch-manipulation border"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className={`px-2 py-1 text-xs font-medium text-white rounded ${relatedArticle.category.color}`}>
                      {relatedArticle.subcategory}
                    </span>
                    <span className="text-xs text-gray-500">{relatedArticle.readTime}분</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">
                    {relatedArticle.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-gray-500 w-full">
                    <span>{relatedArticle.author}</span>
                    <span>{relatedArticle.lastUpdated}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </aside>

        {/* Bottom Spacing for Mobile Navigation */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default ArticlePage;