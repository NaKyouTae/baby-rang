'use client';

import ResultSection from './ResultSection';

interface ReliabilityNoticeProps {
  message: string;
}

export default function ReliabilityNotice({ message }: ReliabilityNoticeProps) {
  return (
    <ResultSection title="검사 결과 안내">
      <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
    </ResultSection>
  );
}
