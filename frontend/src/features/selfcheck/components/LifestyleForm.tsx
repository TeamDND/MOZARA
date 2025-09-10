import React from 'react';
import { LifestyleAnswers } from '../types';

interface LifestyleFormProps {
  value: LifestyleAnswers;
  onChange: (value: LifestyleAnswers) => void;
}

const LifestyleForm: React.FC<LifestyleFormProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof LifestyleAnswers, newValue: any) => {
    onChange({
      ...value,
      [field]: newValue
    });
  };

  return (
    <div className="space-y-6">
      {/* 최근 6개월간 빠짐 증가 느낌 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          최근 6개월간 빠짐 증가 느낌이 있나요?
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => handleChange('shedding6m', true)}
            className={`px-6 py-3 rounded-lg border-2 transition-all ${
              value.shedding6m
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            예
          </button>
          <button
            onClick={() => handleChange('shedding6m', false)}
            className={`px-6 py-3 rounded-lg border-2 transition-all ${
              !value.shedding6m
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            아니오
          </button>
        </div>
      </div>

      {/* 가족력 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          가족 중 탈모가 있나요?
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => handleChange('familyHistory', true)}
            className={`px-6 py-3 rounded-lg border-2 transition-all ${
              value.familyHistory
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            예
          </button>
          <button
            onClick={() => handleChange('familyHistory', false)}
            className={`px-6 py-3 rounded-lg border-2 transition-all ${
              !value.familyHistory
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            아니오
          </button>
        </div>
      </div>

      {/* 수면 시간 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          평균 수면 시간은?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'lt4' as const, label: '4시간 미만' },
            { value: '5to7' as const, label: '5~7시간' },
            { value: 'ge8' as const, label: '8시간 이상' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleChange('sleepHours', option.value)}
              className={`px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                value.sleepHours === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 흡연 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          흡연을 하나요?
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => handleChange('smoking', true)}
            className={`px-6 py-3 rounded-lg border-2 transition-all ${
              value.smoking
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            예
          </button>
          <button
            onClick={() => handleChange('smoking', false)}
            className={`px-6 py-3 rounded-lg border-2 transition-all ${
              !value.smoking
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            아니오
          </button>
        </div>
      </div>

      {/* 음주 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          음주 빈도는?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'none' as const, label: '안 함' },
            { value: 'light' as const, label: '가끔' },
            { value: 'heavy' as const, label: '잦음' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleChange('alcohol', option.value)}
              className={`px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                value.alcohol === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LifestyleForm;
