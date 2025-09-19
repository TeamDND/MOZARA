import React, { useState, useEffect } from 'react';

interface GameState {
  level: number;
  currentExp: number;
  maxExp: number;
  totalPoints: number;
  streak: number;
  lastPlayDate: string;
  todayHabits: { [key: string]: boolean };
  plantStage: string;
}

interface Habit {
  id: string;
  name: string;
  icon: string;
  points: number;
}

const PlantStageGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    currentExp: 0,
    maxExp: 100,
    totalPoints: 0,
    streak: 0,
    lastPlayDate: new Date().toDateString(),
    todayHabits: {},
    plantStage: 'seed'
  });

  const [statusMessage, setStatusMessage] = useState('오늘의 건강한 습관을 실천하고 새싹을 키워보세요!');
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementData, setAchievementData] = useState({ icon: '', title: '', description: '' });

  const habits: Habit[] = [
    { id: 'water', name: '물 8잔 마시기', icon: '💧', points: 15 },
    { id: 'sleep', name: '충분한 수면 (7시간)', icon: '😴', points: 20 },
    { id: 'protein', name: '단백질 섭취', icon: '🥚', points: 15 },
    { id: 'scalp', name: '두피 마사지', icon: '💆', points: 20 },
    { id: 'exercise', name: '운동 30분', icon: '🏃', points: 20 },
    { id: 'stress', name: '스트레스 관리', icon: '🧘', points: 10 }
  ];

  const plantStages = {
    1: { emoji: '🌱', name: '새싹' },
    2: { emoji: '🌿', name: '어린 나무' },
    3: { emoji: '🌳', name: '나무' },
    4: { emoji: '🍎', name: '열매 나무' }
  };

  // 로컬 스토리지에서 게임 상태 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('hairHealthGame');
    if (saved) {
      const savedState = JSON.parse(saved);
      
      // 날짜 체크 - 새로운 날이면 습관 초기화
      const today = new Date().toDateString();
      if (savedState.lastPlayDate !== today) {
        // 연속 실천일 체크
        const lastDate = new Date(savedState.lastPlayDate);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          savedState.streak++;
        } else if (diffDays > 1) {
          savedState.streak = 0;
        }
        
        savedState.todayHabits = {};
        savedState.lastPlayDate = today;
      }
      
      setGameState(savedState);
    }
    updateStatusMessage();
  }, []);

  // 게임 상태 저장
  const saveGameState = (newState: GameState) => {
    localStorage.setItem('hairHealthGame', JSON.stringify(newState));
  };

  // 상태 메시지 업데이트
  const updateStatusMessage = () => {
    const completedCount = Object.values(gameState.todayHabits).filter(v => v).length;
    
    if (completedCount === 0) {
      setStatusMessage('오늘의 건강한 습관을 실천하고 새싹을 키워보세요!');
    } else if (completedCount < habits.length) {
      setStatusMessage(`잘하고 있어요! ${completedCount}/${habits.length} 습관 완료`);
    } else {
      setStatusMessage('완벽해요! 오늘의 모든 습관을 달성했습니다! 🎉');
    }
  };

  // 습관 완료 처리
  const completeHabit = (habit: Habit) => {
    if (gameState.todayHabits[habit.id]) {
      setStatusMessage('이미 완료한 습관입니다!');
      return;
    }
    
    const newState = {
      ...gameState,
      todayHabits: { ...gameState.todayHabits, [habit.id]: true },
      currentExp: gameState.currentExp + habit.points,
      totalPoints: gameState.totalPoints + habit.points
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
    
    // 모든 습관 완료 체크
    const completedCount = Object.values(newState.todayHabits).filter(v => v).length;
    if (completedCount === habits.length) {
      setTimeout(() => {
        showAchievementPopup('🎉', '완벽한 하루!', '오늘의 모든 습관을 달성했습니다!');
      }, 500);
    }
    
    updateStatusMessage();
  };

  // 업적 팝업 표시
  const showAchievementPopup = (icon: string, title: string, description: string) => {
    setAchievementData({ icon, title, description });
    setShowAchievement(true);
  };

  // 식물과 상호작용
  const interactWithPlant = () => {
    const messages = [
      '건강한 습관으로 나무를 키워보세요!',
      '오늘도 화이팅! 💪',
      '작은 습관이 큰 변화를 만듭니다!',
      '꾸준함이 최고의 비결이에요!',
      '당신의 노력이 빛나고 있어요! ✨'
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setStatusMessage(randomMessage);
  };

  // 게임 초기화
  const resetGame = () => {
    if (window.confirm('정말로 초기화하시겠습니까? 모든 진행 상황이 사라집니다.')) {
      const newState: GameState = {
        level: 1,
        currentExp: 0,
        maxExp: 100,
        totalPoints: 0,
        streak: 0,
        lastPlayDate: new Date().toDateString(),
        todayHabits: {},
        plantStage: 'seed'
      };
      setGameState(newState);
      saveGameState(newState);
      setStatusMessage('게임이 초기화되었습니다!');
    }
  };

  const expPercentage = (gameState.currentExp / gameState.maxExp) * 100;
  const plant = plantStages[gameState.level as keyof typeof plantStages];
  const completedCount = Object.values(gameState.todayHabits).filter(v => v).length;
  const completionRate = Math.round((completedCount / habits.length) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-full">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 relative">
        <button 
          onClick={resetGame}
          className="absolute top-2 right-2 bg-white/30 hover:bg-white/50 text-white px-2 py-1 rounded-lg text-xs transition-colors"
        >
          초기화
        </button>
        <h1 className="text-lg font-bold mb-3">🌱 새싹 키우기</h1>
        <div className="flex items-center bg-white/20 rounded-2xl p-3">
          <span className="bg-white text-indigo-600 px-3 py-1 rounded-full text-sm font-bold">
            Lv.{gameState.level}
          </span>
          <div className="flex-1 h-2 bg-white/30 rounded-full mx-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${expPercentage}%` }}
            />
          </div>
          <span className="text-xs">{gameState.currentExp}/{gameState.maxExp}</span>
        </div>
      </div>

      {/* 식물 단계 */}
      <div 
        className="bg-gradient-to-b from-sky-200 to-green-200 p-6 text-center cursor-pointer"
        onClick={interactWithPlant}
      >
        <div className="relative inline-block">
          <div className="text-6xl transition-transform duration-500 hover:scale-110 animate-bounce">
            {plant.emoji}
          </div>
        </div>
        <div className="mt-3 p-2 bg-white/90 rounded-xl text-xs text-gray-700">
          {statusMessage}
        </div>
      </div>

      {/* 습관 목록 */}
      <div className="p-4 bg-gray-50">
        <h2 className="text-sm font-semibold text-center mb-3 text-gray-800">
          오늘의 습관
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {habits.map(habit => (
            <div
              key={habit.id}
              onClick={() => completeHabit(habit)}
              className={`
                relative p-3 bg-white rounded-lg text-center cursor-pointer transition-all duration-300
                hover:transform hover:-translate-y-1 hover:shadow-lg border-2
                ${gameState.todayHabits[habit.id] 
                  ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100' 
                  : 'border-transparent hover:border-blue-200'
                }
              `}
            >
              <div className="text-xl mb-1">{habit.icon}</div>
              <div className="text-xs font-medium text-gray-700 mb-1 leading-tight">{habit.name}</div>
              <div className="text-xs text-gray-500">+{habit.points}</div>
              {gameState.todayHabits[habit.id] && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs animate-pulse">
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 통계 */}
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
            <div className="text-lg font-bold text-indigo-600">{completionRate}%</div>
            <div className="text-xs text-gray-600">달성률</div>
          </div>
        </div>
      </div>

      {/* 업적 팝업 */}
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
  );
};

export default PlantStageGame;
