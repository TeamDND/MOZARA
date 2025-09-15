import { useParams, Link } from 'react-router-dom';
import { Clock, User, Tag, Share2, BookOpen, ChevronRight, ExternalLink } from 'lucide-react';
import { articles } from '../../../data/transformed-articles';

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
    <div className="max-w-4xl mx-auto">
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
        <Link to="/" className="hover:text-gray-900">홈</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/hair-encyclopedia/category/${article.category.id}`} className="hover:text-gray-900">
          {article.category.name}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900">{article.subcategory}</span>
      </nav>

      <article className="space-y-8">
        <header className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 ${article.category.color} rounded-lg flex items-center justify-center`}>
              <span className="text-white text-sm">{article.category.icon}</span>
            </div>
            <span className="text-sm font-medium text-gray-600">{article.subcategory}</span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              article.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
              article.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {article.difficulty === 'beginner' ? '초급' :
               article.difficulty === 'intermediate' ? '중급' : '고급'}
            </span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-gray-200">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {article.readTime}분 읽기
              </div>
              {article.author && (
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  {article.author}
                </div>
              )}
              <div className="text-gray-500">
                {article.lastUpdated} 업데이트
              </div>
            </div>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <Share2 className="w-4 h-4" />
              <span className="text-sm font-medium">공유하기</span>
            </button>
          </div>
        </header>

        <div className="prose prose-lg max-w-none bg-white rounded-lg p-6 shadow-sm border">
          <div 
            className="article-content"
            dangerouslySetInnerHTML={{ 
              __html: article.content
                .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mb-4 mt-8 first:mt-0">$1</h1>')
                .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mb-3 mt-8">$1</h2>')
                .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 mb-2 mt-6">$1</h3>')
                .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-gray-900 mb-2 mt-4">$1</h4>')
                .replace(/^\*\*(.+)\*\*: (.+)$/gm, '<div class="mb-2"><strong class="text-gray-900">$1</strong>: $2</div>')
                .replace(/^\*\*(\d+단계)\*\*: (.+)$/gm, '<div class="mb-2 p-3 bg-blue-50 rounded-lg"><strong class="text-blue-600">$1</strong>: $2</div>')
                .replace(/^⚠️ (.+)$/gm, '<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4"><p class="text-yellow-800 font-medium">⚠️ $1</p></div>')
                .replace(/^- \*\*(.+?)\*\*: (.+)$/gm, '<div class="mb-2 pl-4 border-l-2 border-gray-200"><strong class="text-gray-900">$1</strong>: $2</div>')
                .replace(/^- (.+)$/gm, '<div class="mb-2 pl-4 text-gray-700">• $1</div>')
                .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 leading-relaxed">')
                .replace(/^(.+)$/gm, '<p class="mb-4 text-gray-700 leading-relaxed">$1</p>')
            }} 
          />
        </div>

        {/* 출처 정보 추가 */}
        {(article.source || article.sourceUrl) && (
          <div className="pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">출처</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-gray-600" />
                {article.sourceUrl ? (
                  <a 
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                  >
                    <span>{article.source}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-gray-700 font-medium">{article.source}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="pt-8 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">태그</h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </article>

      <aside className="mt-12 pt-8 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedArticles.map((relatedArticle) => (
            <Link
              key={relatedArticle.id}
              to={`/article/${relatedArticle.id}`}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 border"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-1 text-xs font-medium text-white rounded ${relatedArticle.category.color}`}>
                  {relatedArticle.subcategory}
                </span>
                <span className="text-xs text-gray-500">{relatedArticle.readTime}분</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-3 line-clamp-2">
                {relatedArticle.title}
              </h4>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{relatedArticle.author}</span>
                <span>{relatedArticle.lastUpdated}</span>
              </div>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default ArticlePage;