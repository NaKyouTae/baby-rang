'use client';

import { useMemo, useState } from 'react';
import { useSelectedChild } from '@/hooks/useChildren';
import ChildSelector from '@/components/ChildSelector';
import PageHeader from '@/components/PageHeader';
import { WAKE_WINDOWS, MONTH_TIPS, type WakeWindow } from '@/lib/sleepGuide';
import { calcChildAge } from '@/lib/childAge';

// 월령 계산 (KST 기준, 공통 함수 사용)
function getAgeInMonths(birthDate: string): number {
  return calcChildAge(birthDate).months;
}




function getMonthTip(months: number, fallback: string): string {
  if (MONTH_TIPS[months]) return MONTH_TIPS[months];
  for (let m = months - 1; m >= 0; m--) {
    if (MONTH_TIPS[m]) return MONTH_TIPS[m];
  }
  return fallback;
}

function findWindow(months: number): WakeWindow {
  return (
    WAKE_WINDOWS.find((w) => months >= w.minMonths && months <= w.maxMonths) ??
    WAKE_WINDOWS[WAKE_WINDOWS.length - 1]
  );
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const mm = ((total % 60) + 60) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatKoreanTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hh}:${String(m).padStart(2, '0')}`;
}

function formatHourMinute(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

const NAP_LABELS = ['낮잠 01', '낮잠 02', '낮잠 03', '낮잠 04', '낮잠 05'];

const SCHEDULE_COLORS = {
  wake: '#FEC851', // yellow04
  nap: '#3078C9', // primary teal
  night: '#AF52DE', // purple
} as const;

const WHITE_NOISE_SOUNDS = [
  { id: 'wind', label: '사운드 01', name: '고요한 바람', iconSrc: '/icon-sound-wind.svg' },
  { id: 'wave', label: '사운드 02', name: '잔잔한 파도', iconSrc: '/icon-sound-wave.svg' },
  { id: 'melody', label: '사운드 03', name: '편안한 선율', iconSrc: '/icon-sound-note.svg' },
];

export default function SleepGoldenTimeClient() {
  const { children, isLoaded, selectedChild, selectChild } = useSelectedChild();
  const [manualMonths, setManualMonths] = useState<number | null>(null);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [hour12, setHour12] = useState<number>(7);
  const [minute, setMinute] = useState<number>(0);
  const [selectedSound, setSelectedSound] = useState<string>('wind');

  // 전역으로 유지되는 선택 아이 사용(없으면 훅이 첫 아이로 폴백)
  const effectiveChild = selectedChild;

  const calculatedMonths = effectiveChild
    ? getAgeInMonths(effectiveChild.birthDate)
    : 6;
  const ageMonths = manualMonths ?? calculatedMonths;
  const wakeWindow = useMemo(() => findWindow(ageMonths), [ageMonths]);
  const stageNumber = wakeWindow.label.replace(/개월$/, '');

  const morningWake = useMemo(() => {
    let h = hour12 % 12;
    if (period === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }, [period, hour12, minute]);

  const schedule = useMemo(() => {
    const wakeWin = Math.round((wakeWindow.wakeMin + wakeWindow.wakeMax) / 2);
    const napDur = Math.round((wakeWindow.napDurMin + wakeWindow.napDurMax) / 2);
    const naps: { start: string; end: string; wakeBefore: number; durMin: number }[] = [];
    let cur = morningWake;
    for (let i = 0; i < wakeWindow.napCount; i++) {
      const start = addMinutes(cur, wakeWin);
      const dur = i === wakeWindow.napCount - 1 && wakeWindow.napCount >= 3
        ? Math.max(30, Math.round(napDur / 2))
        : napDur;
      const end = addMinutes(start, dur);
      naps.push({ start, end, wakeBefore: wakeWin, durMin: dur });
      cur = end;
    }
    const bedtime = addMinutes(cur, wakeWin);

    const segments: { startMin: number; endMin: number; type: 'night' | 'awake' | 'nap' }[] = [];
    const morningMin = toMinutes(morningWake);
    const bedtimeMin = toMinutes(bedtime);
    if (morningMin > 0) segments.push({ startMin: 0, endMin: morningMin, type: 'night' });
    let prev = morningMin;
    naps.forEach((n) => {
      const s = toMinutes(n.start);
      const e = toMinutes(n.end);
      if (s > prev) segments.push({ startMin: prev, endMin: s, type: 'awake' });
      segments.push({ startMin: s, endMin: e, type: 'nap' });
      prev = e;
    });
    if (bedtimeMin > prev) segments.push({ startMin: prev, endMin: bedtimeMin, type: 'awake' });
    if (bedtimeMin < 1440) segments.push({ startMin: bedtimeMin, endMin: 1440, type: 'night' });

    return { naps, bedtime, wakeWin, segments };
  }, [morningWake, wakeWindow]);

  if (!isLoaded) return null;

  return (
    <>
      <PageHeader title="수면추천" variant="back" />

      <main className="flex flex-col gap-[16px] px-5 pt-1 pb-8">
        {/* 아기 정보 카드 — 자동 선택, 다중 등록 시 드롭다운으로 전환 */}
        {effectiveChild ? (
          <ChildSelector
            children={children}
            selected={effectiveChild}
            onSelect={selectChild}
          />
        ) : null}

        {/* 월령 선택 + 수면 단계 / 권장 낮잠 (10px 간격으로 묶음) */}
        <div className="flex flex-col gap-[10px]">
          {/* 월령 드롭다운 */}
          <div className="relative">
            <select
              value={ageMonths}
              onChange={(e) => setManualMonths(Number(e.target.value))}
              className="w-full appearance-none bg-white border border-gray-200 rounded-lg pl-4 pr-10 py-3 text-[14px] font-normal text-black focus:outline-none focus:border-primary-500"
              aria-label="월령 선택"
            >
              {Array.from({ length: 37 }, (_, i) => i).map((m) => (
                <option key={m} value={m}>{m}개월</option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* 수면 단계 / 권장 낮잠 */}
          <div className="grid grid-cols-2 gap-[10px]">
            <StatCard label="수면 단계" value={stageNumber} unit="개월" />
            <StatCard label="권장 낮잠" value={String(wakeWindow.napCount)} unit="회" />
          </div>
        </div>

        {/* 기상 시간 */}
        <section className="flex flex-col gap-[10px]">
          <h2 className="text-[14px] font-semibold text-black">기상 시간</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-stretch gap-[12px]">
            <div className="flex flex-col gap-[4px] shrink-0">
              {(['AM', 'PM'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`w-10 h-6 rounded-lg text-[12px] transition-colors ${
                    period === p
                      ? 'bg-primary-500 text-white font-medium'
                      : 'bg-gray-200 text-gray-500 font-normal'
                  }`}
                >
                  {p === 'AM' ? '오전' : '오후'}
                </button>
              ))}
            </div>
            <Stepper
              value={hour12}
              onMinus={() => setHour12((h) => (h === 1 ? 12 : h - 1))}
              onPlus={() => setHour12((h) => (h === 12 ? 1 : h + 1))}
              format={(v) => String(v)}
            />
            <Stepper
              value={minute}
              onMinus={() => setMinute((m) => (m - 5 + 60) % 60)}
              onPlus={() => setMinute((m) => (m + 5) % 60)}
              format={(v) => String(v).padStart(2, '0')}
            />
          </div>
        </section>

        {/* 월령 수면 TIP */}
        <section className="bg-[#FFCC00]/5 rounded-lg p-3">
          <p className="text-[12px] font-semibold text-black mb-[8px]">{ageMonths}개월 수면 TIP</p>
          <p className="text-[12px] font-normal text-black">
            {getMonthTip(ageMonths, wakeWindow.tip)}
          </p>
        </section>

        {/* 하루 일과 한 눈에 보기 — 차트 영역 + 타임라인 영역 (white bg) */}
        <section className="flex flex-col gap-[10px]">
          <h2 className="text-[14px] font-semibold text-black">하루 일과 한 눈에 보기</h2>

          {/* 24h 바 차트 영역 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex h-[10px] rounded-[100px] overflow-hidden bg-gray-100">
              {schedule.segments.map((s, i) => {
                const pct = ((s.endMin - s.startMin) / 1440) * 100;
                const cls =
                  s.type === 'night'
                    ? 'bg-primary-500'
                    : s.type === 'nap'
                    ? 'bg-primary-200'
                    : 'bg-transparent';
                return <div key={i} className={cls} style={{ width: `${pct}%` }} />;
              })}
            </div>
            <div className="flex justify-between text-[10px] font-normal text-gray-500 mt-[4px] px-0.5 tabular-nums">
              <span>0</span>
              <span>6</span>
              <span>12</span>
              <span>18</span>
              <span>24</span>
            </div>
            <div className="flex gap-[12px] mt-[12px] justify-end">
              <div className="flex items-center gap-[6px]">
                <span className="w-2 h-2 rounded-[2px] bg-primary-200" />
                <span className="text-[12px] font-normal text-black">낮잠</span>
              </div>
              <div className="flex items-center gap-[6px]">
                <span className="w-2 h-2 rounded-[2px] bg-primary-500" />
                <span className="text-[12px] font-normal text-black">밤잠</span>
              </div>
            </div>
          </div>

          {/* 수면 일정 타임라인 영역 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="relative">
              <div className="absolute left-[19px] top-5 bottom-6 w-px bg-gray-100" />

              {/* 기상 */}
              <ScheduleRow
                iconSrc="/icon-sleep-wake.svg"
                iconAlt="기상"
                color={SCHEDULE_COLORS.wake}
                label="기상"
                time={formatKoreanTime(morningWake)}
                caption="하루 시작"
              />

              {/* 낮잠 */}
              {schedule.naps.map((nap, idx) => {
                const isLastNap = idx === schedule.naps.length - 1 && schedule.naps.length >= 2;
                return (
                  <ScheduleRow
                    key={idx}
                    iconSrc={isLastNap ? '/icon-sleep-cat-nap.svg' : '/icon-sleep-nap.svg'}
                    iconAlt={isLastNap ? '마지막 낮잠' : '낮잠'}
                    color={SCHEDULE_COLORS.nap}
                    label={NAP_LABELS[idx] ?? `낮잠 ${String(idx + 1).padStart(2, '0')}`}
                    time={`${formatKoreanTime(nap.start)} - ${formatKoreanTime(nap.end)}`}
                    caption={`약 ${nap.durMin}분  |  깨어있던 시간 ${formatHourMinute(nap.wakeBefore)}`}
                  />
                );
              })}

              {/* 밤잠 */}
              <ScheduleRow
                iconSrc="/icon-sleep-night.svg"
                iconAlt="밤잠"
                color={SCHEDULE_COLORS.night}
                label="밤잠 추천 시간"
                time={formatKoreanTime(schedule.bedtime)}
                caption={`권장 시간대 ${wakeWindow.bedtimeMin} - ${wakeWindow.bedtimeMax}`}
                isLast
              />
            </div>
          </div>
        </section>

        {/* 백색소음 */}
        <section className="flex flex-col gap-[10px]">
          <h2 className="text-[14px] font-semibold text-black">백색소음</h2>
          <div className="grid grid-cols-3 gap-[10px]">
            {WHITE_NOISE_SOUNDS.map((s) => {
              const isSelected = selectedSound === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSound(s.id)}
                  className={`h-[108px] border rounded-lg p-3 flex flex-col items-center transition-colors ${
                    isSelected
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-gray-200 bg-white'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="w-10 h-10 border border-primary-500 rounded-[24px] flex items-center justify-center bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.iconSrc} alt={s.name} width={24} height={24} />
                  </div>
                  <p className="mt-[10px] text-[16px] font-medium text-black leading-none">{s.label}</p>
                  <p className="mt-[6px] text-[12px] font-normal text-gray-500 leading-none">{s.name}</p>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-gray-100 border border-gray-200 rounded-lg py-[10px] px-[12px] flex flex-col gap-[10px]">
      <p className="text-[12px] font-normal text-black leading-none">{label}</p>
      <p className="text-right leading-none">
        <span className="text-[32px] font-bold text-primary-500 tabular-nums leading-none">{value}</span>
        <span className="text-[12px] font-normal text-gray-500 ml-1 align-baseline">{unit}</span>
      </p>
    </div>
  );
}

function Stepper({
  value,
  onMinus,
  onPlus,
  format,
}: {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  format: (v: number) => string;
}) {
  return (
    <div className="flex-1 flex items-stretch justify-center gap-[10px]">
      <button
        type="button"
        onClick={onMinus}
        className="h-full w-9 rounded-lg bg-gray-100 flex items-center justify-center active:bg-gray-200"
        aria-label="감소"
      >
        <MinusIcon />
      </button>
      <span className="text-[32px] font-black text-black tabular-nums min-w-9 text-center leading-none self-center">
        {format(value)}
      </span>
      <button
        type="button"
        onClick={onPlus}
        className="h-full w-9 rounded-lg bg-gray-100 flex items-center justify-center active:bg-gray-200"
        aria-label="증가"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

function MinusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="3" y1="8" x2="13" y2="8" stroke="#515C66" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="3" y1="8" x2="13" y2="8" stroke="#515C66" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8" y1="3" x2="8" y2="13" stroke="#515C66" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ScheduleRow({
  iconSrc,
  iconAlt,
  color,
  label,
  time,
  caption,
  isLast,
}: {
  iconSrc: string;
  iconAlt: string;
  color: string;
  label: string;
  time: string;
  caption: string;
  isLast?: boolean;
}) {
  return (
    <div className={`flex items-start gap-[16px] relative ${isLast ? '' : 'mb-[24px]'}`}>
      <div
        className="w-10 h-10 rounded-[24px] flex items-center justify-center bg-white shrink-0 z-10"
        style={{ border: `1px solid ${color}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} alt={iconAlt} width={24} height={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium leading-none" style={{ color }}>{label}</p>
        <p className="text-[16px] font-bold text-black tabular-nums leading-none mt-[4px]">{time}</p>
        <p className="text-[10px] font-normal text-gray-500 leading-none mt-[4px]">{caption}</p>
      </div>
    </div>
  );
}

