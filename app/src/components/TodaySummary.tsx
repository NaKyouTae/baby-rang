import Link from "next/link";

type SummaryItem = {
  href: string;
  emoji: string;
  label: string;
  value: string;
  hint?: string;
};

export type TodaySummaryProps = {
  items?: SummaryItem[];
};

const DEFAULT_ITEMS: SummaryItem[] = [
  { href: "/feeding", emoji: "🍼", label: "마지막 수유", value: "2시간 전", hint: "120ml" },
  { href: "/sleep", emoji: "😴", label: "깨어있는 지", value: "1시간 30분" },
  { href: "/diaper", emoji: "💩", label: "오늘 기저귀", value: "💩 2 · 💧 5" },
  { href: "/feeding", emoji: "➕", label: "빠른 기록", value: "추가하기" },
];

export default function TodaySummary({ items = DEFAULT_ITEMS }: TodaySummaryProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-900">오늘의 요약</h2>
        <span className="text-[11px] text-gray-400">탭해서 기록</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((it, i) => (
          <Link
            key={i}
            href={it.href}
            className="rounded-2xl bg-white p-3 shadow-sm active:opacity-80"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="text-sm">{it.emoji}</span>
              <span>{it.label}</span>
            </div>
            <div className="mt-1.5 text-sm font-bold text-gray-900 leading-tight">
              {it.value}
            </div>
            {it.hint && (
              <div className="text-[11px] text-gray-500 mt-0.5">{it.hint}</div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
