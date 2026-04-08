'use client';

import type { DimensionScore } from '@/lib/api';

const LEVEL_COLORS: Record<string, string> = {
  low: 'bg-gray-300',
  medium: 'bg-primary-400',
  high: 'bg-gradient-to-r from-primary-500 to-primary-400',
};

interface DimensionBarProps {
  scores: Record<string, DimensionScore>;
}

const DIMENSION_ORDER = [
  'activity',
  'adaptability',
  'emotional_intensity',
  'sociability',
  'persistence',
  'sensitivity',
];

export default function DimensionBar({ scores }: DimensionBarProps) {
  return (
    <div className="px-4 py-4">
      <h3 className="text-base font-bold text-gray-900 mb-4">
        기질 한눈에 보기
      </h3>
      <div className="space-y-3">
        {DIMENSION_ORDER.map((key) => {
          const dim = scores[key];
          if (!dim) return null;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{dim.label}</span>
                <span className="text-sm font-semibold text-primary-600">
                  {dim.score}
                </span>
              </div>
              <div className="h-3 bg-primary-50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${LEVEL_COLORS[dim.level]}`}
                  style={{ width: `${dim.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
