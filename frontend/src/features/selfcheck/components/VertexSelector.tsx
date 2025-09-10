import React from 'react';
import { VertexLevel } from '../types';

interface VertexSelectorProps {
  value: VertexLevel | null;
  onChange: (value: VertexLevel) => void;
}

const VertexSelector: React.FC<VertexSelectorProps> = ({ value, onChange }) => {
  const options = [
    { value: 0 as VertexLevel, label: 'V0', description: '정수리 정상' },
    { value: 1 as VertexLevel, label: 'V1', description: '정수리 희박 (초기)' },
    { value: 2 as VertexLevel, label: 'V2', description: '정수리 희박 (중기)' },
    { value: 3 as VertexLevel, label: 'V3', description: '정수리 희박 (심화)' }
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

export default VertexSelector;
