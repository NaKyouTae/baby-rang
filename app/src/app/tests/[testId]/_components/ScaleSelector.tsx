'use client';

interface ScaleSelectorProps {
  labels: Record<string, string>;
  value: number | null;
  onChange: (score: number) => void;
}

export default function ScaleSelector({
  labels,
  value,
  onChange,
}: ScaleSelectorProps) {
  const options = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col gap-[10px]">
      {options.map((score) => {
        const isSelected = value === score;
        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`w-full h-10 px-4 rounded-lg text-center text-[12px] transition-all duration-200 ${
              isSelected
                ? 'bg-primary-500/10 border border-primary-500 text-app-black font-medium'
                : 'bg-white border border-gray-200 text-app-black font-normal active:scale-[0.98]'
            }`}
          >
            {labels[String(score)]}
          </button>
        );
      })}
    </div>
  );
}
