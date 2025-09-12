import React from 'react';
import { HairlineSubType } from '../types';

interface HairlineSubTypeSelectorProps {
  value: HairlineSubType | null;
  onChange: (value: HairlineSubType) => void;
  hairlineType: 'M' | 'C' | 'U';
}

const HairlineSubTypeSelector: React.FC<HairlineSubTypeSelectorProps> = ({
  value,
  onChange,
  hairlineType
}) => {
  const getOptions = () => {
    switch (hairlineType) {
      case 'M':
        return [
          { value: 0 as HairlineSubType, label: '후퇴 없음', description: '측두부가 정상 상태' },
          { value: 1 as HairlineSubType, label: '약간 후퇴', description: '측두부가 살짝 후퇴' },
          { value: 2 as HairlineSubType, label: '중간 후퇴', description: '측두부가 중간 정도 후퇴' },
          { value: 3 as HairlineSubType, label: '심한 후퇴', description: '측두부가 심하게 후퇴' }
        ];
      case 'C':
        return [
          { value: 0 as HairlineSubType, label: '후퇴 없음', description: '중앙부가 정상 상태' },
          { value: 1 as HairlineSubType, label: '약간 후퇴', description: '중앙부가 살짝 후퇴' },
          { value: 2 as HairlineSubType, label: '중간 후퇴', description: '중앙부가 중간 정도 후퇴' },
          { value: 3 as HairlineSubType, label: '심한 후퇴', description: '중앙부가 심하게 후퇴' }
        ];
      case 'U':
        return [
          { value: 1 as HairlineSubType, label: '약간 후퇴', description: '말굽형이 살짝 후퇴' },
          { value: 2 as HairlineSubType, label: '중간 후퇴', description: '말굽형이 중간 정도 후퇴' },
          { value: 3 as HairlineSubType, label: '심한 후퇴', description: '말굽형이 심하게 후퇴' }
        ];
      default:
        return [];
    }
  };

  const options = getOptions();

  return (
    <div className="space-y-4">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
            value === option.value
              ? 'border-blue-500 bg-blue-50 text-blue-900'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="font-medium">{option.label}</div>
          <div className="text-sm text-gray-600 mt-1">{option.description}</div>
        </button>
      ))}
    </div>
  );
};

export default HairlineSubTypeSelector;
