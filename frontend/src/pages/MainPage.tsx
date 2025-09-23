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
      title: "통합 AI 진단",
      description: "BASP 설문과 모발 분석을 결합한 종합적인 두피 상태 파악",
      highlight: "정확도 95%"
    },
    {
      icon: <Camera className="w-8 h-8 text-green-600" />,
      title: "변화 추적 시스템",
      description: "주간별 사진 비교와 데이터 분석으로 개선 과정을 시각화",
      highlight: "실시간 분석"
    },
    {
      icon: <Award className="w-8 h-8 text-purple-600" />,
      title: "게이미피케이션",
      description: "새싹 포인트와 챌린지로 꾸준한 관리 동기부여",
      highlight: "참여율 3배 향상"
    },
    {
      icon: <Sparkles className="w-8 h-8 text-yellow-600" />,
      title: "미래 헤어스타일 예측",
      description: "AI가 예측하는 개선 후 모습으로 구체적인 목표 설정",
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
      {/* 히어로 섹션 */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-2">
            🚀 AI 기반 개인 맞춤형 탈모 개선 서비스
          </Badge>
          
          <h1 className="text-4xl md:text-6xl mb-6 max-w-4xl mx-auto">
            탈모 개선의 새로운 기준
            <br />
            <span className="text-blue-600">MOZARA</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            단발성 도구가 아닌 완성된 개선 여정. AI 진단부터 지속적인 관리까지, 
            당신의 탈모 개선을 위한 모든 것이 하나의 플랫폼에서.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" onClick={handleDiagnosisStart} className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white">
              무료 AI 진단 시작하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-3 text-gray-600 border-gray-300 hover:bg-gray-50">
              서비스 둘러보기
            </Button>
          </div>

          {/* 히어로 이미지 */}
          <div className="relative max-w-4xl mx-auto">
            <div className="aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1666622833860-562f3a5caa59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwbG9zcyUyMHNjYWxwJTIwdHJlYXRtZW50fGVufDF8fHx8MTc1ODA3NTYyOHww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="MOZARA 서비스 미리보기"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* 플로팅 카드들 */}
            <div className="absolute -top-4 -left-4 bg-white rounded-lg shadow-lg p-3 hidden md:block">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>AI 분석 완료</span>
              </div>
            </div>
            
            <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-3 hidden md:block">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>15% 개선됨</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 통계 섹션 */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-3 text-blue-600">
                  {stat.icon}
                </div>
                <div className="text-3xl mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 주요 기능 섹션 */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl mb-4">
              왜 MOZARA인가요?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              기존의 단발성 도구들과 달리, 진단부터 관리까지 연속적인 개선 여정을 제공합니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3>{feature.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {feature.highlight}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 사용자 후기 섹션 */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl mb-4">
              실제 사용자들의 이야기
            </h2>
            <p className="text-xl text-muted-foreground">
              MOZARA와 함께 변화를 경험한 사용자들의 솔직한 후기
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                      <ImageWithFallback 
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4>{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.age}</p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">
                    "{testimonial.content}"
                  </p>
                  
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {testimonial.improvement}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl mb-6">
            지금 시작하세요
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            무료 AI 진단으로 나만의 탈모 개선 여정을 시작해보세요. 
            <br />단 5분이면 개인 맞춤 분석 결과를 받아볼 수 있습니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleDiagnosisStart} className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white">
              무료 진단 시작하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            * 신용카드 정보 불필요 · 5분 소요 · 즉시 결과 확인
          </p>
        </div>
      </section>
    </div>
  );
}