'use client';

import type { DimensionScore } from '@/lib/api';
import { palette } from '@/lib/colors';
import ResultSection from './ResultSection';

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
    <ResultSection title="기질 한눈에 보기">
      <div className="space-y-3">
        {DIMENSION_ORDER.map((key) => {
          const dim = scores[key];
          if (!dim) return null;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-[10px]">
                <span
                  className="text-[12px] font-medium"
                  style={{ color: palette.black }}
                >
                  {dim.label}
                </span>
                <span
                  className="text-[12px] font-medium"
                  style={{ color: palette.teal }}
                >
                  {dim.score}
                </span>
              </div>
              <div
                className="h-[10px] rounded-full overflow-hidden"
                style={{ backgroundColor: palette.gray100 }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${dim.score}%`,
                    backgroundColor:
                      dim.score < 50 ? palette.gray400 : palette.teal,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ResultSection>
  );
}
