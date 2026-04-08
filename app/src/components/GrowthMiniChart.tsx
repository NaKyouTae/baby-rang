import Link from "next/link";

export type GrowthPoint = { label: string; value: number };

export type GrowthMiniChartProps = {
  title?: string;
  unit?: string;
  points?: GrowthPoint[];
  percentile?: number;
};

const DEFAULT_POINTS: GrowthPoint[] = [
  { label: "1m", value: 4.2 },
  { label: "2m", value: 5.1 },
  { label: "3m", value: 5.9 },
  { label: "4m", value: 6.6 },
  { label: "5m", value: 7.2 },
];

export default function GrowthMiniChart({
  title = "몸무게",
  unit = "kg",
  points = DEFAULT_POINTS,
  percentile = 60,
}: GrowthMiniChartProps) {
  const w = 280;
  const h = 70;
  const pad = 6;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => {
    const x = pad + stepX * i;
    const y = pad + (h - pad * 2) * (1 - (p.value - min) / range);
    return { x, y, ...p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const area = `${path} L${coords[coords.length - 1].x},${h - pad} L${coords[0].x},${h - pad} Z`;
  const last = points[points.length - 1];

  return (
    <Link
      href="/growth-record"
      className="block rounded-2xl bg-white p-4 shadow-sm active:opacity-80"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">{title}</div>
          <div className="text-base font-bold text-gray-900 mt-0.5">
            {last.value}
            <span className="text-xs font-medium text-gray-500 ml-1">{unit}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-gray-500">또래 백분위</div>
          <div className="text-sm font-semibold text-emerald-600">상위 {100 - percentile}%</div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-2 w-full h-16"
        preserveAspectRatio="none"
      >
        <path d={area} fill="rgba(16,185,129,0.12)" />
        <path
          d={path}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2.5} fill="#10b981" />
        ))}
      </svg>
    </Link>
  );
}
