import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Sparkles, Brain, Camera, Award, TrendingUp, Users, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { ImageWithFallback } from '../hooks/ImageWithFallback';
import { useSelector } from 'react-redux';
import { RootState } from '../utils/store';
import { useNavigate } from 'react-router-dom';

interface MainPageProps {
  setCurrentView?: (view: string) => void;
}

export function MainPage({ setCurrentView }: MainPageProps = {}) {
  const navigate = useNavigate();

  // Redux에서 사용자 정보와 토큰 가져오기
  const user = useSelector((state: RootState) => state.user);
  const token = useSelector((state: RootState) => state.token.jwtToken);

  // 로그인 상태 확인
  const isLoggedIn = !!(user.username && token);

  // 진단 시작 핸들러
  const handleDiagnosisStart = () => {
    if (isLoggedIn) {
      // 로그인된 경우 IntegratedDiagnosis로 이동
      if (setCurrentView) {
        setCurrentView('integrated-diagnosis');
      } else {
        navigate('/integrated-diagnosis');
      }
    } else {
      // 로그인되지 않은 경우 LogIn 페이지로 이동
      if (setCurrentView) {
        setCurrentView('login');
      } else {
        navigate('/login');
      }
    }
  };

  const features = [
    {
      icon: <Brain className="w-8 h-8 text-blue-600" />,
      title: "AI 탈모 분석",
      description: "이미지와 기본정보를 기반으로 쉽고 빠르게 AI 탈모 분석",
      highlight: "정확도 75%"
    },
    {
      icon: <Camera className="w-8 h-8 text-green-600" />,
      title: "데일리 케어 서비스",
      description: "매일 모발 상태를 체크하고 관리",
      highlight: "데일리 서비스"
    },
    {
      icon: <Award className="w-8 h-8 text-purple-600" />,
      title: "탈모 PT",
      description: "새싹 키우기를 통한 생활습관 챌린지로 헤어 관리 동기부여",
      highlight: "참여율 3배 향상"
    },
    {
      icon: <Sparkles className="w-8 h-8 text-yellow-600" />,
      title: "그 밖에 특화된 컨텐츠",
      description: "AI를 통한 내 머리에 가발생성, OX퀴즈 및 각종 유튜브 영상자료 등 컨텐츠 제공",
      highlight: "3D 시뮬레이션"
    }
  ];

  const testimonials = [
    {
      name: "김민수",
      age: "32세",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      content: "3개월 만에 확실한 변화를 느꼈어요. 특히 챌린지 시스템이 재미있어서 꾸준히 할 수 있었습니다.",
      improvement: "모발 밀도 23% 개선"
    },
    {
      name: "박진호",
      age: "28세",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      content: "과학적인 분석과 개인 맞춤 계획이 정말 도움이 되었어요. 이제 자신감이 생겼습니다.",
      improvement: "두피 건강도 35% 개선"
    },
    {
      name: "이승우",
      age: "35세",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
      content: "매주 변화를 눈으로 확인할 수 있어서 동기부여가 확실했어요. 포기하지 않게 해주는 서비스입니다.",
      improvement: "전체 점수 41% 개선"
    }
  ];

  const stats = [
    { label: "누적 사용자", value: "15,000+", icon: <Users className="w-5 h-5" /> },
    { label: "평균 만족도", value: "4.8", icon: <Star className="w-5 h-5" /> },
    { label: "개선 성공률", value: "89%", icon: <TrendingUp className="w-5 h-5" /> },
    { label: "지속 사용률", value: "76%", icon: <CheckCircle className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-First 컨테이너: PC에서는 모바일 레이아웃을 중앙 정렬 */}
      <div className="max-w-full md:max-w-md lg:max-w-lg mx-auto bg-white min-h-screen">
        {/* 히어로 섹션 - 풀스크린 모바일 경험 */}
        <section className="py-8 px-4 text-center">
          <Badge variant="secondary" className="mb-4 px-3 py-1.5 text-xs bg-blue-50 text-blue-700">
            AI 탈모 분석을 통한 맞춤 컨텐츠 및 솔루션 서비스
          </Badge>

          <h1 className="text-2xl mb-4 leading-tight font-bold">
            <span className="text-blue-600">MOZARA</span>
          </h1>

          <p className="text-sm text-gray-600 mb-6 px-2 leading-relaxed">
          '혹시 나도 탈모일까?'
          누구에게도 털어놓기 어려웠던 고민, 이제 AI와 함께 쉽고 빠르게 나만의 맞춤 솔루션을 제공받아보세요
          </p>

          {/* 터치 우선 버튼 - 풀 너비 */}
          <div className="space-y-3 mb-8">
            <Button
              onClick={handleDiagnosisStart}
              className="w-full min-h-[48px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl shadow-md active:scale-[0.98] transition-all"
            >
              AI 분석 시작하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="w-full min-h-[48px] px-6 py-3 text-gray-700 border-2 border-gray-200 hover:bg-gray-50 text-base rounded-xl active:scale-[0.98] transition-all"
              onClick={() => navigate('/main')}
            >
              서비스 둘러보기
            </Button>
          </div>

          {/* 모바일 히어로 이미지 - 카드 스타일 */}
          <div className="relative mx-2 mb-6">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-green-50 shadow-lg">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1666622833860-562f3a5caa59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwbG9zcyUyMHNjYWxwJTIwdHJlYXRtZW50fGVufDF8fHx8MTc1ODA3NTYyOHww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="MOZARA 서비스 미리보기"
                className="w-full h-full object-cover"
              />
            </div>

            {/* 모바일 성과 배지들 */}
            <div className="flex justify-center gap-2 mt-4">
              <div className="bg-green-100 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-800">AI 분석 완료</span>
              </div>
              <div className="bg-blue-100 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">15% 개선됨</span>
              </div>
            </div>
          </div>
        </section>

        {/* 통계 섹션 - 모바일 카드 기반 */}
        <section className="py-6 px-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="flex justify-center mb-2 text-blue-600">
                  {stat.icon}
                </div>
                <div className="text-lg font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 주요 기능 섹션 - 모바일 카드 스크롤 */}
        <section className="py-6 px-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">
              왜 MOZARA인가요?
            </h2>
            <p className="text-sm text-gray-600 px-2">
              기존의 단발성 도구들과 달리, 진단부터 관리까지 연속적인 개선 여정을 제공합니다
            </p>
          </div>

          {/* 모바일 세로 카드 스택 */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <Card key={index} className="p-4 border-0 shadow-md bg-white rounded-2xl active:scale-[0.98] transition-transform">
                <CardContent className="p-0">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 ml-2">
                          {feature.highlight}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 사용자 후기 섹션 - 모바일 스크롤 */}
        <section className="py-6 px-4 bg-gray-50">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">
              실제 사용자들의 이야기
            </h2>
            <p className="text-sm text-gray-600">
              MOZARA와 함께 변화를 경험한 사용자들의 솔직한 후기
            </p>
          </div>

          {/* 모바일 수평 스크롤 카드 */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="min-w-[280px] p-4 bg-white rounded-2xl shadow-md snap-start">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      <ImageWithFallback
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">{testimonial.name}</h4>
                      <p className="text-xs text-gray-500">{testimonial.age}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                    "{testimonial.content}"
                  </p>

                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs border-0">
                    {testimonial.improvement}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA 섹션 - 모바일 스티키 */}
        <section className="py-8 px-4 bg-white border-t border-gray-100">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-3">
              지금 시작하세요
            </h2>
            <p className="text-sm text-gray-600 mb-6 px-2 leading-relaxed">
              무료 AI 진단으로 나만의 탈모 개선 여정을 시작해보세요.
              단 5분이면 개인 맞춤 분석 결과를 받아볼 수 있습니다.
            </p>

            {/* 모바일 풀 너비 CTA 버튼 */}
            <Button
              onClick={handleDiagnosisStart}
              className="w-full min-h-[52px] px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-2xl shadow-lg active:scale-[0.98] transition-all"
            >
              분석 시작하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>


          </div>
        </section>
      </div>
    </div>
  );
}