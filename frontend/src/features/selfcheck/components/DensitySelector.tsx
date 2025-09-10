import React from 'react';
import { DensityLevel } from '../types';

interface DensitySelectorProps {
  value: DensityLevel | null;
  onChange: (value: DensityLevel) => void;
}

const DensitySelector: React.FC<DensitySelectorProps> = ({ value, onChange }) => {
  const options = [
    { value: 0 as DensityLevel, label: 'F0', description: '상부 전반 정상' },
    { value: 1 as DensityLevel, label: 'F1', description: '상부 전반 확산 (초기)' },
    { value: 2 as DensityLevel, label: 'F2', description: '상부 전반 확산 (중기)' },
    { value: 3 as DensityLevel, label: 'F3', description: '상부 전반 확산 (심화)' }
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
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center text-lg font-bold">
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

export default DensitySelector;
