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
      <p className="text-[16px] font-black text-primary-500">{questionNo}.</p>
      <p className="mt-[10px] text-[14px] font-medium text-app-black leading-relaxed">
        {text}
      </p>
      <p className="mt-[10px] text-[12px] font-normal text-gray-500 leading-relaxed">
        최근 2~3개월간 아기의 일반적인 모습을 떠올리며 답해 주세요.
      </p>

      <div className="mt-12">
        <ScaleSelector labels={labels} value={value} onChange={onChange} />
      </div>
    </div>
  );
}
