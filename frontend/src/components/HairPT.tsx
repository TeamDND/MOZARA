import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Counters {
  water: number;
  effector: number;
}

interface MissionState {
  morningBooster: boolean;
  nightBooster: boolean;
  massage: boolean;
  omega3: boolean;
  vitaminD: boolean;
  vitaminE: boolean;
  protein: boolean;
  iron: boolean;
  biotin: boolean;
  zinc: boolean;
  nightWash: boolean;
  dryHair: boolean;
  brushHair: boolean;
  scalpScrub: boolean;
  earlySleep: boolean;
  scalpPack: boolean;
}

interface BadHabitsState {
  smoking: boolean;
  drinking: boolean;
  stress: boolean;
  lateSleep: boolean;
  junkFood: boolean;
  hotShower: boolean;
  tightHair: boolean;
  scratching: boolean;
}

interface GameState {
  level: number;
  currentExp: number;
  maxExp: number;
  totalPoints: number;
  streak: number;
  lastPlayDate: string;
  plantStage: string;
}

const HairPT: React.FC = () => {
  const [counters, setCounters] = useState<Counters>({
    water: 0,
    effector: 0
  });
  const [missionState, setMissionState] = useState<MissionState>({
    morningBooster: false,
    nightBooster: false,
    massage: false,
    omega3: false,
    vitaminD: false,
    vitaminE: false,
    protein: false,
    iron: false,
    biotin: false,
    zinc: false,
    nightWash: false,
    dryHair: false,
    brushHair: false,
    scalpScrub: false,
    earlySleep: false,
    scalpPack: false
  });
  const [badHabitsState, setBadHabitsState] = useState<BadHabitsState>({
    smoking: false,
    drinking: false,
    stress: false,
    lateSleep: false,
    junkFood: false,
    hotShower: false,
    tightHair: false,
    scratching: false
  });
  const [activeTab, setActiveTab] = useState('routine');
  const [lastResetDate, setLastResetDate] = useState<string>('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [scalpPhotos, setScalpPhotos] = useState<string[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    currentExp: 0,
    maxExp: 100,
    totalPoints: 0,
    streak: 0,
    lastPlayDate: new Date().toDateString(),
    plantStage: 'seed'
  });
  const [statusMessage] = useState('오늘의 건강한 습관을 실천하고 새싹을 키워보세요!');
  const [plantTitle, setPlantTitle] = useState<string>('새싹 키우기');
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementData, setAchievementData] = useState({ icon: '', title: '', description: '' });
  const [showSidebar, setShowSidebar] = useState(false);

  const plantStages = {
    1: { emoji: '🌱', name: '새싹' },
    2: { emoji: '🌿', name: '어린 나무' },
    3: { emoji: '🌳', name: '나무' },
    4: { emoji: '🍎', name: '열매 나무' }
  };

  // 게임 상태 저장
  const saveGameState = (newState: GameState) => {
    localStorage.setItem('hairHealthGame', JSON.stringify(newState));
  };

  // 게임 상태 로드
  const loadGameState = () => {
    const saved = localStorage.getItem('hairHealthGame');
    if (saved) {
      const savedState = JSON.parse(saved);
      
      // 날짜 체크 - 새로운 날이면 연속일 체크
      const today = new Date().toDateString();
      if (savedState.lastPlayDate !== today) {
        const lastDate = new Date(savedState.lastPlayDate);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          savedState.streak++;
        } else if (diffDays > 1) {
          savedState.streak = 0;
        }
        
        savedState.lastPlayDate = today;
      }
      
      setGameState(savedState);
    }
  };

  // 일일 리셋 함수
  const resetDailyMissions = useCallback(() => {
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
      setCounters({ water: 0, effector: 0 });
      setMissionState({
        morningBooster: false,
        nightBooster: false,
        massage: false,
        omega3: false,
        vitaminD: false,
        vitaminE: false,
        protein: false,
        iron: false,
        biotin: false,
        zinc: false,
        nightWash: false,
        dryHair: false,
        brushHair: false,
        scalpScrub: false,
        earlySleep: false,
        scalpPack: false
      });
      setBadHabitsState({
        smoking: false,
        drinking: false,
        stress: false,
        lateSleep: false,
        junkFood: false,
        hotShower: false,
        tightHair: false,
        scratching: false
      });
      setLastResetDate(today);
    }
  }, [lastResetDate]);

  // 컴포넌트 마운트 시 리셋 확인
  useEffect(() => {
    resetDailyMissions();
    loadGameState();
    const savedTitle = localStorage.getItem('plantTitle');
    if (savedTitle) setPlantTitle(savedTitle);
  }, [resetDailyMissions]);

  const startEditTitle = () => {
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const saveTitle = () => {
    localStorage.setItem('plantTitle', plantTitle);
    setIsEditingTitle(false);
    setToast({ visible: true, message: '제목이 저장되었습니다.' });
    setTimeout(() => setToast({ visible: false, message: '' }), 1800);
  };

  // 이번 주(일요일~토요일) 날짜 데이터 생성
  const generateDateData = () => {
    const today = new Date();
    const dates: any[] = [];
    const startOfWeek = new Date(today);
    // 일요일부터 시작 (0: 일요일)
    startOfWeek.setDate(today.getDate() - today.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      dates.push({
        date: date.getDate(),
        day: date.toLocaleDateString('ko-KR', { weekday: 'short' }),
        fullDate: date,
        isToday: date.toDateString() === today.toDateString()
      });
    }

    return dates;
  };

  const dateData = generateDateData();

  // 진행률 계산 함수
  const calculateProgress = () => {
    const totalMissions = 18; // 총 미션 수 (2개 카운터 + 16개 체크박스)
    let completedMissions = 0;

    // 카운터 미션 (물 7잔, 이펙터 4번)
    if (counters.water >= 7) completedMissions++;
    if (counters.effector >= 4) completedMissions++;

    // 체크박스 미션들
    Object.values(missionState).forEach(completed => {
      if (completed) completedMissions++;
    });

    return Math.round((completedMissions / totalMissions) * 100);
  };

  const progressPercentage = calculateProgress();

  const updateCounterDisplay = (id: keyof Counters) => {
    return counters[id];
  };

  const toggleMission = (missionKey: keyof MissionState) => {
    setMissionState(prev => ({
      ...prev,
      [missionKey]: !prev[missionKey]
    }));
    
    // 미션 완료 시 경험치 추가
    if (!missionState[missionKey]) {
      addExp(10); // 미션 완료 시 10 경험치
    }
  };

  // 경험치 추가 함수
  const addExp = (points: number) => {
    const newState = {
      ...gameState,
      currentExp: gameState.currentExp + points,
      totalPoints: gameState.totalPoints + points
    };

    // 레벨업 체크
    if (newState.currentExp >= newState.maxExp) {
      if (newState.level < 4) {
        newState.level++;
        newState.currentExp = newState.currentExp - newState.maxExp;
        newState.maxExp = newState.level * 100;
        
        const plant = plantStages[newState.level as keyof typeof plantStages];
        showAchievementPopup(plant.emoji, `레벨업! ${plant.name}`, `축하합니다! ${plant.name} 단계에 도달했습니다!`);
      } else {
        newState.currentExp = newState.maxExp;
      }
    }
    
    setGameState(newState);
    saveGameState(newState);
  };

  // 업적 팝업 표시
  const showAchievementPopup = (icon: string, title: string, description: string) => {
    setAchievementData({ icon, title, description });
    setShowAchievement(true);
  };

  // 안좋은 습관 토글 함수
  const toggleBadHabit = (habitKey: keyof BadHabitsState) => {
    setBadHabitsState(prev => ({
      ...prev,
      [habitKey]: !prev[habitKey]
    }));
    
    // 안좋은 습관 체크 시 경험치 감소
    if (!badHabitsState[habitKey]) {
      addExp(-5); // 안좋은 습관 체크 시 -5 경험치
    }
  };

  // 두피 사진 촬영 함수
  const takeScalpPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // 후면 카메라 사용
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const photoUrl = event.target?.result as string;
          const today = new Date().toLocaleDateString();
          const photoWithDate = `${photoUrl}|${today}`;
          setScalpPhotos(prev => [...prev, photoWithDate]);
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  // 미션 버튼 스타일과 클릭 핸들러를 반환하는 함수
  const getMissionButtonProps = (missionKey: keyof MissionState, defaultText: string = '미션 완료') => {
    const isCompleted = missionState[missionKey];
    return {
      className: `w-full py-3 md:py-4 rounded-full font-bold transition-colors ${
        isCompleted 
          ? 'bg-green-500 text-white cursor-not-allowed' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      }`,
      onClick: () => !isCompleted && toggleMission(missionKey),
      disabled: isCompleted,
      children: isCompleted ? '완료됨' : defaultText
    };
  };

  const incrementCounter = (id: keyof Counters) => {
    setCounters(prev => {
      const newValue = prev[id] + 1;
      // 물 7잔, 이펙터 4번 제한
      if (id === 'water' && newValue > 7) return prev;
      if (id === 'effector' && newValue > 4) return prev;
      
      // 카운터 증가 시 경험치 추가
      addExp(5); // 카운터 증가 시 5 경험치
      
      return {
        ...prev,
        [id]: newValue
      };
    });
  };

  const decrementCounter = (id: keyof Counters) => {
    setCounters(prev => ({
      ...prev,
      [id]: Math.max(0, prev[id] - 1)
    }));
  };


  const showContent = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="bg-gray-100 min-h-screen p-2 md:p-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Main Content */}
        <div className="flex-1 bg-white min-h-screen flex flex-col shadow-lg rounded-2xl overflow-hidden">
        {/* Header */}
        <header className="p-4 md:p-6 pt-6 md:pt-8 bg-white">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">탈모 PT</h1>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="hidden sm:inline">진행률</span>
              <span className="text-blue-500 font-bold">{progressPercentage}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <p className="text-sm md:text-base text-center text-gray-600 mt-3">
            오늘의 미션 <span className="text-blue-500 font-bold">{progressPercentage}%</span> 완료했어요
          </p>
        </header>

        {/* Date Navigation */}
        <nav className="bg-white py-3 md:py-4 px-3 md:px-4 shadow-sm">
          <div className="flex justify-center md:justify-start gap-1 md:gap-2 lg:gap-4 text-center text-sm font-medium overflow-x-auto pb-2">
            {dateData.map((dateInfo, index) => (
              <div 
                key={index}
                className={`flex-shrink-0 px-2 py-2 rounded-lg transition-colors min-w-[50px] md:min-w-[60px] ${
                  dateInfo.isToday 
                    ? 'text-blue-500 bg-blue-100' 
                    : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <p className={`text-base md:text-lg ${dateInfo.isToday ? 'font-semibold' : ''}`}>
                  {dateInfo.date}
                </p>
                <p className="text-xs">{dateInfo.day}</p>
              </div>
            ))}
          </div>
        </nav>

        {/* Main Content Tabs */}
        <div className="flex items-center bg-white px-3 md:px-4 py-2 md:py-3 mt-2 space-x-1 md:space-x-2 lg:space-x-6 text-xs md:text-sm lg:text-base font-semibold text-gray-600 overflow-x-auto">
          <div 
            className={`flex items-center space-x-1 cursor-pointer whitespace-nowrap px-2 md:px-3 py-2 rounded-lg transition-colors ${activeTab === 'routine' ? 'text-blue-500 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => showContent('routine')}
          >
            <i className="fas fa-check-square text-green-500 text-xs md:text-sm"></i>
            <span className="hidden sm:inline">루틴</span>
          </div>
          <div 
            className={`flex items-center space-x-1 cursor-pointer whitespace-nowrap px-2 md:px-3 py-2 rounded-lg transition-colors ${activeTab === 'nutrition' ? 'text-blue-500 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => showContent('nutrition')}
          >
            <i className="fas fa-pills text-red-500 text-xs md:text-sm"></i>
            <span className="hidden sm:inline">영양</span>
          </div>
          <div 
            className={`flex items-center space-x-1 cursor-pointer whitespace-nowrap px-2 md:px-3 py-2 rounded-lg transition-colors ${activeTab === 'clean' ? 'text-blue-500 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => showContent('clean')}
          >
            <i className="fas fa-magnifying-glass text-blue-400 text-xs md:text-sm"></i>
            <span className="hidden sm:inline">청결</span>
          </div>
        </div>

        {/* Main Content (Tasks) */}
        <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {/* Routine Content */}
          {activeTab === 'routine' && (
            <>
              {/* Task Card: Drink water */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-blue-100 rounded-lg">
                      <i className="fas fa-tint text-blue-500 text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-semibold">물 7잔</h3>
                      <p className="text-xs md:text-sm text-gray-500">모발 수분 유지</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => decrementCounter('water')} 
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold hover:bg-gray-300 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-semibold text-lg md:text-xl min-w-[2rem] text-center">{updateCounterDisplay('water')}/7</span>
                    <button 
                      onClick={() => incrementCounter('water')} 
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                        counters.water >= 7 
                          ? 'bg-green-500 text-white cursor-not-allowed' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                      disabled={counters.water >= 7}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Task Card: Use effector */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-purple-100 rounded-lg">
                      <i className="fas fa-wand-magic-sparkles text-purple-500 text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-semibold">이펙터 4번 사용</h3>
                      <p className="text-xs md:text-sm text-gray-500">미션 진행 중</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => decrementCounter('effector')} 
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold hover:bg-gray-300 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-semibold text-lg md:text-xl min-w-[2rem] text-center">{updateCounterDisplay('effector')}/4</span>
                    <button 
                      onClick={() => incrementCounter('effector')} 
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                        counters.effector >= 4 
                          ? 'bg-green-500 text-white cursor-not-allowed' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                      disabled={counters.effector >= 4}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Task Card: Morning booster */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-orange-100 rounded-lg">
                    <i className="fas fa-sun text-orange-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">아침 부스터 사용</h3>
                    <p className="text-xs md:text-sm text-gray-500">탈모 에센스로 직접 개선</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('morningBooster')} />
              </div>
              
              {/* Task Card: Night booster */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-indigo-100 rounded-lg">
                    <i className="fas fa-moon text-indigo-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">밤 부스터 사용</h3>
                    <p className="text-xs md:text-sm text-gray-500">탈모 에센스로 직접 개선</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('nightBooster')} />
              </div>

              {/* Task Card: Massage */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-pink-100 rounded-lg">
                      <i className="fas fa-hand-holding-medical text-pink-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">백회혈/사신총혈 마사지</h3>
                    <p className="text-xs md:text-sm text-gray-500">상열감 감소로 탈모 예방</p>
                  </div>
                </div>
                <button 
                  className={`w-full py-3 md:py-4 rounded-full font-bold transition-colors ${
                    missionState.massage 
                      ? 'bg-green-500 text-white cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                  onClick={() => {
                    if (!missionState.massage) {
                      setShowVideoModal(true);
                      toggleMission('massage');
                    }
                  }}
                  disabled={missionState.massage}
                >
                  {missionState.massage ? '완료됨' : '시작하기'}
                </button>
              </div>

              {/* Task Card: Take scalp photo */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-purple-100 rounded-lg">
                      <i className="fas fa-camera text-purple-500 text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-semibold">두피 사진 촬영</h3>
                      <p className="text-xs md:text-sm text-gray-500">두피 상태 기록하기</p>
                    </div>
                  </div>
                </div>
                <button 
                  className="w-full py-3 md:py-4 rounded-full font-bold transition-colors bg-purple-500 hover:bg-purple-600 text-white mt-4"
                  onClick={takeScalpPhoto}
                >
                  사진 촬영하기
                </button>
              </div>
            </>
          )}

          {/* Nutrition Content */}
          {activeTab === 'nutrition' && (
            <>
              {/* Task Card: Omega-3 */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-cyan-100 rounded-lg">
                    <i className="fas fa-fish text-cyan-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">오메가-3 섭취</h3>
                    <p className="text-xs md:text-sm text-gray-500">혈액 순환 촉진 및 염증 완화</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('omega3')} />
              </div>

              {/* Task Card: Vitamin D */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-yellow-100 rounded-lg">
                    <i className="fas fa-sun text-yellow-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">비타민 D 섭취</h3>
                    <p className="text-xs md:text-sm text-gray-500">모낭 자극 및 모발 성장 촉진</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('vitaminD')} />
              </div>

              {/* Task Card: Vitamin E */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-green-100 rounded-lg">
                    <i className="fas fa-leaf text-green-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">비타민 E 섭취</h3>
                    <p className="text-xs md:text-sm text-gray-500">항산화 작용 및 건조함 완화</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('vitaminE')} />
              </div>

              {/* Task Card: Protein */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-red-100 rounded-lg">
                    <i className="fas fa-drumstick-bite text-red-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">단백질 섭취</h3>
                    <p className="text-xs md:text-sm text-gray-500">모발 구성 성분 및 성장 촉진</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('protein')} />
              </div>

              {/* Task Card: Iron */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-orange-100 rounded-lg">
                    <i className="fas fa-hammer text-orange-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">철분 섭취</h3>
                    <p className="text-xs md:text-sm text-gray-500">산소 운반 및 모발 건강 유지</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('iron')} />
              </div>

              {/* Task Card: Biotin */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-emerald-100 rounded-lg">
                    <i className="fas fa-seedling text-emerald-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">비오틴 섭취</h3>
                    <p className="text-xs md:text-sm text-gray-500">모발 성장 및 강화 촉진</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('biotin')} />
              </div>

              {/* Task Card: Zinc */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-gray-100 rounded-lg">
                    <i className="fas fa-atom text-gray-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">아연 섭취</h3>
                    <p className="text-xs md:text-sm text-gray-500">모발 성장 및 재생 촉진</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('zinc')} />
              </div>
            </>
          )}
          
          {/* Clean Content */}
          {activeTab === 'clean' && (
            <>
              {/* Task Card: Night wash hair */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-teal-100 rounded-lg">
                    <i className="fas fa-shower text-teal-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">밤에 머리 감기</h3>
                    <p className="text-xs md:text-sm text-gray-500">모공 청결 유지로 탈모 방지</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('nightWash')} />
              </div>

              {/* Task Card: Dry hair well */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-sky-100 rounded-lg">
                      <i className="fas fa-wind text-sky-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">머리 바싹 말리기</h3>
                    <p className="text-xs md:text-sm text-gray-500">모발 약화 및 냉기 방지</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('dryHair')} />
              </div>

              {/* Task Card: Massage (moved from routine) */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-pink-100 rounded-lg">
                      <i className="fas fa-hand-holding-medical text-pink-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">백회혈/사신총혈 마사지</h3>
                    <p className="text-xs md:text-sm text-gray-500">상열감 감소로 탈모 예방</p>
                  </div>
                </div>
                <button 
                  className={`w-full py-3 md:py-4 rounded-full font-bold transition-colors ${
                    missionState.massage 
                      ? 'bg-green-500 text-white cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                  onClick={() => {
                    if (!missionState.massage) {
                      setShowVideoModal(true);
                      toggleMission('massage');
                    }
                  }}
                  disabled={missionState.massage}
                >
                  {missionState.massage ? '완료됨' : '시작하기'}
                </button>
              </div>

              {/* Task Card: Brush hair before shampoo */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-amber-100 rounded-lg">
                    <i className="fas fa-brush text-amber-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">샴푸 전 머리 빗질</h3>
                    <p className="text-xs md:text-sm text-gray-500">머리 엉킴 방지 및 노폐물 제거</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('brushHair')} />
              </div>

              {/* Task Card: Scalp Nutrition Pack (moved from weekly) */}
              <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-green-100 rounded-lg">
                    <i className="fas fa-leaf text-green-500 text-lg md:text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold">두피 영양팩하기</h3>
                    <p className="text-xs md:text-sm text-gray-500">두피 영양 공급 및 보습</p>
                  </div>
                </div>
                <button {...getMissionButtonProps('scalpPack', '영양팩하기')} />
              </div>
            </>
          )}
          
          </div>
        </main>

        {/* Video Modal */}
        {showVideoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full relative">
              <button
                onClick={() => setShowVideoModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
              <h3 className="text-lg font-semibold mb-4 text-center">백회혈 마사지 방법</h3>
              <div className="aspect-video w-full">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/aj-VJeeWv9M?si=MV-GDmQvnPxG6VN3"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="rounded-lg"
                ></iframe>
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center">
                영상을 보고 마사지를 따라해보세요!
              </p>
            </div>
          </div>
        )}

        {/* Achievement Popup */}
        {showAchievement && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAchievement(false)} />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-50 text-center animate-bounce">
              <div className="text-6xl mb-4">{achievementData.icon}</div>
              <div className="text-xl font-bold text-gray-800 mb-2">{achievementData.title}</div>
              <div className="text-sm text-gray-600 mb-6">{achievementData.description}</div>
              <button
                onClick={() => setShowAchievement(false)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2 rounded-xl hover:scale-105 transition-transform"
              >
                확인
              </button>
            </div>
          </>
        )}

        </div>

        {/* Mobile Overlay */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Right Sidebar - Plant Game */}
        <div className={`fixed lg:relative top-0 right-0 h-full lg:h-auto w-80 lg:w-80 bg-white shadow-lg rounded-2xl lg:rounded-2xl overflow-hidden transition-all duration-300 z-50 lg:z-auto ${
          showSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}>
          {/* Plant Game Header */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">🌱</span>
                {isEditingTitle ? (
                  <input
                    value={plantTitle}
                    onChange={(e) => setPlantTitle(e.target.value)}
                    onBlur={saveTitle}
                    className="px-2 py-1 rounded-md text-gray-800"
                    ref={titleInputRef}
                    autoFocus
                  />
                ) : (
                  <h2 className="text-lg font-bold" onDoubleClick={startEditTitle}>{plantTitle}</h2>
                )}
                {!isEditingTitle ? (
                  <button
                    title="제목 편집"
                    onClick={startEditTitle}
                    className="ml-1 p-1 rounded-md bg-white/20 hover:bg-white/30"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                ) : (
                  <button
                    title="저장"
                    onMouseDown={(e) => { e.preventDefault(); }}
                    onClick={saveTitle}
                    className="ml-1 px-2 py-1 rounded-md bg-white text-indigo-600 font-semibold hover:bg-gray-100"
                  >
                    저장
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="lg:hidden p-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              >
                <i className="fas fa-times text-white"></i>
              </button>
            </div>
            <div className="flex items-center bg-white/20 rounded-2xl p-3">
              <span className="bg-white text-indigo-600 px-3 py-1 rounded-full text-sm font-bold">
                Lv.{gameState.level}
              </span>
              <div className="flex-1 h-2 bg-white/30 rounded-full mx-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(gameState.currentExp / gameState.maxExp) * 100}%` }}
                />
              </div>
              <span className="text-xs">{gameState.currentExp}/{gameState.maxExp}</span>
            </div>
          </div>

          {/* Plant Display */}
          <div className="bg-gradient-to-b from-sky-200 to-green-200 p-6 text-center">
            <div className="relative inline-block">
              <div className="text-6xl transition-transform duration-500 hover:scale-110 animate-bounce">
                {plantStages[gameState.level as keyof typeof plantStages].emoji}
              </div>
            </div>
            <div className="mt-3 p-2 bg-white/90 rounded-xl text-xs text-gray-700">
              {statusMessage}
            </div>
          </div>

          {/* Statistics */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-lg font-bold text-indigo-600">{gameState.streak}</div>
                <div className="text-xs text-gray-600">연속일</div>
              </div>
              <div>
                <div className="text-lg font-bold text-indigo-600">{gameState.totalPoints}</div>
                <div className="text-xs text-gray-600">포인트</div>
              </div>
              <div>
                <div className="text-lg font-bold text-indigo-600">{Math.round((Object.values(missionState).filter(v => v).length / Object.keys(missionState).length) * 100)}%</div>
                <div className="text-xs text-gray-600">달성률</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Plant Button - Mobile Only */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="fixed bottom-6 right-6 lg:hidden w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex flex-col items-center justify-center relative"
        >
          <div className="text-2xl animate-bounce">
            {plantStages[gameState.level as keyof typeof plantStages].emoji}
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
            {gameState.level}
          </div>
        </button>

        {/* Toast */}
        {toast.visible && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="px-4 py-2 bg-gray-900 text-white rounded-full shadow-lg text-sm">
              {toast.message}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default HairPT;



