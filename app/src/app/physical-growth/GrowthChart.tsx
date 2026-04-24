'use client';

import { useMemo } from 'react';
import type { GrowthData, MetricType, Gender } from './growthStandards';
import { getGrowthStandard, calcAgeMonths, calcPercentile } from './growthStandards';

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

// 차트 레이아웃 상수
const CHART_W = 360;
const CHART_H = 240;
const PAD_L = 38;
const PAD_R = 36;
const PAD_T = 16;
const PAD_B = 28;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

// 백분위수 곡선 색상
const BAND_COLORS = {
  outer: 'rgba(48,176,199,0.06)',  // 3-15, 85-97
  inner: 'rgba(48,176,199,0.12)',  // 15-50, 50-85
};

const CURVE_STYLES: Record<string, { color: string; width: number; dash?: string }> = {
  p3:  { color: '#94a3b8', width: 0.8, dash: '3,2' },
  p15: { color: '#94a3b8', width: 0.8 },
  p50: { color: '#3078C9', width: 1.5 },
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
  const standard = getGrowthStandard(gender, metric);
  const chartData = standard.data;

  // 아이 측정 데이터 포인트
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

  // 표시 범위 결정: 아이 데이터 기반 또는 기본 0-12개월
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
  const toX = (month: number) => PAD_L + ((month - minMonth) / (maxMonth - minMonth)) * PLOT_W;
  const toY = (val: number) => PAD_T + (1 - (val - minVal) / (maxVal - minVal)) * PLOT_H;

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

  // 아이 데이터 경로
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

  // 마지막 포인트의 백분위수 추정
  const lastPoint = childPoints.length > 0 ? childPoints[childPoints.length - 1] : null;
  const lastPercentile = lastPoint
    ? calcPercentile(gender, metric, lastPoint.ageMonths, lastPoint.value)
    : null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[15px] font-bold text-gray-900">{standard.label}</span>
          <span className="text-[12px] text-gray-400 ml-1">({standard.unit})</span>
        </div>
        {lastPercentile != null && lastPoint && (
          <div className="text-right">
            <span className="text-[11px] text-gray-500">최근 측정</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[15px] font-bold text-primary-500">
                {lastPoint.value}{standard.unit}
              </span>
              <span className="text-[11px] text-gray-500">
                ({lastPercentile}백분위수)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SVG 차트 */}
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        style={{ aspectRatio: `${CHART_W}/${CHART_H}` }}
      >
        {/* 밴드 영역 */}
        <path d={makeBand(chartData, 'p3', 'p15')} fill={BAND_COLORS.outer} />
        <path d={makeBand(chartData, 'p15', 'p50')} fill={BAND_COLORS.inner} />
        <path d={makeBand(chartData, 'p50', 'p85')} fill={BAND_COLORS.inner} />
        <path d={makeBand(chartData, 'p85', 'p97')} fill={BAND_COLORS.outer} />

        {/* 그리드 가로선 */}
        {yTicks.map((v) => (
          <line
            key={v}
            x1={PAD_L}
            y1={toY(v)}
            x2={CHART_W - PAD_R}
            y2={toY(v)}
            stroke="#f1f5f9"
            strokeWidth={0.5}
          />
        ))}

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

        {/* 백분위수 라벨 (오른쪽 끝) */}
        {(['p3', 'p50', 'p97'] as const).map((key) => {
          const lastData = chartData.find((d) => d.month === maxMonth);
          if (!lastData) return null;
          const label = key === 'p3' ? '3' : key === 'p50' ? '50' : '97';
          return (
            <text
              key={key}
              x={CHART_W - PAD_R + 4}
              y={toY(lastData.percentiles[key]) + 3}
              fontSize={8}
              fill="#94a3b8"
            >
              {label}
            </text>
          );
        })}

        {/* X축 라벨 */}
        {xTicks.map((m) => (
          <text
            key={m}
            x={toX(m)}
            y={CHART_H - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#94a3b8"
          >
            {m}
          </text>
        ))}
        <text
          x={CHART_W / 2}
          y={CHART_H}
          textAnchor="middle"
          fontSize={8}
          fill="#cbd5e1"
        >
          개월
        </text>

        {/* Y축 라벨 */}
        {yTicks.map((v) => (
          <text
            key={v}
            x={PAD_L - 4}
            y={toY(v) + 3}
            textAnchor="end"
            fontSize={9}
            fill="#94a3b8"
          >
            {v}
          </text>
        ))}

        {/* 아이 데이터 라인 */}
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

        {/* 아이 데이터 포인트 */}
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

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-primary-500 rounded" />
          <span className="text-[10px] text-gray-500">50백분위수</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full border-2 border-primary-500 bg-white" />
          <span className="text-[10px] text-gray-500">우리 아이</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm" style={{ background: BAND_COLORS.inner }} />
          <span className="text-[10px] text-gray-500">정상 범위</span>
        </div>
      </div>

      {/* 데이터 없을 때 안내 */}
      {childPoints.length === 0 && (
        <p className="text-center text-[12px] text-gray-400 mt-2">
          측정 기록을 추가하면 성장 곡선에 표시됩니다
        </p>
      )}
    </div>
  );
}
