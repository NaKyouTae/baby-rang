'use client';

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = Math.round((current / total) * 100);

  return (
    <div className="pt-4 pb-2 px-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-primary-600">
          {current} / {total}
        </span>
        <span className="text-xs text-gray-400">{percent}%</span>
      </div>
      <div className="h-2.5 bg-primary-50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
