import React from 'react';
import { HairlineType } from '../types';

interface HairlineSelectorProps {
  value: HairlineType | null;
  onChange: (value: HairlineType) => void;
}

const HairlineSelector: React.FC<HairlineSelectorProps> = ({ value, onChange }) => {
  const options = [
    { value: 'L' as HairlineType, label: 'L', description: '앞머리선 변화 없음' },
    { value: 'M' as HairlineType, label: 'M', description: '측두부 후퇴(M형 경향)' },
    { value: 'C' as HairlineType, label: 'C', description: '중앙부 후퇴(C형 경향)' },
    { value: 'U' as HairlineType, label: 'U', description: '말굽형 전반 후퇴(U형 경향)' }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${
              value === option.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
            aria-pressed={value === option.value}
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center text-2xl font-bold">
                {option.label}
              </div>
              <div className="text-sm font-medium">{option.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HairlineSelector;
