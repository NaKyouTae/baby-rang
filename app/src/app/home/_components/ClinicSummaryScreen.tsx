'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSelectedChild } from '@/hooks/useChildren';
import { formatChildAge } from '@/lib/childAge';
import {
  FEVER_C,
  kstYmd,
  periodWindow,
  summarizeClinic,
  type ClinicPeriod,
} from '@/lib/clinicSummary';
import type { GrowthRecord } from '@/app/growth-record/types';

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

const PERIODS: { value: ClinicPeriod; label: string }[] = [
  { value: '24h', label: '최근 24시간' },
  { value: 3, label: '최근 3일' },
  { value: 7, label: '최근 7일' },
];

/** 이보다 오래된 키·몸무게 측정은 날짜를 강조한다(일). */
const STALE_MEASURE_DAYS = 30;

const LoadingContext = createContext(false);

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

const pad = (n: number) => String(n).padStart(2, '0');

/** 11.16 14:57 (KST) */
function shortTime(iso: string | number) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  return `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString();
const fmtDur = (min: number) => {
  const m = Math.round(min);
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
};

/** 기간 내 가장 최근 측정에서 그 항목이 있는 값 */
function latest(list: PhysicalGrowth[], key: 'heightCm' | 'weightKg' | 'headCircumCm') {
  const g = list.find((x) => x[key] != null);
  return g ? { value: g[key] as number, date: g.measuredAt.slice(0, 10) } : null;
}

const memoKey = (childId: string) => `clinicMemo:${childId}`;

/**
 * 기록 요약 — 소아과에서 의료진에게 최근 생활을 빠르게 전하는 한 장.
 * 집계 기준은 lib/clinicSummary 에 있다. 화면은 받기 전에도 틀을 먼저 그린다.
 */
export default function ClinicSummaryScreen({ open, onBack }: Props) {
  const { children, isLoaded, selectedChild, selectChild } = useSelectedChild();
  const [period, setPeriod] = useState<ClinicPeriod>(3);
  const [records, setRecords] = useState<GrowthRecord[] | null>(null);
  const [growth, setGrowth] = useState<PhysicalGrowth[]>([]);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [memo, setMemo] = useState('');

  const childId = selectedChild?.id;

  useEffect(() => {
    if (!open || !childId) return;
    let cancelled = false;
    const t = Date.now();
    setNow(t);
    setRecords(null);
    setError(false);
    const { start } = periodWindow(period, t);
    // 기간 앞에서 시작해 기간 안까지 이어진 밤잠을 넣으려고 하루 더 받는다
    const from = kstYmd(start - 24 * 3600_000);
    const to = kstYmd(t);
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
        setGrowth(g);
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
  }, [open, childId, period]);

  // 내원 사유 메모는 이 기기에만 둔다(진료 때 보여 주는 용도)
  useEffect(() => {
    if (!open || !childId) return;
    try {
      setMemo(localStorage.getItem(memoKey(childId)) ?? '');
    } catch {
      setMemo('');
    }
  }, [open, childId]);
  const saveMemo = (v: string) => {
    setMemo(v);
    if (!childId) return;
    try {
      if (v) localStorage.setItem(memoKey(childId), v);
      else localStorage.removeItem(memoKey(childId));
    } catch {
      // 저장 못 해도 화면에는 남는다
    }
  };

  const loading = records === null;
  const s = useMemo(() => summarizeClinic(records ?? [], period, now), [records, period, now]);
  const { start } = periodWindow(period, now);
  const avg = period === '24h' ? '' : ' (하루 평균)';
  const perDay = (n: number) => (period === '24h' ? n : n / s.days);
  const height = latest(growth, 'heightCm');
  const weight = latest(growth, 'weightKg');
  const head = latest(growth, 'headCircumCm');
  const stale = (date: string) => now - Date.parse(`${date}T00:00:00+09:00`) > STALE_MEASURE_DAYS * 86400_000;

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
        <p className="text-[#121212] text-[16px] leading-none">기록 요약</p>
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
                className={`${BOX} shrink-0 h-[36px] px-[12px] text-[14px] ${c.id === childId ? 'bg-[#FFF6CC]' : ''}`}
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
            {/* 기본 정보 */}
            <div className={`${BOX} p-[12px] flex flex-col gap-[4px]`}>
              <p className="text-[#121212] text-[18px] leading-[1.4]">
                {selectedChild?.name ?? '-'}
                <span className="ml-[6px] text-[#808991] text-[14px]">
                  {selectedChild?.gender === 'male' ? '남아' : selectedChild?.gender === 'female' ? '여아' : ''}
                </span>
              </p>
              <p className="text-[#808991] text-[13px] leading-[1.4] tabular-nums">
                {selectedChild
                  ? `${selectedChild.birthDate} 출생 · ${formatChildAge(selectedChild.birthDate)}`
                  : '-'}
              </p>
              <div className="mt-[4px] flex flex-col gap-[2px] text-[13px] leading-[1.4] tabular-nums">
                {[
                  { label: '키', m: height, unit: 'cm' },
                  { label: '몸무게', m: weight, unit: 'kg' },
                  { label: '머리둘레', m: head, unit: 'cm' },
                ].map(({ label, m, unit }) => (
                  <p key={label} className="flex justify-between">
                    <span className="text-[#121212]">
                      {label} {m ? `${m.value}${unit}` : '기록 없음'}
                    </span>
                    {m && (
                      <span className={stale(m.date) ? 'text-[#E07000]' : 'text-[#808991]'}>
                        {m.date} 측정{stale(m.date) ? ' (오래됨)' : ''}
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </div>

            {/* 기간 */}
            <div className="grid grid-cols-3 gap-[6px] shrink-0">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={`${BOX} h-[36px] text-[14px] ${p.value === period ? 'bg-[#FFF6CC]' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="text-[#808991] text-[12px] leading-[1.5] text-center tabular-nums">
              <p>
                {shortTime(start)} ~ {shortTime(now)}
                {period === '24h' ? ' · 합계' : ` · 하루 평균(${fmt1(s.days)}일 기준)`}
              </p>
              <p>{shortTime(now)} 생성{period !== '24h' && ' · 오늘 기록은 집계 중'}</p>
            </div>

            {error ? (
              <p className={`${BOX} p-[16px] text-center text-[#808991] text-[14px]`}>기록을 불러오지 못했습니다.</p>
            ) : (
              <>
                {!loading && (s.empty || s.sparse) && (
                  <p className="px-[4px] text-[#E07000] text-[12px] leading-[1.5]">
                    {s.empty
                      ? '이 기간에 남긴 기록이 없어요.'
                      : '기록이 적어 실제 생활과 다를 수 있어요. 남긴 기록만 집계합니다.'}
                  </p>
                )}

                <Card title={`먹기${avg}`} loading={loading}>
                  {s.feed ? (
                    <>
                      <Stat label="전체 수유" value={`${fmt1(perDay(s.feed.count))}회`} />
                      <Sub label="모유 직접 수유" value={`${fmt1(perDay(s.feed.breastCount))}회 · ${Math.round(perDay(s.feed.breastMin))}분`} />
                      <Sub
                        label="분유·유축수유"
                        value={`${fmt1(perDay(s.feed.bottleCount))}회 · ${Math.round(perDay(s.feed.bottleMl)).toLocaleString()}mL`}
                      />
                      <Stat label="평균 수유 간격" value={s.feed.avgGapMin === null ? '-' : fmtDur(s.feed.avgGapMin)} />
                      {s.feed.babyFoodCount > 0 && (
                        <Stat
                          label="이유식"
                          value={[
                            `${fmt1(perDay(s.feed.babyFoodCount))}회`,
                            s.feed.babyFoodG > 0 && `${Math.round(perDay(s.feed.babyFoodG))}g`,
                            s.feed.babyFoodMl > 0 && `${Math.round(perDay(s.feed.babyFoodMl))}mL`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        />
                      )}
                    </>
                  ) : (
                    <Stat label="수유" value="기록 없음" muted />
                  )}
                </Card>

                <Card title={`잠${avg}`} loading={loading}>
                  {s.sleep ? (
                    <>
                      <Stat label="총 수면" value={fmtDur(perDay(s.sleep.totalMin))} />
                      <Sub label="낮잠" value={fmtDur(perDay(s.sleep.napMin))} />
                      <Sub label="밤잠" value={fmtDur(perDay(s.sleep.nightMin))} />
                      {s.sleep.ongoing && <Note>지금 자는 중인 기록은 현재 시각까지 셌어요.</Note>}
                    </>
                  ) : (
                    <Stat label="수면" value="기록 없음" muted />
                  )}
                </Card>

                <Card title={`배변${avg}`} loading={loading}>
                  {s.diaper ? (
                    <>
                      <Stat label="소변" value={`${fmt1(perDay(s.diaper.pee))}회`} />
                      <Stat label="대변" value={`${fmt1(perDay(s.diaper.poo))}회`} />
                      <Note>기저귀를 기록한 횟수라 실제 횟수와 다를 수 있어요.</Note>
                    </>
                  ) : (
                    <Stat label="기저귀" value="기록 없음" muted />
                  )}
                </Card>

                <Card title="체온 (기간 내 실제 기록)" loading={loading}>
                  {s.temp ? (
                    <>
                      <Stat
                        label="최고 체온"
                        value={`${s.temp.max}℃ · ${shortTime(s.temp.maxAt)}`}
                        accent={s.temp.max >= FEVER_C}
                      />
                      <Stat label={`발열(${FEVER_C}℃ 이상) 기록`} value={s.temp.feverDays ? `${s.temp.feverDays}일` : '없음'} />
                      {s.temp.fevers.slice(0, 5).map((f) => (
                        <Sub key={f.at} label={shortTime(f.at)} value={`${f.c}℃`} accent />
                      ))}
                    </>
                  ) : (
                    <Stat label="체온" value="기록 없음" muted />
                  )}
                </Card>

                <Card title="복용약 (최근 순)" loading={loading}>
                  {s.meds.length ? (
                    s.meds.slice(0, 8).map((m) => (
                      <Row key={m.at + m.name} time={shortTime(m.at)}>
                        {m.name || '이름 없음'}
                        {m.dose && <span className="text-[#808991]"> · {m.dose}</span>}
                        {m.antipyretic && <span className="ml-[4px] text-[#FF4040] text-[12px]">해열제</span>}
                      </Row>
                    ))
                  ) : (
                    <Stat label="투약" value="기록 없음" muted />
                  )}
                </Card>

                {s.hospital.length > 0 && (
                  <Card title="병원 방문" loading={loading}>
                    {s.hospital.map((h) => (
                      <Row key={h.at} time={shortTime(h.at)}>
                        {h.text || '병원'}
                      </Row>
                    ))}
                  </Card>
                )}

                <div className={`${BOX} p-[12px] flex flex-col gap-[8px]`}>
                  <p className="text-[#808991] text-[12px] leading-[1.4]">내원 사유 · 보호자 메모</p>
                  <textarea
                    value={memo}
                    onChange={(e) => saveMemo(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="예) 어제 밤부터 열이 나고 분유를 평소보다 덜 먹어요."
                    className="w-full resize-none bg-transparent text-[#121212] text-[16px] leading-[1.4] outline-none placeholder:text-[#B0B8C1]"
                  />
                </div>

                <p className="px-[4px] pb-[8px] text-[#808991] text-[11px] leading-[1.5]">
                  보호자가 남긴 기록을 그대로 모은 요약이에요. 의학적 판단이나 진단이 아닙니다.
                  평균은 조회 시작부터 지금까지 지난 시간으로 나누고, 체온·복용약은 실제 기록을 보여줘요.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** 받는 중이면 안의 숫자를 '-' 로 가린다(Stat·Sub 가 LoadingContext 를 본다). */
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

function Stat({
  label,
  value,
  accent = false,
  muted = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  const loading = useContext(LoadingContext);
  return (
    <div className="flex items-center justify-between gap-[8px] text-[15px] leading-[1.4]">
      <span className="text-[#121212]">{label}</span>
      <span
        className={`tabular-nums text-right ${
          loading || muted ? 'text-[#808991]' : accent ? 'text-[#FF4040]' : 'text-[#121212]'
        }`}
      >
        {loading ? '-' : value}
      </span>
    </div>
  );
}

/** 위 항목에 딸린 세부 줄 */
function Sub({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  const loading = useContext(LoadingContext);
  return (
    <div className="flex items-center justify-between gap-[8px] pl-[10px] text-[13px] leading-[1.4]">
      <span className="text-[#808991]">{label}</span>
      <span className={`tabular-nums text-right ${loading ? 'text-[#808991]' : accent ? 'text-[#FF4040]' : 'text-[#121212]'}`}>
        {loading ? '-' : value}
      </span>
    </div>
  );
}

function Row({ time, children }: { time: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-[8px] text-[14px] leading-[1.4]">
      <span className="shrink-0 text-[#808991] tabular-nums">{time}</span>
      <span className="text-[#121212] break-all">{children}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-[#808991] text-[11px] leading-[1.5]">{children}</p>;
}
