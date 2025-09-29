import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Brain } from 'lucide-react';

interface BASPAnswers {
  gender: string;
  age: string;
  familyHistory: string;
  hairLossPattern: string;
  duration: string;
  lifestyle: string;
  stress: string;
  diet: string;
  supplements: string;
  recentHairLoss: string;
}

interface SelfCheckStepProps {
  baspAnswers: BASPAnswers;
  setBaspAnswers: React.Dispatch<React.SetStateAction<BASPAnswers>>;
}

const SelfCheckStep: React.FC<SelfCheckStepProps> = ({ baspAnswers, setBaspAnswers }) => {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <Brain className="w-12 h-12 text-[#222222] mx-auto" />
        <h2 className="text-xl font-bold text-gray-800">분석 전 자가체크</h2>
        <p className="text-sm text-gray-600">
          생활 습관과 유전적 요인을 파악하여 정확한 분석을 도와드려요
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="gender" className="text-base font-semibold text-gray-800">성별</Label>
          <RadioGroup 
            value={baspAnswers.gender} 
            onValueChange={(value) => setBaspAnswers(prev => ({...prev, gender: value}))}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="text-sm">남성</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="text-sm">여성</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label htmlFor="age" className="text-base font-semibold text-gray-800">나이</Label>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">만 나이를 입력해주세요</p>
            <Input
              id="age"
              type="number"
              placeholder="예: 25"
              value={baspAnswers.age}
              onChange={(e) => setBaspAnswers(prev => ({...prev, age: e.target.value}))}
              className="w-full"
              min="1"
              max="100"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="familyHistory" className="text-base font-semibold text-gray-800">가족력이 있나요?</Label>
          <RadioGroup 
            value={baspAnswers.familyHistory} 
            onValueChange={(value) => setBaspAnswers(prev => ({...prev, familyHistory: value}))}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes" className="text-sm">예</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no" className="text-sm">아니오</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label htmlFor="recentHairLoss" className="text-base font-semibold text-gray-800">최근 머리 빠짐 증상이 있나요?</Label>
          <RadioGroup 
            value={baspAnswers.recentHairLoss} 
            onValueChange={(value) => setBaspAnswers(prev => ({...prev, recentHairLoss: value}))}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RadioGroupItem value="yes" id="recentHairLoss-yes" />
              <Label htmlFor="recentHairLoss-yes" className="text-sm">예</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RadioGroupItem value="no" id="recentHairLoss-no" />
              <Label htmlFor="recentHairLoss-no" className="text-sm">아니오</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label htmlFor="stress" className="text-base font-semibold text-gray-800">최근 스트레스를 겪고 있나요?</Label>
          <RadioGroup 
            value={baspAnswers.stress} 
            onValueChange={(value) => setBaspAnswers(prev => ({...prev, stress: value}))}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RadioGroupItem value="high" id="stress-high" />
              <Label htmlFor="stress-high" className="text-sm">상 (많이 받고 있음)</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RadioGroupItem value="medium" id="stress-medium" />
              <Label htmlFor="stress-medium" className="text-sm">중 (보통 정도)</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RadioGroupItem value="low" id="stress-low" />
              <Label htmlFor="stress-low" className="text-sm">하 (거의 받지 않음)</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
};

export default SelfCheckStep;
