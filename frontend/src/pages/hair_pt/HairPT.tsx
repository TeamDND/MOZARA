import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../../utils/store';
import { fetchSeedlingInfo, updateSeedlingNickname, setSeedling } from '../../utils/seedlingSlice';
import apiClient from '../../services/apiClient';

interface Counters {
  water: number;
  effector: number;
}

interface MissionState {
  morningBooster: boolean;
  nightBooster: boolean;
  water: boolean;
  effector: boolean;
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

// daily_habits 테이블 데이터 기반 미션 정보
interface DailyHabit {
  habitId: number;
  description: string;
  habitName: string;
  rewardPoints: number;
  category: string;
}

interface MissionInfo {
  id: number;
  name: string;
  description: string;
  category: 'routine' | 'nutrient' | 'cleanliness';
  rewardPoints: number;
  key: keyof MissionState;
  completed?: boolean;
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


const HairPT: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { seedlingId, seedlingName, currentPoint, loading: seedlingLoading, error: seedlingError } = useSelector((state: RootState) => state.seedling);
  const { username, userId } = useSelector((state: RootState) => state.user);
  
  const [counters, setCounters] = useState<Counters>({
    water: 0,
    effector: 0
  });
  const [missionState, setMissionState] = useState<MissionState>({
    morningBooster: false,
    nightBooster: false,
    water: false,
    effector: false,
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
  const [statusMessage] = useState('오늘의 건강한 습관을 실천하고 새싹을 키워보세요!');
  const [plantTitle, setPlantTitle] = useState<string>('새싹 키우기');
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [isUserTyping, setIsUserTyping] = useState<boolean>(false);
  const [originalTitle, setOriginalTitle] = useState<string>('');
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementData, setAchievementData] = useState({ icon: '', title: '', description: '' });
  const [showSidebar, setShowSidebar] = useState(false);
  const [dailyHabits, setDailyHabits] = useState<DailyHabit[]>([]);
  const [missionData, setMissionData] = useState<MissionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedlingPoints, setSeedlingPoints] = useState(0);
  const [seedlingLevel, setSeedlingLevel] = useState(1);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const plantStages = {
    1: { emoji: '🌱', name: '새싹' },
    2: { emoji: '🌿', name: '어린 나무' },
    3: { emoji: '🌳', name: '나무' },
    4: { emoji: '🍎', name: '열매 나무' }
  };


  // 일일 리셋 함수
  const resetDailyMissions = useCallback(() => {
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
      // 날짜가 바뀌었으므로 카운터만 초기화 (미션 상태는 백엔드에서 가져옴)
      setCounters({ water: 0, effector: 0 });
      setLastResetDate(today);
    }
  }, [lastResetDate]);

  // daily_habits 데이터 로드 (날짜별)
  const loadDailyHabits = async (date?: Date) => {
    if (!userId) {
      console.log('사용자 ID가 없어서 습관 데이터를 로드할 수 없습니다.');
      return;
    }

    try {
      setLoading(true);
      
      // 로드할 날짜 결정
      const targetDate = date || selectedDate;
      const dateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const isToday = targetDate.toDateString() === new Date().toDateString();
      
      // 모든 습관 데이터 가져오기
      const response = await apiClient.get('/habit/daily-habits');
      setDailyHabits(response.data);
      
      // 선택된 날짜의 완료된 습관들 가져오기
      let completedHabits = [];
      if (isToday) {
        const completedResponse = await apiClient.get(`/habit/completed/${userId}`);
        completedHabits = completedResponse.data || [];
      } else {
        const completedResponse = await apiClient.get(`/habit/completed/${userId}/date`, {
          params: { date: dateString }
        });
        completedHabits = completedResponse.data || [];
      }
      
      // DailyHabit을 MissionInfo로 변환하면서 완료 상태도 설정
      const convertedMissions: MissionInfo[] = response.data.map((habit: DailyHabit) => {
        const isCompleted = completedHabits.some((completed: any) => completed.habitId === habit.habitId);
        return {
          id: habit.habitId,
          name: habit.habitName,
          description: habit.description,
          category: habit.category.trim() as 'routine' | 'nutrient' | 'cleanliness', // 공백 제거
          rewardPoints: habit.rewardPoints,
          key: getMissionKey(habit.habitName), // 습관 이름을 기반으로 키 매핑
          completed: isCompleted // 완료 상태 추가
        };
      });
      setMissionData(convertedMissions);

      // 카운터 방식 미션들의 완료 상태에 따라 카운터 설정
      const waterMission = convertedMissions.find(m => m.name === '물 마시기');
      const effectorMission = convertedMissions.find(m => m.name === '이펙터 사용');
      
      if (waterMission?.completed) {
        setCounters(prev => ({ ...prev, water: 7 }));
      } else if (isToday) {
        setCounters(prev => ({ ...prev, water: 0 }));
      }
      
      if (effectorMission?.completed) {
        setCounters(prev => ({ ...prev, effector: 4 }));
      } else if (isToday) {
        setCounters(prev => ({ ...prev, effector: 0 }));
      }
    } catch (error) {
      console.error('습관 데이터 로드 실패:', error);
      setToast({ visible: true, message: '습관 데이터를 불러오는데 실패했습니다.' });
      setTimeout(() => setToast({ visible: false, message: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // 습관 이름을 기반으로 미션 키 매핑
  const getMissionKey = (habitName: string): keyof MissionState => {
    const keyMap: { [key: string]: keyof MissionState } = {
      '물 마시기': 'water',
      '이펙터 사용': 'effector',
      '아침 부스터 사용': 'morningBooster',
      '밤 부스터 사용': 'nightBooster',
      '백회혈/사신총혈 마사지': 'massage',
      '오메가-3 섭취': 'omega3',
      '비타민 D 섭취': 'vitaminD',
      '비타민 E 섭취': 'vitaminE',
      '단백질 섭취': 'protein',
      '철분 섭취': 'iron',
      '비오틴 섭취': 'biotin',
      '아연 섭취': 'zinc',
      '밤에 머리 감기': 'nightWash',
      '머리 바싹 말리기': 'dryHair',
      '샴푸 전 머리 빗질': 'brushHair',
      '두피 영양팩하기': 'scalpPack'
    };
    return keyMap[habitName] || 'morningBooster';
  };

  // 포인트에 따른 새싹 레벨 계산
  const calculateSeedlingLevel = (points: number): number => {
    if (points >= 200) return 4; // 열매 나무
    if (points >= 100) return 3; // 나무
    if (points >= 50) return 2;  // 어린 나무
    return 1; // 새싹
  };

  // 새싹 정보 로드 (Redux 사용)
  const loadSeedlingInfo = useCallback(async () => {
    if (!userId) {
      console.log('사용자 ID가 없습니다.');
      return;
    }

    try {
      console.log('새싹 정보 로드 시도:', userId);
      
      // 직접 API 호출로 테스트
      const response = await apiClient.get('/user/seedling/my-seedling');
      console.log('새싹 정보 API 응답:', response.data);
      
      const result = await dispatch(fetchSeedlingInfo(userId)).unwrap();
      console.log('Redux 새싹 정보:', result);
      
      if (result) {
        // 새싹 포인트 설정
        if (result.currentPoint) {
          setSeedlingPoints(result.currentPoint);
          setSeedlingLevel(calculateSeedlingLevel(result.currentPoint));
        }
        // 새싹 이름 설정 (백엔드에서 가져온 이름이 있으면 사용, 없으면 로컬 스토리지 사용)
        if (result.seedlingName) {
          setPlantTitle(result.seedlingName);
        } else {
          const savedTitle = localStorage.getItem('plantTitle');
          if (savedTitle) setPlantTitle(savedTitle);
        }
      }
    } catch (error: any) {
      console.error('새싹 정보 로드 실패:', error);
      console.error('에러 상세:', error.response?.data);
      console.error('에러 상태:', error.response?.status);
      
      // 에러 시 로컬 스토리지에서 제목 로드
      const savedTitle = localStorage.getItem('plantTitle');
      if (savedTitle) setPlantTitle(savedTitle);
    }
  }, [dispatch, userId]);

  // 컴포넌트 마운트 시 리셋 확인
  useEffect(() => {
    resetDailyMissions();
    loadDailyHabits();
    loadSeedlingInfo();
  }, [resetDailyMissions, loadSeedlingInfo]);

  // 선택된 날짜가 변경될 때마다 데이터 로드
  useEffect(() => {
    if (userId) {
      loadDailyHabits(selectedDate);
    }
  }, [selectedDate, userId]);


  const startEditTitle = () => {
    setOriginalTitle(plantTitle); // 편집 시작 시 원래 제목 저장
    setIsEditingTitle(true);
    setIsUserTyping(false); // 사용자 타이핑 상태 초기화
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 200);
  };

  const saveTitle = () => {
    localStorage.setItem('plantTitle', plantTitle);
    setIsEditingTitle(false);
    setToast({ visible: true, message: '제목이 저장되었습니다.' });
    setTimeout(() => setToast({ visible: false, message: '' }), 1800);
  };

  // 새싹 이름 변경 함수
  const handleSeedlingNameChange = async (newName: string) => {
    if (!userId) {
      console.log('사용자 ID가 없습니다.');
      setToast({ visible: true, message: '로그인이 필요합니다.' });
      setTimeout(() => setToast({ visible: false, message: '' }), 3000);
      return;
    }

    try {
      console.log('새싹 이름 변경 시도:', { userId, seedlingName: newName });
      
      // 새싹 이름 변경 API 호출
      await dispatch(updateSeedlingNickname(newName)).unwrap();
      
      // 로컬 스토리지도 업데이트
      localStorage.setItem('plantTitle', newName);
      setToast({ visible: true, message: '새싹 이름이 변경되었습니다.' });
      setTimeout(() => setToast({ visible: false, message: '' }), 1800);
    } catch (error: any) {
      console.error('새싹 이름 변경 실패:', error);
      console.error('에러 상세:', error.response?.data);
      console.error('에러 상태:', error.response?.status);
      
      setToast({ visible: true, message: '새싹 이름 변경에 실패했습니다.' });
      setTimeout(() => setToast({ visible: false, message: '' }), 3000);
    }
  };

  // 이번 주(일요일~토요일) 날짜 데이터 생성
  const generateDateData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정하여 정확한 날짜 비교
    const dates: any[] = [];
    const startOfWeek = new Date(today);
    // 일요일부터 시작 (0: 일요일)
    startOfWeek.setDate(today.getDate() - today.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      date.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정

      const isFuture = date > today;

      dates.push({
        date: date.getDate(),
        day: date.toLocaleDateString('ko-KR', { weekday: 'short' }),
        fullDate: date,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        isFuture: isFuture
      });
    }

    return dates;
  };

  const dateData = generateDateData();

  // 날짜 선택 핸들러
  const handleDateSelect = (date: Date, isFuture: boolean) => {
    // 미래 날짜는 선택 불가
    if (isFuture) {
      setToast({ visible: true, message: '미래 날짜는 선택할 수 없습니다.' });
      setTimeout(() => setToast({ visible: false, message: '' }), 2000);
      return;
    }
    setSelectedDate(date);
  };

  // 진행률 계산 함수
  const calculateProgress = () => {
    if (missionData.length === 0) return 0;
    
    let completedMissions = 0;
    const totalMissions = missionData.length;

    // 각 미션의 완료 상태 확인 (백엔드 데이터 우선)
    missionData.forEach(mission => {
      if (mission.completed !== undefined) {
        // 백엔드에서 완료 상태가 있으면 사용
        if (mission.completed) {
          completedMissions++;
        }
      } else {
        // 백엔드 데이터가 없으면 로컬 상태 사용
        if (missionState[mission.key]) {
          completedMissions++;
        }
      }
    });

    return Math.round((completedMissions / totalMissions) * 100);
  };

  const progressPercentage = calculateProgress();


  const toggleMission = async (missionKey: keyof MissionState) => {
    setMissionState(prev => ({
      ...prev,
      [missionKey]: !prev[missionKey]
    }));
    
    // 미션 완료 시 경험치 추가 및 로그 저장
    if (!missionState[missionKey]) {
      const missionInfo = missionData.find(m => m.key === missionKey);
      if (missionInfo) {
        await saveMissionLog(missionInfo.id, missionInfo.rewardPoints);
        // 미션 완료 후 습관 데이터 다시 로드하여 완료 상태 업데이트
        await loadDailyHabits();
      }
    }
  };

  // 미션 완료 로그 저장 함수 (API 연동)
  const saveMissionLog = async (habitId: number, points: number) => {
    if (!userId) {
      console.log('사용자 ID가 없습니다.');
      return;
    }

    try {
      
      const response = await apiClient.post('/habit/complete', null, {
        params: {
          userId: userId,
          habitId: habitId
        }
      });
      
      console.log('미션 완료 로그 저장 성공:', response.data);
      
      // 성공 시 토스트 메시지 및 새싹 포인트 업데이트
      const newPoints = (currentPoint || seedlingPoints) + points;
      const newLevel = calculateSeedlingLevel(newPoints);
      
      // Redux 상태 업데이트
      if (userId && seedlingId) {
        dispatch(setSeedling({
          seedlingId: seedlingId,
          seedlingName: seedlingName || plantTitle || '새싹 키우기',
          currentPoint: newPoints,
          userId: userId
        }));
      }
      
      setSeedlingPoints(newPoints);
      
      // 레벨업 체크
      if (newLevel > seedlingLevel) {
        const plant = plantStages[newLevel as keyof typeof plantStages];
        showAchievementPopup(plant.emoji, `레벨업! ${plant.name}`, `축하합니다! ${plant.name} 단계에 도달했습니다!`);
        setSeedlingLevel(newLevel);
      }
      
      setToast({ 
        visible: true, 
        message: `+${points} 포인트 획득! 새싹이 성장했어요 🌱` 
      });
      setTimeout(() => setToast({ visible: false, message: '' }), 3000);
      
    } catch (error) {
      console.error('미션 완료 로그 저장 실패:', error);
      
      // 실패 시에도 로컬에 임시 저장
      const logData = {
        habitId,
        points,
        completionDate: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      };
      
      const existingLogs = JSON.parse(localStorage.getItem('missionLogs') || '[]');
      existingLogs.push(logData);
      localStorage.setItem('missionLogs', JSON.stringify(existingLogs));
      
      setToast({ 
        visible: true, 
        message: '미션 완료! (오프라인 모드)' 
      });
      setTimeout(() => setToast({ visible: false, message: '' }), 3000);
    }
  };


  // 업적 팝업 표시
  const showAchievementPopup = (icon: string, title: string, description: string) => {
    setAchievementData({ icon, title, description });
    setShowAchievement(true);
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


  // 카테고리별 미션 필터링 함수
  const getMissionsByCategory = (category: 'routine' | 'nutrient' | 'cleanliness') => {
    const filteredMissions = missionData.filter(mission => mission.category === category);
    
    // 중복된 미션 제거 (물마시기와 이펙터 사용은 각각 하나씩만 표시)
    const uniqueMissions = filteredMissions.filter((mission, index, array) => {
      if (mission.name === '물 마시기' || mission.name === '이펙터 사용') {
        // 같은 이름의 첫 번째 미션만 유지
        return array.findIndex(m => m.name === mission.name) === index;
      }
      return true;
    });
    
    return uniqueMissions;
  };

  const incrementCounter = async (id: keyof Counters) => {
    setCounters(prev => {
      const newValue = prev[id] + 1;
      // 물 7잔, 이펙터 4번 제한
      if (id === 'water' && newValue > 7) return prev;
      if (id === 'effector' && newValue > 4) return prev;
      
      // 카운터 완료 시 로그 저장 (물 7잔, 이펙터 4번 완료 시)
      if ((id === 'water' && newValue === 7) || (id === 'effector' && newValue === 4)) {
        const missionInfo = missionData.find(m => 
          (id === 'water' && m.name === '물 마시기') || 
          (id === 'effector' && m.name === '이펙터 사용')
        );
        if (missionInfo) {
          saveMissionLog(missionInfo.id, missionInfo.rewardPoints).then(() => {
            // 미션 완료 후 습관 데이터 다시 로드하여 완료 상태 업데이트
            loadDailyHabits();
          });
        }
      }
      
      return {
        ...prev,
        [id]: newValue
      };
    });
  };



  const showContent = (tabId: string) => {
    setActiveTab(tabId);
  };

  // 미션별 아이콘과 색상 반환 함수
  const getMissionIcon = (missionName: string) => {
    const iconMap: { [key: string]: { icon: string; bgColor: string; textColor: string } } = {
      '물 마시기': { icon: 'fas fa-tint', bgColor: 'bg-gray-100', textColor: 'text-gray-500' },
      '이펙터 사용': { icon: 'fas fa-wand-magic-sparkles', bgColor: 'bg-purple-100', textColor: 'text-purple-500' },
      '아침 부스터 사용': { icon: 'fas fa-sun', bgColor: 'bg-yellow-100', textColor: 'text-yellow-500' },
      '밤 부스터 사용': { icon: 'fas fa-moon', bgColor: 'bg-indigo-100', textColor: 'text-indigo-500' },
      '백회혈/사신총혈 마사지': { icon: 'fas fa-hand-holding-medical', bgColor: 'bg-pink-100', textColor: 'text-pink-500' },
      '오메가-3 섭취': { icon: 'fas fa-fish', bgColor: 'bg-blue-100', textColor: 'text-blue-500' },
      '비타민 D 섭취': { icon: 'fas fa-sun', bgColor: 'bg-yellow-100', textColor: 'text-yellow-500' },
      '비타민 E 섭취': { icon: 'fas fa-leaf', bgColor: 'bg-green-100', textColor: 'text-green-500' },
      '단백질 섭취': { icon: 'fas fa-drumstick-bite', bgColor: 'bg-red-100', textColor: 'text-red-500' },
      '철분 섭취': { icon: 'fas fa-apple-alt', bgColor: 'bg-red-100', textColor: 'text-red-500' },
      '비오틴 섭취': { icon: 'fas fa-pills', bgColor: 'bg-purple-100', textColor: 'text-purple-500' },
      '아연 섭취': { icon: 'fas fa-capsules', bgColor: 'bg-orange-100', textColor: 'text-orange-500' },
      '밤에 머리 감기': { icon: 'fas fa-shower', bgColor: 'bg-sky-100', textColor: 'text-sky-500' },
      '머리 바싹 말리기': { icon: 'fas fa-wind', bgColor: 'bg-sky-100', textColor: 'text-sky-500' },
      '샴푸 전 머리 빗질': { icon: 'fas fa-broom', bgColor: 'bg-yellow-100', textColor: 'text-yellow-500' },
      '두피 영양팩하기': { icon: 'fas fa-spa', bgColor: 'bg-green-100', textColor: 'text-green-500' }
    };
    return iconMap[missionName] || { icon: 'fas fa-check', bgColor: 'bg-blue-100', textColor: 'text-blue-500' };
  };

  // 미션 카드 렌더링 함수 (MainContent 스타일)
  const renderMissionCard = (mission: MissionInfo) => {
    // 백엔드에서 가져온 완료 상태를 우선 사용, 없으면 로컬 상태 사용
    const isCompleted = mission.completed !== undefined ? mission.completed : missionState[mission.key];
    const missionIcon = getMissionIcon(mission.name);
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const isPastDate = selectedDate < new Date() && !isToday;
    
    // 물마시기와 이펙터 사용은 카운터 방식으로 처리
    if (mission.key === 'water' || mission.key === 'effector') {
      const currentCount = counters[mission.key];
      const targetCount = mission.key === 'water' ? 7 : 4; // 물마시기 7잔, 이펙터 4회
      const isCounterCompleted = currentCount >= targetCount;
      
      return (
        <div key={mission.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
          {/* 헤더 영역: 좌측 정보 / 우측 완료 배지 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 flex items-center justify-center ${missionIcon.bgColor} rounded-lg`}>
                <i className={`${missionIcon.icon} ${missionIcon.textColor} text-lg`}></i>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">{mission.name}</h3>
                <p className="text-sm text-gray-500">{mission.description}</p>
                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                  +{mission.rewardPoints} 포인트
                </span>
              </div>
            </div>
            {isCounterCompleted && (
              <span className="px-3 py-1.5 rounded-lg font-bold bg-green-500 text-white whitespace-nowrap text-sm">미션완료</span>
            )}
          </div>
          
          {/* 진행률 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">진행률</span>
              <span className="text-sm font-medium text-gray-800">{currentCount}/{targetCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((currentCount / targetCount) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* 하단 조작 버튼 (완료 전에는 카운터, 완료 시 버튼 없음, 과거 날짜는 비활성화) */}
          {!isCounterCompleted && isToday && (
            <div className="flex gap-3 justify-end">
              <button 
                className="w-12 h-12 rounded-xl font-bold bg-gray-400 hover:bg-gray-500 text-white transition-colors flex items-center justify-center active:scale-[0.95]"
                onClick={() => {
                  const currentCount = counters[mission.key as keyof Counters];
                  if (currentCount > 0) {
                    setCounters(prev => ({
                      ...prev,
                      [mission.key as keyof Counters]: currentCount - 1
                    }));
                  }
                }}
                disabled={counters[mission.key as keyof Counters] <= 0}
              >
                -1
              </button>
              <button 
                className="w-12 h-12 rounded-xl font-bold bg-[#1F0101] hover:bg-[#2A0202] text-white transition-colors flex items-center justify-center active:scale-[0.95]"
                onClick={() => incrementCounter(mission.key as keyof Counters)}
              >
                +1
              </button>
            </div>
          )}
          {isPastDate && !isCounterCompleted && (
            <div className="text-center text-xs text-gray-400 mt-2">
              📜 과거 기록 조회 모드
            </div>
          )}
        </div>
      );
    }
    
    // 일반 미션들 (MainContent 스타일)
    return (
      <div key={mission.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
        {/* 헤더: 좌측 정보 / 우측 컨트롤(완료 배지 또는 시작 버튼) */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 flex items-center justify-center ${missionIcon.bgColor} rounded-lg`}>
              <i className={`${missionIcon.icon} ${missionIcon.textColor} text-lg`}></i>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">{mission.name}</h3>
              <p className="text-sm text-gray-500">{mission.description}</p>
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                +{mission.rewardPoints} 포인트
              </span>
            </div>
          </div>
          {isCompleted ? (
            <span className="px-3 py-1.5 rounded-lg font-bold bg-green-500 text-white whitespace-nowrap text-sm">완료됨</span>
          ) : isToday ? (
            <button 
              className="px-3 py-1.5 rounded-lg font-bold bg-[#1F0101] hover:bg-[#2A0202] text-white active:scale-[0.98] whitespace-nowrap text-sm"
              onClick={() => !isCompleted && toggleMission(mission.key)}
            >
              미션 시작
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg font-bold bg-gray-300 text-gray-500 whitespace-nowrap text-sm">미완료</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Container - PC에서도 모바일 레이아웃 중앙 정렬 */}
      <div className="max-w-md mx-auto min-h-screen bg-white">
        
        {/* Main Content */}
        <main className="px-4 py-6">
          {/* Page Title */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">탈모 PT</h2>
            <p className="text-sm text-gray-600">새싹을 키우며 탈모 개선 습관을 만들어보세요</p>
          </div>

          {/* Plant Display Card */}
          <div className="bg-gradient-to-br from-[#1F0101] to-[#2A0202] rounded-xl p-6 mb-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-lg">🌱</span>
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={plantTitle}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setPlantTitle(newName);
                        setIsUserTyping(true);
                        if (userId && seedlingId) {
                          dispatch(setSeedling({
                            seedlingId: seedlingId,
                            seedlingName: newName,
                            currentPoint: currentPoint || seedlingPoints || 0,
                            userId: userId
                          }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && isUserTyping) {
                          const finalName = plantTitle.trim() || '새싹 키우기';
                          setPlantTitle(finalName);
                          if (originalTitle !== finalName) {
                            handleSeedlingNameChange(finalName);
                          }
                          setIsEditingTitle(false);
                        }
                      }}
                      placeholder="새싹 이름"
                      className="px-2 py-1 rounded-md text-sm text-gray-800 flex-1"
                      ref={titleInputRef}
                    />
                    <button
                      onMouseDown={(e) => { e.preventDefault(); }}
                      onClick={() => {
                        const finalName = plantTitle.trim() || '새싹 키우기';
                        setPlantTitle(finalName);
                        if (originalTitle !== finalName) {
                          handleSeedlingNameChange(finalName);
                        }
                        setIsEditingTitle(false);
                      }}
                      disabled={seedlingLoading}
                      className="px-2 py-1 rounded-md bg-white text-[#1F0101] text-xs font-semibold hover:bg-gray-100"
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-bold text-white">{seedlingName || plantTitle || '새싹 키우기'}</h3>
                    <button
                      onClick={startEditTitle}
                      disabled={seedlingLoading}
                      className="p-1 rounded-md bg-white/20 hover:bg-white/30 disabled:opacity-50"
                    >
                      <i className="fas fa-pen text-white text-xs"></i>
                    </button>
                  </>
                )}
              </div>
              <button
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                onMouseEnter={() => setShowInfoModal(true)}
                onMouseLeave={() => setShowInfoModal(false)}
              >
                <i className="fas fa-question text-white text-xs"></i>
              </button>
            </div>
            
            <div className="text-center mb-4">
              <div className="text-6xl mb-3 transition-transform duration-500 hover:scale-110">
                {plantStages[seedlingLevel as keyof typeof plantStages].emoji}
              </div>
              <div className="bg-white/90 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-700">{statusMessage}</p>
              </div>
            </div>
            
            <div className="flex items-center bg-white/20 rounded-full p-2">
              <span className="bg-white text-[#1F0101] px-2 py-1 rounded-full text-xs font-bold">
                Lv.{seedlingLevel}
              </span>
              <div className="flex-1 h-2 bg-white/30 rounded-full mx-2">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
                  style={{ width: `${((currentPoint || seedlingPoints) % 50) * 2}%` }}
                />
              </div>
              <span className="text-xs text-white">{(currentPoint || seedlingPoints) % 50}/50</span>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-gray-600 mb-1">새싹 포인트</div>
                  <div className="text-lg font-bold text-[#1F0101]">{currentPoint || seedlingPoints}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">오늘의 진행률</div>
                  <div className="text-lg font-bold text-[#1F0101]">{progressPercentage}%</div>
                </div>
              </div>
              <button 
                className="px-3 py-2 bg-[#1F0101] hover:bg-[#2A0202] text-white rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
                onClick={() => navigate('/point-exchange')}
              >
                포인트 교환
              </button>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#1F0101] h-2 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Date Selector Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between gap-1 overflow-x-auto">
              {dateData.map((dateInfo, index) => (
                <div 
                  key={index}
                  onClick={() => handleDateSelect(dateInfo.fullDate, dateInfo.isFuture)}
                  className={`flex-shrink-0 px-2 py-2 rounded-lg transition-all text-center min-w-[48px] ${
                    dateInfo.isFuture
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50'
                      : dateInfo.isSelected 
                        ? 'bg-[#1F0101] text-white shadow-md cursor-pointer' 
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  <p className="text-sm font-semibold">{dateInfo.date}</p>
                  <p className="text-xs">{dateInfo.day}</p>
                  {dateInfo.isFuture && (
                    <div className="text-[8px] text-gray-300 mt-0.5">🔒</div>
                  )}
                </div>
              ))}
            </div>
            {selectedDate.toDateString() !== new Date().toDateString() && !dateData.find((d: any) => d.isSelected)?.isFuture && (
              <div className="mt-2 text-center text-xs text-gray-500">
                📅 {selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기록 조회 중
              </div>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-4">
            <button 
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ${
                activeTab === 'routine' 
                  ? 'bg-[#1F0101] text-white shadow-md' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => showContent('routine')}
            >
              <i className={`fas fa-check-square text-sm ${activeTab === 'routine' ? 'text-white' : 'text-green-500'}`}></i>
              <span>루틴</span>
            </button>
            <button 
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ${
                activeTab === 'nutrition' 
                  ? 'bg-[#1F0101] text-white shadow-md' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => showContent('nutrition')}
            >
              <i className={`fas fa-pills text-sm ${activeTab === 'nutrition' ? 'text-white' : 'text-red-500'}`}></i>
              <span>영양</span>
            </button>
            <button 
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ${
                activeTab === 'clean' 
                  ? 'bg-[#1F0101] text-white shadow-md' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => showContent('clean')}
            >
              <i className={`fas fa-magnifying-glass text-sm ${activeTab === 'clean' ? 'text-white' : 'text-blue-400'}`}></i>
              <span>청결</span>
            </button>
          </div>

          {/* Mission List */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F0101] mx-auto mb-4"></div>
                  <p className="text-gray-600">습관 데이터를 불러오는 중...</p>
                </div>
              </div>
            ) : (
              <>
              {/* Routine Content */}
              {activeTab === 'routine' && (
                <>
                  {/* 데이터 기반 미션 카드들 */}
                  {getMissionsByCategory('routine').map(mission => renderMissionCard(mission))}

                  {/* 두피 사진 촬영 (특별 기능) */}
                  <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-14 h-14 flex items-center justify-center bg-purple-100 rounded-lg">
                        <i className="fas fa-camera text-purple-500 text-lg"></i>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold">두피 사진 촬영</h3>
                        <p className="text-sm text-gray-500">두피 상태 기록하기</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      {selectedDate.toDateString() === new Date().toDateString() ? (
                        <button 
                          className="px-4 py-2 rounded-xl font-bold transition-colors bg-gray-200 hover:bg-gray-300 text-[#1F0101] active:scale-[0.98]"
                          onClick={takeScalpPhoto}
                        >
                          사진 촬영하기
                        </button>
                      ) : (
                        <button 
                          className="px-4 py-2 rounded-xl font-bold bg-gray-100 text-gray-400 cursor-not-allowed"
                          disabled
                        >
                          오늘만 촬영 가능
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Nutrition Content */}
              {activeTab === 'nutrition' && (
                <>
                  {getMissionsByCategory('nutrient').map(mission => renderMissionCard(mission))}
                </>
              )}
              
              {/* Clean Content */}
              {activeTab === 'clean' && (
                <>
                  {/* 데이터 기반 미션 카드들 */}
                  {getMissionsByCategory('cleanliness').map(mission => {
                    // 백회혈 마사지는 특별한 기능(비디오 모달)이 있으므로 별도 처리
                    if (mission.name === '백회혈/사신총혈 마사지') {
                      const isCompleted = missionState[mission.key];
                      const missionIcon = getMissionIcon(mission.name);
                      const isToday = selectedDate.toDateString() === new Date().toDateString();
                      
                      return (
                        <div key={mission.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className={`w-14 h-14 flex items-center justify-center ${missionIcon.bgColor} rounded-lg`}>
                              <i className={`${missionIcon.icon} ${missionIcon.textColor} text-lg`}></i>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold">{mission.name}</h3>
                              <p className="text-sm text-gray-500">{mission.description}</p>
                              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                                +{mission.rewardPoints} 포인트
                              </span>
                            </div>
                          </div>
                          {/* 우측 상단 동일 위치 컨트롤 */}
                          <div className="flex justify-end">
                            {isCompleted ? (
                              <span className="px-3 py-1.5 rounded-lg font-bold bg-green-500 text-white whitespace-nowrap text-sm">완료됨</span>
                            ) : isToday ? (
                              <button 
                                className="px-3 py-1.5 rounded-lg font-bold bg-[#1F0101] hover:bg-[#2A0202] text-white active:scale-[0.98] whitespace-nowrap text-sm"
                                onClick={() => {
                                  if (!isCompleted) {
                                    setShowVideoModal(true);
                                    toggleMission(mission.key);
                                  }
                                }}
                              >
                                시작하기
                              </button>
                            ) : (
                              <span className="px-3 py-1.5 rounded-lg font-bold bg-gray-300 text-gray-500 whitespace-nowrap text-sm">미완료</span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // 일반 미션들은 renderMissionCard 함수 사용
                    return renderMissionCard(mission);
                  })}
                </>
              )}
              </>
            )}
          </div>
          
          {/* Bottom Spacing for Mobile Navigation */}
          <div className="h-20"></div>
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
                className="bg-gray-200 text-[#1F0101] px-6 py-2 rounded-xl hover:bg-gray-300 transition-colors"
              >
                확인
              </button>
            </div>
          </>
        )}

        {/* Info Modal */}
        {showInfoModal && (
          <div className="fixed top-20 left-4 right-4 z-50">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 max-w-sm mx-auto">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-info-circle text-blue-500 text-sm"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">탈모 PT란?</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    개인 맞춤형 탈모 예방 및 개선을 위한 체계적인 관리 프로그램입니다. 
                    루틴, 영양, 청결 세 가지 영역의 습관을 통해 건강한 모발을 기를 수 있어요.
                  </p>
                  <div className="border-t border-gray-100 pt-3">
                    <h4 className="font-medium text-gray-800 mb-2">포인트 사용처</h4>
                    <p className="text-sm text-gray-600">
                      새싹을 전부 키우면 상품을 드립니다!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast.visible && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="px-4 py-2 bg-gray-900 text-white rounded-full shadow-lg text-sm">
              {toast.message}
            </div>
          </div>
        )}

        {/* Error Toast */}
        {seedlingError && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="px-4 py-2 bg-red-600 text-white rounded-full shadow-lg text-sm">
              {seedlingError}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default HairPT;



