'use client';

import ScaleSelector from './ScaleSelector';

interface QuestionCardProps {
  questionNo: number;
  totalQuestions: number;
  text: string;
  labels: Record<string, string>;
  value: number | null;
  onChange: (score: number) => void;
}

export default function QuestionCard({
  questionNo,
  text,
  labels,
  value,
  onChange,
}: QuestionCardProps) {
  return (
    <div>
      <div className="text-center mb-2">
        <p className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">Q{questionNo}.</p>
      </div>

      <p className="text-[17px] font-semibold text-gray-800 leading-relaxed text-center mb-2 min-h-[56px]">
        {text}
      </p>
      <div className="mb-6 bg-primary-50 rounded-2xl text-center">
        <p className="text-xs text-primary-700 leading-relaxed">
          최근 2~3개월간 아이의 일반적인 모습을 떠올리며 답해 주세요.
        </p>
      </div>

      <ScaleSelector labels={labels} value={value} onChange={onChange} />
    </div>
  );
}
