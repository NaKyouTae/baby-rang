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
    <div className="flex flex-col gap-2.5">
      {options.map((score) => {
        const isSelected = value === score;
        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`w-full py-2.5 px-5 rounded-xl text-left text-[15px] font-semibold transition-all duration-200 ${
              isSelected
                ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                : 'bg-white text-gray-700 border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 active:scale-[0.98]'
            }`}
          >
            {labels[String(score)]}
          </button>
        );
      })}
    </div>
  );
}
