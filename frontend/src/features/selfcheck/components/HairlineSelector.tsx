import React from 'react';
import { HairlineType } from '../types';

interface HairlineSelectorProps {
  value: HairlineType | null;
  onChange: (value: HairlineType) => void;
}

const HairlineSelector: React.FC<HairlineSelectorProps> = ({ value, onChange }) => {
  const options = [
    { value: 'A' as HairlineType, label: 'A', description: '일자형·안정적' },
    { value: 'M' as HairlineType, label: 'M', description: '양측 이마 후퇴(M자 경향)' },
    { value: 'C' as HairlineType, label: 'C', description: '곡선형 후퇴' },
    { value: 'U' as HairlineType, label: 'U', description: '넓은 이마 상승(전체 후퇴)' }
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
