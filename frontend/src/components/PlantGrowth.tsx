import { ImageWithFallback } from '../hooks/ImageWithFallback';

interface PlantGrowthProps {
  points: number;
  level: string;
}

export function PlantGrowth({ points, level }: PlantGrowthProps) {
  const getPlantStage = (points: number) => {
    if (points < 100) return { stage: '새싹', description: '새로운 시작!', progress: points };
    if (points < 300) return { stage: '새잎', description: '건강하게 자라고 있어요!', progress: points - 100 };
    if (points < 600) return { stage: '가지', description: '꾸준히 성장 중이에요!', progress: points - 300 };
    return { stage: '나무', description: '멋진 성과를 이뤘어요!', progress: points - 600 };
  };

  const plantStage = getPlantStage(points);
  const maxPoints = plantStage.stage === '새싹' ? 100 : plantStage.stage === '새잎' ? 200 : plantStage.stage === '가지' ? 300 : 400;

  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      {/* 식물 이미지 */}
      <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gradient-to-b from-green-100 to-green-200 flex items-center justify-center">
        <ImageWithFallback 
          src="https://images.unsplash.com/photo-1641230894485-1299385f425a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGFudCUyMGdyb3d0aCUyMHN0YWdlcyUyMHNlZWRsaW5nfGVufDF8fHx8MTc1ODA0OTc2MXww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="식물 성장 단계"
          className="w-24 h-24 object-cover rounded-full"
        />
        
        {/* 레벨 배지 */}
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">
          {plantStage.stage === '새싹' ? '🌱' : plantStage.stage === '새잎' ? '🌿' : plantStage.stage === '가지' ? '🪴' : '🌳'}
        </div>
      </div>

      {/* 단계 정보 */}
      <div className="text-center space-y-2">
        <h3>{plantStage.stage} 단계</h3>
        <p className="text-muted-foreground">{plantStage.description}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">진행률</span>
          <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden min-w-[120px]">
            <div 
              className="bg-green-500 h-full transition-all duration-300"
              style={{ width: `${(plantStage.progress / maxPoints) * 100}%` }}
            />
          </div>
          <span className="text-sm">{plantStage.progress}/{maxPoints}</span>
        </div>
      </div>

      {/* 다음 단계 안내 */}
      {plantStage.stage !== '나무' && (
        <div className="text-center text-sm text-muted-foreground">
          <p>다음 단계까지 {maxPoints - plantStage.progress}포인트 남았어요!</p>
        </div>
      )}

      {/* 포인트 히스토리 */}
      <div className="w-full grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-muted-foreground">오늘</p>
          <p className="text-sm">+15</p>
        </div>
        <div>
          <p className="text-muted-foreground">이번 주</p>
          <p className="text-sm">+85</p>
        </div>
        <div>
          <p className="text-muted-foreground">총합</p>
          <p className="text-sm">{points}</p>
        </div>
      </div>
    </div>
  );
}