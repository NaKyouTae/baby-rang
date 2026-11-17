'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSelectedChild } from '@/hooks/useChildren';
import { formatChildAge, todayKstYmd } from '@/lib/childAge';
import type { GrowthRecord } from '@/app/growth-record/types';

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

const PERIODS = [1, 3, 7] as const;

const LoadingContext = createContext(false);
type Period = (typeof PERIODS)[number];

/** 이 이상이면 열로 본다(℃). */
const FEVER_C = 38;

interface PhysicalGrowth {
  measuredAt: string;
  heightCm: number | null;
  weightKg: number | null;
  headCircumCm: number | null;
}

interface Props {
  open: boolean;
  onBack: () => void;
}

function shiftYmd(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 11.16 14:57 (KST) */
function shortTime(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

function summarize(records: GrowthRecord[], days: number) {
  const of = (...types: GrowthRecord['type'][]) => records.filter((r) => types.includes(r.type));

  const formula = of('FORMULA');
  const pumped = of('PUMPED_FEEDING');
  const breast = of('BREASTFEEDING');
  const babyFood = of('BABY_FOOD');
  const bottleMl = [...formula, ...pumped].reduce((s, r) => s + num(r.data?.amountMl), 0);

  const feeds = [...formula, ...pumped, ...breast]
    .map((r) => new Date(r.startAt).getTime())
    .sort((a, b) => a - b);
  const gaps = feeds.slice(1).map((t, i) => t - feeds[i]).filter((g) => g > 0 && g < 12 * 3600_000);
  const avgGapMin = gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length / 60_000 : null;

  const sleepMin = of('SLEEP').reduce((s, r) => {
    if (!r.endAt) return s;
    const m = (new Date(r.endAt).getTime() - new Date(r.startAt).getTime()) / 60_000;
    return m > 0 && m < 24 * 60 ? s + m : s;
  }, 0);

  const diapers = of('DIAPER');
  const pee = diapers.filter((r) => r.data?.kind === 'PEE' || r.data?.kind === 'BOTH').length;
  const poo = diapers.filter((r) => r.data?.kind === 'POO' || r.data?.kind === 'BOTH').length;

  const temps = of('TEMPERATURE')
    .map((r) => ({ at: r.startAt, c: num(r.data?.tempC) }))
    .filter((t) => t.c > 0);
  const maxTemp = temps.reduce<number | null>((m, t) => (m === null || t.c > m ? t.c : m), null);
  const fevers = temps.filter((t) => t.c >= FEVER_C);

  const notes = of('MEDICATION', 'HOSPITAL')
    .map((r) => ({
      at: r.startAt,
      label: r.type === 'MEDICATION' ? '투약' : '병원',
      text: [r.data?.place, r.data?.memo, r.memo].filter((v) => typeof v === 'string' && v).join(' · '),
    }))
    .sort((a, b) => b.at.localeCompare(a.at));

  return {
    perDay: (n: number) => round1(n / days),
    feedCount: formula.length + pumped.length + breast.length,
    breastCount: breast.length,
    bottleCount: formula.length + pumped.length,
    bottleMl,
    babyFoodCount: babyFood.length,
    avgGapMin,
    sleepMin,
    pee,
    poo,
    maxTemp,
    fevers,
    notes,
  };
}

/**
 * 진료 요약 — 병원에서 의사에게 보여줄 최근 기록 한 장.
 * 숫자 위주로 한 화면에 담아, 진료실에서 바로 훑어볼 수 있게 한다.
 */
export default function ClinicSummaryScreen({ open, onBack }: Props) {
  const { children, isLoaded, selectedChild, selectChild } = useSelectedChild();
  const [period, setPeriod] = useState<Period>(3);
  const [records, setRecords] = useState<GrowthRecord[] | null>(null);
  const [growth, setGrowth] = useState<PhysicalGrowth | null>(null);
  const [error, setError] = useState(false);

  const to = todayKstYmd();
  const from = shiftYmd(to, -(period - 1));
  const childId = selectedChild?.id;

  useEffect(() => {
    if (!open || !childId) return;
    let cancelled = false;
    setRecords(null);
    setError(false);
    (async () => {
      try {
        const [rRes, gRes] = await Promise.all([
          fetch(`/api/growth-records/range?childId=${encodeURIComponent(childId)}&from=${from}&to=${to}`, {
            cache: 'no-store',
          }),
          fetch(`/api/physical-growth?childId=${encodeURIComponent(childId)}`, { cache: 'no-store' }),
        ]);
        if (!rRes.ok) throw new Error();
        const recs: GrowthRecord[] = await rRes.json();
        const g: PhysicalGrowth[] = gRes.ok ? await gRes.json() : [];
        if (cancelled) return;
        setRecords(recs);
        setGrowth(g[0] ?? null);
      } catch {
        if (!cancelled) {
          setRecords([]);
          setError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, childId, from, to]);

  // 기록을 받기 전에도 화면 틀은 바로 그린다. 값 자리는 받을 때까지 '-' 로 둔다.
  const loading = records === null;
  const s = useMemo(() => summarize(records ?? [], period), [records, period]);

  if (!open) return null;

  return (
    <div
      // 마이페이지(z-20) 는 덮고 하단 광고(z-50) 아래로 깔린다
      className="absolute inset-0 z-[25] bg-[#F7F8F9] flex flex-col gap-[10px] px-[20px]"
      style={{
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        paddingBottom: 'calc(var(--bottom-nav-space) + 20px)',
      }}
    >
      <div className={`${BOX} h-[48px] shrink-0 flex items-center justify-between px-[10px]`}>
        <button type="button" onClick={onBack} aria-label="뒤로" className="size-[24px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/chevron-left.svg" alt="" width={24} height={24} className="block" />
        </button>
        <p className="text-[#121212] text-[16px] leading-none">진료 요약</p>
        <span className="size-[24px]" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-[10px]">
        {children.length > 1 && (
          <div className="flex gap-[6px] overflow-x-auto shrink-0">
            {children.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectChild(c)}
                className={`${BOX} shrink-0 h-[36px] px-[12px] text-[14px] ${
                  c.id === childId ? 'bg-[#FFF6CC]' : ''
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {isLoaded && !selectedChild ? (
          <p className={`${BOX} p-[16px] text-center text-[#808991] text-[14px]`}>등록된 아기가 없습니다.</p>
        ) : (
          <>
            <div className={`${BOX} p-[12px] flex flex-col gap-[4px]`}>
              <p className="text-[#121212] text-[18px] leading-[1.4]">
                {selectedChild?.name ?? '-'}
                <span className="ml-[6px] text-[#808991] text-[14px]">
                  {selectedChild?.gender === 'male' ? '남아' : selectedChild?.gender === 'female' ? '여아' : ''}
                </span>
              </p>
              <p className="text-[#808991] text-[13px] leading-[1.4] tabular-nums">
                {selectedChild ? `${selectedChild.birthDate} 출생 · ${formatChildAge(selectedChild.birthDate)}` : '-'}
              </p>
              {growth && (
                <p className="text-[#121212] text-[13px] leading-[1.4] tabular-nums">
                  {[
                    growth.heightCm && `키 ${growth.heightCm}cm`,
                    growth.weightKg && `몸무게 ${growth.weightKg}kg`,
                    growth.headCircumCm && `머리둘레 ${growth.headCircumCm}cm`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  <span className="text-[#808991]"> ({growth.measuredAt.slice(0, 10)} 측정)</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-[6px] shrink-0">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`${BOX} h-[36px] text-[14px] ${p === period ? 'bg-[#FFF6CC]' : ''}`}
                >
                  {p === 1 ? '오늘 하루' : `최근 ${p}일`}
                </button>
              ))}
            </div>
            <p className="text-[#808991] text-[12px] text-center tabular-nums">
              {period === 1 ? `${to} · 오늘 합계` : `${from} ~ ${to} · 하루 평균`}
            </p>

            {error ? (
              <p className={`${BOX} p-[16px] text-center text-[#808991] text-[14px]`}>
                기록을 불러오지 못했습니다.
              </p>
            ) : (
              <>
                <Card title="먹기" loading={loading}>
                  <Stat label="수유" value={`${s.perDay(s.feedCount)}회`} />
                  <Stat label="모유" value={`${s.perDay(s.breastCount)}회`} />
                  <Stat
                    label="분유·유축수유"
                    value={`${s.perDay(s.bottleCount)}회 · ${Math.round(s.bottleMl / period)}ml`}
                  />
                  <Stat
                    label="수유 간격"
                    value={s.avgGapMin === null ? '-' : `${Math.floor(s.avgGapMin / 60)}시간 ${Math.round(s.avgGapMin % 60)}분`}
                  />
                  {s.babyFoodCount > 0 && <Stat label="이유식" value={`${s.perDay(s.babyFoodCount)}회`} />}
                </Card>

                <Card title="잠" loading={loading}>
                  <Stat
                    label="총 수면"
                    value={`${Math.floor(s.sleepMin / period / 60)}시간 ${Math.round((s.sleepMin / period) % 60)}분`}
                  />
                </Card>

                <Card title="배변" loading={loading}>
                  <Stat label="소변" value={`${s.perDay(s.pee)}회`} />
                  <Stat label="대변" value={`${s.perDay(s.poo)}회`} />
                </Card>

                <Card title="체온" loading={loading}>
                  <Stat label="최고 체온" value={s.maxTemp === null ? '기록 없음' : `${s.maxTemp}℃`} />
                  {s.fevers.map((f) => (
                    <Stat key={f.at} label={shortTime(f.at)} value={`${f.c}℃`} accent />
                  ))}
                </Card>

                {s.notes.length > 0 && (
                  <Card title="투약·병원">
                    {s.notes.map((n) => (
                      <div key={n.at + n.label} className="flex gap-[8px] text-[14px] leading-[1.4]">
                        <span className="shrink-0 text-[#808991] tabular-nums">{shortTime(n.at)}</span>
                        <span className="shrink-0">{n.label}</span>
                        <span className="text-[#121212] break-all">{n.text}</span>
                      </div>
                    ))}
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** 받는 중이면 안의 숫자를 '-' 로 가린다(Stat 이 LoadingContext 를 본다). */
function Card({ title, loading = false, children }: { title: string; loading?: boolean; children: React.ReactNode }) {
  return (
    <LoadingContext.Provider value={loading}>
      <div className={`${BOX} p-[12px] flex flex-col gap-[8px]`}>
        <p className="text-[#808991] text-[12px] leading-[1.4]">{title}</p>
        {children}
      </div>
    </LoadingContext.Provider>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  const loading = useContext(LoadingContext);
  return (
    <div className="flex items-center justify-between text-[15px] leading-[1.4]">
      <span className="text-[#121212]">{label}</span>
      <span className={`tabular-nums ${accent ? 'text-[#FF4040]' : loading ? 'text-[#808991]' : 'text-[#121212]'}`}>
        {loading ? '-' : value}
      </span>
    </div>
  );
}
