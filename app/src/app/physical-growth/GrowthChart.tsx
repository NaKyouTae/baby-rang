'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GrowthData, MetricType, Gender } from './growthStandards';
import { getGrowthStandard, calcAgeMonths } from './growthStandards';

type DataPoint = {
  ageMonths: number;
  value: number;
};

type GrowthChartProps = {
  gender: Gender;
  metric: MetricType;
  birthDate: string;
  records: {
    measuredAt: string;
    heightCm: number | null;
    weightKg: number | null;
    headCircumCm: number | null;
  }[];
};

// 최초 렌더 크기. 실제 차트 영역은 모바일 카드 너비와 가용 높이를 측정해 맞춘다.
const CHART_W = 330;
const CHART_H = 394;
const PAD_L = 25;
const PAD_R = 0;
const PAD_T = 5;
const PAD_B = 20;

// 정상 범위 띠 색상 — 디자인 범례의 #3078C9 10%
const BAND_COLORS = {
  outer: 'rgba(48,120,201,0.05)',  // 3-15, 85-97
  inner: 'rgba(48,120,201,0.1)',  // 15-50, 50-85
};

const CURVE_STYLES: Record<string, { color: string; width: number; dash?: string }> = {
  p3:  { color: '#94a3b8', width: 0.8, dash: '3,2' },
  p15: { color: '#94a3b8', width: 0.8 },
  p50: { color: '#3078C9', width: 2 },
  p85: { color: '#94a3b8', width: 0.8 },
  p97: { color: '#94a3b8', width: 0.8, dash: '3,2' },
};

function extractValue(
  record: GrowthChartProps['records'][number],
  metric: MetricType,
): number | null {
  switch (metric) {
    case 'weight': return record.weightKg;
    case 'height': return record.heightCm;
    case 'head': return record.headCircumCm;
  }
}

export default function GrowthChart({
  gender,
  metric,
  birthDate,
  records,
}: GrowthChartProps) {
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: CHART_W, height: CHART_H });
  useEffect(() => {
    const element = chartAreaRef.current;
    if (!element) return;
    const updateSize = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      const next = { width: Math.round(width), height: Math.round(height) };
      setChartSize((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      );
    };
    const observer = new ResizeObserver(([entry]) => {
      updateSize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(element);
    const rect = element.getBoundingClientRect();
    updateSize(rect.width, rect.height);
    return () => observer.disconnect();
  }, []);

  const chartW = chartSize.width;
  const chartH = chartSize.height;
  const plotW = chartW - PAD_L - PAD_R;
  const plotH = chartH - PAD_T - PAD_B;
  const standard = getGrowthStandard(gender, metric);
  const chartData = standard.data;

  // 아기 측정 데이터 포인트
  const childPoints: DataPoint[] = useMemo(() => {
    return records
      .map((r) => {
        const value = extractValue(r, metric);
        if (value == null) return null;
        const ageMonths = calcAgeMonths(birthDate, r.measuredAt.slice(0, 10));
        if (ageMonths < 0 || ageMonths > 36) return null;
        return { ageMonths, value };
      })
      .filter((p): p is DataPoint => p !== null)
      .sort((a, b) => a.ageMonths - b.ageMonths);
  }, [records, metric, birthDate]);

  // 표시 범위 결정: 아기 데이터 기반 또는 기본 0-12개월
  const { minMonth, maxMonth, minVal, maxVal } = useMemo(() => {
    let mxMonth = 12;
    if (childPoints.length > 0) {
      const lastAge = childPoints[childPoints.length - 1].ageMonths;
      // 마지막 측정 + 3개월 여유, 6개월 단위로 올림
      mxMonth = Math.min(36, Math.ceil((lastAge + 3) / 6) * 6);
      mxMonth = Math.max(mxMonth, 12);
    }

    const relevantData = chartData.filter((d) => d.month <= mxMonth);
    const allP3 = relevantData.map((d) => d.percentiles.p3);
    const allP97 = relevantData.map((d) => d.percentiles.p97);
    const childVals = childPoints.map((p) => p.value);

    const rawMin = Math.min(...allP3, ...childVals);
    const rawMax = Math.max(...allP97, ...childVals);
    const padding = (rawMax - rawMin) * 0.08;

    return {
      minMonth: 0,
      maxMonth: mxMonth,
      minVal: Math.floor((rawMin - padding) * 2) / 2,
      maxVal: Math.ceil((rawMax + padding) * 2) / 2,
    };
  }, [chartData, childPoints]);

  // 좌표 변환 함수
  const toX = (month: number) => PAD_L + ((month - minMonth) / (maxMonth - minMonth)) * plotW;
  const toY = (val: number) => PAD_T + (1 - (val - minVal) / (maxVal - minVal)) * plotH;

  // 백분위수 곡선 경로 생성
  const makePath = (data: GrowthData[], key: keyof GrowthData['percentiles']) => {
    const filtered = data.filter((d) => d.month >= minMonth && d.month <= maxMonth);
    return filtered
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(d.month).toFixed(1)},${toY(d.percentiles[key]).toFixed(1)}`)
      .join(' ');
  };

  // 밴드 (두 백분위수 사이 영역) 경로
  const makeBand = (data: GrowthData[], keyLow: keyof GrowthData['percentiles'], keyHigh: keyof GrowthData['percentiles']) => {
    const filtered = data.filter((d) => d.month >= minMonth && d.month <= maxMonth);
    const upper = filtered.map((d) => `${toX(d.month).toFixed(1)},${toY(d.percentiles[keyHigh]).toFixed(1)}`);
    const lower = [...filtered].reverse().map((d) => `${toX(d.month).toFixed(1)},${toY(d.percentiles[keyLow]).toFixed(1)}`);
    return `M${upper.join(' L')} L${lower.join(' L')} Z`;
  };

  // 아기 데이터 경로
  const childPath = childPoints.length >= 2
    ? childPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.ageMonths).toFixed(1)},${toY(p.value).toFixed(1)}`).join(' ')
    : null;

  // X축 눈금 (월령)
  const xTicks: number[] = [];
  const step = maxMonth <= 12 ? 3 : maxMonth <= 24 ? 6 : 6;
  for (let m = 0; m <= maxMonth; m += step) xTicks.push(m);

  // Y축 눈금
  const yTicks: number[] = [];
  const yStep = metric === 'head' ? 2 : metric === 'weight' ? 2 : 10;
  const yStart = Math.ceil(minVal / yStep) * yStep;
  for (let v = yStart; v <= maxVal; v += yStep) yTicks.push(v);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col items-center gap-[10px]">
      {/* 차트의 실제 너비·높이를 viewBox에 반영해 글자나 선을 찌그러뜨리지 않고 꽉 채운다. */}
      <div ref={chartAreaRef} className="mx-[10px] w-[calc(100%-20px)] flex-1 min-h-0">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full block">
        {/* 밴드 영역 */}
        <path d={makeBand(chartData, 'p3', 'p15')} fill={BAND_COLORS.outer} />
        <path d={makeBand(chartData, 'p15', 'p50')} fill={BAND_COLORS.inner} />
        <path d={makeBand(chartData, 'p50', 'p85')} fill={BAND_COLORS.inner} />
        <path d={makeBand(chartData, 'p85', 'p97')} fill={BAND_COLORS.outer} />

        {/* 그리드 가로선 — gray200 2px 점선 */}
        {yTicks.map((v) => (
          <line
            key={v}
            x1={PAD_L}
            y1={toY(v)}
            x2={chartW - PAD_R}
            y2={toY(v)}
            stroke="#EEF0F1"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        ))}

        {/* Y축 (좌측 세로) */}
        <line
          x1={PAD_L}
          y1={PAD_T}
          x2={PAD_L}
          y2={chartH - PAD_B}
          stroke="#EEF0F1"
          strokeWidth={1}
        />
        {/* X축 (하단 가로) */}
        <line
          x1={PAD_L}
          y1={chartH - PAD_B}
          x2={chartW - PAD_R}
          y2={chartH - PAD_B}
          stroke="#EEF0F1"
          strokeWidth={1}
        />

        {/* 백분위수 곡선 */}
        {(['p3', 'p15', 'p50', 'p85', 'p97'] as const).map((key) => {
          const style = CURVE_STYLES[key];
          return (
            <path
              key={key}
              d={makePath(chartData, key)}
              fill="none"
              stroke={style.color}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              strokeLinecap="round"
            />
          );
        })}

        {/* X축 라벨 (X축 선에서 10px 아래) — 양 끝은 차트 밖으로 나가지 않게 안쪽으로 붙인다 */}
        {xTicks.map((m, i) => (
          <text
            key={m}
            x={toX(m)}
            y={chartH - PAD_B + 10}
            textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
            dominantBaseline="hanging"
            fontSize="10"
            fill="#BBC0C5"
          >
            {m}
          </text>
        ))}

        {/* Y축 라벨 — 축 왼쪽 칸(25px)에 가운데 정렬 */}
        {yTicks.map((v) => (
          <text
            key={v}
            x={(PAD_L - 5) / 2}
            y={toY(v)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fill="#BBC0C5"
          >
            {v}
          </text>
        ))}

        {/* 아기 데이터 라인 */}
        {childPath && (
          <path
            d={childPath}
            fill="none"
            stroke="#3078C9"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* 아기 데이터 포인트 */}
        {childPoints.map((p, i) => (
          <g key={i}>
            <circle
              cx={toX(p.ageMonths)}
              cy={toY(p.value)}
              r={4}
              fill="white"
              stroke="#3078C9"
              strokeWidth={2}
            />
            <circle
              cx={toX(p.ageMonths)}
              cy={toY(p.value)}
              r={1.5}
              fill="#3078C9"
            />
          </g>
        ))}
      </svg>
      </div>

      {/* 범례 — 오른쪽 정렬 */}
      <div className="flex items-center justify-center gap-[16px]">
        <div className="flex items-center gap-[4px]">
          <span className="w-[10px] h-[2px] bg-[#3078C9]" aria-hidden />
          <span className="text-[12px] leading-none text-[#121212]">50백분위수</span>
        </div>
        <div className="flex items-center gap-[4px]">
          <span className="size-[10px] rounded-full border-2 border-[#3078C9] bg-[#FDFDFE]" aria-hidden />
          <span className="text-[12px] leading-none text-[#121212]">내 아기</span>
        </div>
        <div className="flex items-center gap-[4px]">
          <span className="size-[10px]" style={{ background: BAND_COLORS.inner }} aria-hidden />
          <span className="text-[12px] leading-none text-[#121212]">정상 범위</span>
        </div>
      </div>
    </div>
  );
}
