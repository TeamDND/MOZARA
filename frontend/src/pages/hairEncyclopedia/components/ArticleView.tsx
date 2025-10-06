import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react';

// Mock article data - 실제로는 백엔드 API에서 가져올 데이터
const articleData: Record<string, any> = {
  'genetic-factors': {
    title: '유전적 요인과 탈모',
    category: 'causes',
    categoryTitle: '탈모 원인',
    author: '김탈모박사',
    date: '2024-01-15',
    readTime: '5분',
    content: `
# 유전적 요인과 탈모

## 개요
탈모는 다양한 원인에 의해 발생하지만, 그 중에서도 유전적 요인이 가장 큰 비중을 차지합니다. 특히 남성형 탈모(안드로겐성 탈모)의 경우 80% 이상이 유전적 영향을 받는다고 알려져 있습니다.

## 유전성 탈모의 메커니즘

### 1. DHT(디하이드로테스토스테론)의 역할
- 테스토스테론이 5α-리덕타아제 효소에 의해 DHT로 변환
- DHT가 모낭의 안드로겐 수용체에 결합
- 모낭 축소와 모발 성장 주기 단축

### 2. 유전자의 영향
- AR 유전자(안드로겐 수용체 유전자)
- 주로 모계 쪽에서 유전되는 경향
- 여러 유전자들의 복합적 작용

## 유전성 탈모의 특징

### 남성형 탈모 패턴
1. M자형 탈모: 이마 양쪽 모서리부터 시작
2. O자형 탈모: 정수리 부위부터 시작
3. 복합형: M자형과 O자형이 동시에 진행

### 여성형 탈모 패턴
- 정수리 부위의 전반적인 모발 밀도 감소
- 헤어라인은 비교적 유지
- 완전 대머리로 진행되는 경우는 드물어

## 예방과 관리

### 조기 발견의 중요성
- 가족력이 있다면 20대부터 관찰
- 초기 증상: 모발이 가늘어짐, 탈모량 증가

### 관리 방법
1. **약물 치료**
   - 미녹시딜: 혈관 확장을 통한 모발 성장 촉진
   - 피나스테리드: DHT 생성 억제

2. **생활 습관 개선**
   - 규칙적인 운동
   - 균형잡힌 영양 섭취
   - 스트레스 관리

3. **모발 관리**
   - 적절한 샴푸 선택
   - 과도한 열 스타일링 피하기
   - 두피 마사지

## 결론
유전적 요인에 의한 탈모는 완전히 막을 수는 없지만, 조기 발견과 적절한 관리를 통해 진행을 늦출 수 있습니다. 가족력이 있다면 미리 전문의와 상담하여 예방 계획을 세우는 것이 중요합니다.
    `,
    tags: ['유전', 'DHT', '남성형탈모', '안드로겐', '호르몬']
  },
  'minoxidil-guide': {
    title: '미녹시딜 사용법과 효과',
    category: 'treatments',
    categoryTitle: '치료법',
    author: '최치료',
    date: '2024-01-20',
    readTime: '7분',
    content: `
# 미녹시딜 사용법과 효과

## 미녹시딜이란?
미녹시딜(Minoxidil)은 원래 고혈압 치료제로 개발되었으나, 부작용으로 다모증이 나타나면서 탈모 치료제로 재개발된 약물입니다.

## 작용 원리
- **혈관 확장**: 두피 혈관을 확장시켜 모낭으로의 혈류 증가
- **성장인자 자극**: VEGF, FGF 등 모발 성장 인자 분비 촉진
- **모발 성장기 연장**: 모발의 성장기를 늘려 더 굵고 긴 모발 생성

## 사용법

### 1. 용법·용량
- **2% 용액**: 하루 2회, 1회 1ml 적용
- **5% 용액**: 하루 2회, 1회 1ml 적용 (남성 권장)
- **5% 폼**: 하루 2회, 캡 반 정도의 양

### 2. 사용 방법
1. 깨끗하고 건조한 두피에 적용
2. 탈모 부위를 중심으로 골고루 발라주기
3. 가볍게 마사지하여 흡수 촉진
4. 적용 후 4시간 이상 방치
5. 손 씻기

## 효과와 기대치

### 효과 나타나는 시기
- **초기**: 2-4주 후 일시적 탈모 증가 (정상 반응)
- **중기**: 3-4개월 후 솜털 같은 새 모발 관찰
- **후기**: 6-12개월 후 굵고 검은 모발로 발달

### 효과율
- 남성: 약 60-70%에서 탈모 진행 억제 또는 개선
- 여성: 약 40-60%에서 모발 밀도 개선

## 부작용과 주의사항

### 일반적 부작용
- **국소 반응**: 가려움, 발적, 건조함, 인설
- **접촉성 피부염**: 프로필렌글리콜에 의한 알레르기
- **다모증**: 얼굴이나 손 등 원치 않는 부위 털 증가

### 드문 부작용
- 두통, 현기증
- 심장박동 불규칙 (과량 사용 시)
- 체중 증가, 부종

### 사용 금기
- 임신, 수유 중인 여성
- 심혈관계 질환자 (의사 상담 필요)
- 두피에 상처나 염증이 있는 경우

## 사용 팁

### 최적 사용법
1. 저녁 샤워 후 사용 (흡수 시간 확보)
2. 모발이 완전히 마른 후 적용
3. 지속적 사용 (중단 시 효과 소실)
4. 정기적인 사진 촬영으로 효과 확인

### 병용 치료
- **피나스테리드**: 시너지 효과
- **저준위 레이저**: 추가적 도움
- **영양제**: 비오틴, 아연 등

## 결론
미녹시딜은 FDA 승인을 받은 안전하고 효과적인 탈모 치료제입니다. 올바른 사용법을 지키고 꾸준히 사용한다면 많은 사람들에게 도움이 될 수 있습니다.
    `,
    tags: ['미녹시딜', '치료', '혈관확장', '외용제', 'FDA승인']
  }
};

const ArticleView: React.FC = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const article = articleId ? articleData[articleId] : null;

  if (!article) {
    return (
      <div className="max-w-7xl mx-auto pt-16">
        <div className="px-8 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">문서를 찾을 수 없습니다</h1>
          <Link to="/hair-encyclopedia" className="text-blue-600 hover:text-blue-800">
            백과 홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pt-16">
      <main className="px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="flex items-center mb-8">
            <Link
              to="/hair-encyclopedia"
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              탈모 백과
            </Link>
            <span className="text-gray-400">/</span>
            <Link
              to={`/hair-encyclopedia/category/${article.category}`}
              className="ml-4 mr-4 text-gray-600 hover:text-gray-900"
            >
              {article.categoryTitle}
            </Link>
            <span className="text-gray-400">/</span>
            <span className="ml-4 text-gray-900 font-medium">{article.title}</span>
          </div>

          {/* Article Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{article.title}</h1>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {article.author}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {article.date}
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {article.readTime} 읽기
              </div>
            </div>

            {/* Tags */}
            {article.tags && (
              <div className="flex flex-wrap gap-2 mb-8">
                {article.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Article Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="prose prose-lg max-w-none">
              {article.content.split('\n').map((paragraph: string, index: number) => {
                if (paragraph.startsWith('# ')) {
                  return <h1 key={index} className="text-3xl font-bold text-gray-900 mt-8 mb-4">{paragraph.slice(2)}</h1>;
                } else if (paragraph.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-semibold text-gray-900 mt-6 mb-3">{paragraph.slice(3)}</h2>;
                } else if (paragraph.startsWith('### ')) {
                  return <h3 key={index} className="text-xl font-semibold text-gray-900 mt-5 mb-2">{paragraph.slice(4)}</h3>;
                } else if (paragraph.startsWith('- ') || paragraph.match(/^\d+\. /)) {
                  return <li key={index} className="text-gray-700 mb-1">{paragraph.replace(/^[-\d+.] /, '')}</li>;
                } else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return <p key={index} className="font-semibold text-gray-900 mb-2">{paragraph.slice(2, -2)}</p>;
                } else if (paragraph.trim() === '') {
                  return <div key={index} className="h-2"></div>;
                } else {
                  return <p key={index} className="text-gray-700 leading-relaxed mb-4">{paragraph}</p>;
                }
              })}
            </div>
          </div>

          {/* Related Articles */}
          <div className="mt-12 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">관련 문서</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/hair-encyclopedia/article/hormonal-causes"
                className="block p-4 bg-white rounded-lg hover:shadow-sm transition-shadow"
              >
                <h4 className="font-medium text-gray-900 mb-1">호르몬과 탈모의 관계</h4>
                <p className="text-sm text-gray-600">DHT와 테스토스테론이 탈모에 미치는 영향</p>
              </Link>
              <Link
                to="/hair-encyclopedia/article/finasteride-info"
                className="block p-4 bg-white rounded-lg hover:shadow-sm transition-shadow"
              >
                <h4 className="font-medium text-gray-900 mb-1">피나스테리드 복용 가이드</h4>
                <p className="text-sm text-gray-600">피나스테리드의 효과와 부작용</p>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArticleView;