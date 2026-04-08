'use client';

interface ReliabilityNoticeProps {
  message: string;
}

export default function ReliabilityNotice({ message }: ReliabilityNoticeProps) {
  return (
    <div className="mx-4 mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4">
      <p className="text-xs text-amber-700 leading-relaxed">{message}</p>
    </div>
  );
}
