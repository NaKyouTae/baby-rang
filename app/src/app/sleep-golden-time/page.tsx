'use client';

import { useMemo, useState } from 'react';
import { useChildren, type Child } from '@/hooks/useChildren';
import ChildSelector from '@/components/ChildSelector';
import { calcChildAge } from '@/lib/childAge';

// 월령 계산 (KST 기준, 공통 함수 사용)
function getAgeInMonths(birthDate: string): number {
  return calcChildAge(birthDate).months;
}

type WakeWindow = {
  label: string;
  minMonths: number;
  maxMonths: number;
  wakeMin: number; // minutes (wake window 최소)
  wakeMax: number; // minutes (wake window 최대)
  bedtimeMin: string; // HH:MM
  bedtimeMax: string;
  napCount: number; // 권장 낮잠 횟수
  napDurMin: number; // 낮잠 길이 최소 (분)
  napDurMax: number; // 낮잠 길이 최대 (분)
  tip: string;
};

const WAKE_WINDOWS: WakeWindow[] = [
  { label: '0–2개월', minMonths: 0, maxMonths: 2, wakeMin: 45, wakeMax: 60, bedtimeMin: '18:00', bedtimeMax: '19:00', napCount: 5, napDurMin: 30, napDurMax: 120, tip: '신생아는 5회 이상 짧은 낮잠이 일반적이에요. 깨어있는 시간이 1시간을 넘지 않도록 주의하세요.' },
  { label: '3–4개월', minMonths: 3, maxMonths: 4, wakeMin: 75, wakeMax: 105, bedtimeMin: '18:00', bedtimeMax: '19:00', napCount: 4, napDurMin: 45, napDurMax: 90, tip: '4개월 수면 퇴행기일 수 있어요. 4회 낮잠으로 일관된 루틴을 유지하세요.' },
  { label: '5–6개월', minMonths: 5, maxMonths: 6, wakeMin: 105, wakeMax: 135, bedtimeMin: '18:00', bedtimeMax: '19:30', napCount: 3, napDurMin: 60, napDurMax: 90, tip: '3회 낮잠으로 안정화되는 시기예요.' },
  { label: '7–9개월', minMonths: 7, maxMonths: 9, wakeMin: 135, wakeMax: 180, bedtimeMin: '18:30', bedtimeMax: '19:30', napCount: 3, napDurMin: 60, napDurMax: 90, tip: '3회 낮잠 전환기입니다. 마지막 낮잠은 짧은 \'cat nap\'으로 충분합니다.' },
  { label: '10–14개월', minMonths: 10, maxMonths: 14, wakeMin: 180, wakeMax: 240, bedtimeMin: '19:00', bedtimeMax: '20:00', napCount: 2, napDurMin: 60, napDurMax: 90, tip: '오전·오후 2회 낮잠이 안정화되는 시기예요.' },
  { label: '15–17개월', minMonths: 15, maxMonths: 17, wakeMin: 240, wakeMax: 300, bedtimeMin: '19:00', bedtimeMax: '20:00', napCount: 2, napDurMin: 60, napDurMax: 120, tip: '2회에서 1회 낮잠으로 넘어가는 전환기예요. 컨디션에 따라 유연하게 조절하세요.' },
  { label: '18–36개월', minMonths: 18, maxMonths: 36, wakeMin: 300, wakeMax: 360, bedtimeMin: '19:30', bedtimeMax: '20:30', napCount: 1, napDurMin: 60, napDurMax: 120, tip: '점심 후 1회 낮잠이 적당합니다. 너무 늦게 자면 밤잠에 영향을 줄 수 있어요.' },
];

// 월령별 세부 팁 (개월 → 팁)
const MONTH_TIPS: Record<number, string> = {
  0: '신생아는 낮밤 구분이 없어요. 밤에는 조명을 어둡게, 낮에는 자연광을 쐬어주세요.',
  1: '수유 텀이 짧아요. 졸음 신호(눈 비비기·하품·먼 곳 응시)를 놓치지 마세요.',
  2: '낮밤 구분이 시작되는 시기예요. 일관된 취침 루틴을 만들기 좋아요.',
  3: '수면 패턴이 점차 안정돼요. 같은 시간 잠자리에 들이는 연습을 시작해보세요.',
  4: '4개월 수면 퇴행기예요. 수면 사이클이 성인과 비슷해지며 자주 깰 수 있어요. 4회 낮잠으로 일관된 루틴을 유지하세요.',
  5: '뒤집기가 시작되며 자다 깰 수 있어요. 안전한 수면 환경(빈 침대, 단단한 매트리스)을 점검하세요.',
  6: '이유식이 시작되고 밤중 수유를 줄일 수 있는 시기예요. 패턴이 일시적으로 흔들릴 수 있어요.',
  7: '분리불안이 시작돼요. 잠들기 전 충분한 안정감과 일관된 루틴을 주세요.',
  8: '8개월 수면 퇴행기예요. 분리불안 + 발달 폭발(기기·서기)로 자주 깰 수 있어요.',
  9: '기어다니기·서기 연습으로 잠자리에서 움직임이 많아져요. 안전한 잠자리를 유지하세요.',
  10: '발달 도약기예요. 잠자리에서 일어서는 연습을 할 수 있는데, 차분히 다시 눕혀주세요.',
  11: '첫 낮잠을 거부할 수 있어요. 아직 2회 낮잠 유지가 좋습니다. 너무 빨리 1회로 줄이지 마세요.',
  12: '12개월 수면 퇴행기예요. 첫 걸음마와 함께 일시적으로 흐트러질 수 있어요.',
  13: '낮잠 전환을 서두르지 마세요. 아직 2회 낮잠이 필요할 수 있어요.',
  14: '2→1회 낮잠 전환 신호(낮잠 거부, 늦게 잠들기)가 나타나는지 관찰하세요.',
  15: '1회 낮잠 전환 시기예요. 충분히 졸려할 때 시도하고, 점심 직후가 적당합니다.',
  16: '낮잠 1회로 안정화되는 시기예요. 12:30–14:30 사이 시작이 이상적입니다.',
  17: '1회 낮잠이 짧다면 일시적으로 2회로 돌아가도 괜찮아요. 컨디션에 맞춰 유연하게 조절하세요.',
  18: '18개월 수면 퇴행기예요. 자아가 강해지며 수면 거부·취침 시간 협상이 나타날 수 있어요. 일관성을 유지하세요.',
  19: '1회 낮잠 안정기예요. 너무 늦은 낮잠(15시 이후)은 밤잠을 방해할 수 있어요.',
  24: '24개월(2세) 수면 퇴행기예요. 악몽·분리불안·상상력 발달로 잠자리 거부가 있을 수 있어요. 야간등을 준비해주세요.',
  30: '낮잠을 거부하기 시작할 수 있어요. 아직 1회 낮잠이 필요한 시기이니 \'조용한 시간(quiet time)\'으로 유도해보세요.',
  36: '낮잠을 졸업하는 아이들이 늘어나는 시기예요. 낮잠을 안 자는 날은 밤잠을 30분 일찍 시작하세요.',
};

function getMonthTip(months: number, fallback: string): string {
  // 정확히 일치하는 월령이 있으면 우선 사용
  if (MONTH_TIPS[months]) return MONTH_TIPS[months];
  // 가장 가까운 작은 월령의 팁 사용 (단, 같은 stage 안에서만)
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

export default function SleepGoldenTimePage() {
  const { children, isLoaded } = useChildren();
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [manualMonths, setManualMonths] = useState<number>(6);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [hour12, setHour12] = useState<number>(7);
  const [minute, setMinute] = useState<number>(0);

  // 아이가 1명이면 자동 선택 (선택 화면 없이)
  const effectiveChild =
    selectedChild ?? (children.length === 1 ? children[0] : null);

  const ageMonths = effectiveChild
    ? getAgeInMonths(effectiveChild.birthDate)
    : manualMonths;
  const wakeWindow = useMemo(() => findWindow(ageMonths), [ageMonths]);

  const morningWake = useMemo(() => {
    let h = hour12 % 12;
    if (period === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }, [period, hour12, minute]);

  // 낮잠 스케줄 생성
  const schedule = useMemo(() => {
    const wakeWin = Math.round((wakeWindow.wakeMin + wakeWindow.wakeMax) / 2);
    const napDur = Math.round((wakeWindow.napDurMin + wakeWindow.napDurMax) / 2);
    const naps: { start: string; end: string; wakeBefore: number }[] = [];
    let cur = morningWake;
    for (let i = 0; i < wakeWindow.napCount; i++) {
      const start = addMinutes(cur, wakeWin);
      // 마지막 낮잠은 cat nap (짧게)
      const dur = i === wakeWindow.napCount - 1 && wakeWindow.napCount >= 3
        ? Math.max(30, Math.round(napDur / 2))
        : napDur;
      const end = addMinutes(start, dur);
      naps.push({ start, end, wakeBefore: wakeWin });
      cur = end;
    }
    const bedtime = addMinutes(cur, wakeWin);

    // 24h 타임라인 세그먼트 (0:00 ~ 24:00)
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 bg-gray-50 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-3">
        {children.length > 0 && effectiveChild ? (
          <ChildSelector
            children={children}
            selected={effectiveChild}
            onSelect={setSelectedChild}
          />
        ) : (
          <div className="relative inline-block">
            <select
              value={manualMonths}
              onChange={(e) => setManualMonths(Number(e.target.value))}
              className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-full pl-4 pr-8 py-1.5 shadow-sm appearance-none"
              aria-label="개월 수 선택"
            >
              {Array.from({ length: 37 }, (_, i) => i).map((m) => (
                <option key={m} value={m}>
                  {m}개월
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}
      </div>

      <main className="px-4">
      {/* 수면 단계 요약 */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3.5 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-2xl">
            🌙
          </div>
          <div>
            <p className="text-[10px] text-gray-400 leading-none mb-1">수면 단계</p>
            <p className="text-sm font-bold text-gray-900">{wakeWindow.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 leading-none">권장 낮잠</p>
          <p className="text-2xl font-extrabold text-primary-600 leading-tight">{wakeWindow.napCount}<span className="text-xs font-bold text-gray-400 ml-0.5">회</span></p>
        </div>
      </div>

      {/* 기상 시간 stepper */}
      <section className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">☀️ 아침 기상 시간</p>
          <div className="flex bg-gray-100 rounded-full p-0.5">
            {(['AM', 'PM'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  period === p ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400'
                }`}
              >
                {p === 'AM' ? '오전' : '오후'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHour12((h) => (h === 1 ? 12 : h - 1))}
              className="w-9 h-9 rounded-full bg-gray-50 active:bg-gray-200 text-xl text-gray-500 font-bold flex items-center justify-center"
            >
              −
            </button>
            <div className="w-14 text-center">
              <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{hour12}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">시</p>
            </div>
            <button
              onClick={() => setHour12((h) => (h === 12 ? 1 : h + 1))}
              className="w-9 h-9 rounded-full bg-gray-50 active:bg-gray-200 text-xl text-gray-500 font-bold flex items-center justify-center"
            >
              +
            </button>
          </div>
          <span className="text-2xl text-gray-200 font-bold">:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMinute((m) => (m - 5 + 60) % 60)}
              className="w-9 h-9 rounded-full bg-gray-50 active:bg-gray-200 text-xl text-gray-500 font-bold flex items-center justify-center"
            >
              −
            </button>
            <div className="w-14 text-center">
              <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{String(minute).padStart(2, '0')}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">분</p>
            </div>
            <button
              onClick={() => setMinute((m) => (m + 5) % 60)}
              className="w-9 h-9 rounded-full bg-gray-50 active:bg-gray-200 text-xl text-gray-500 font-bold flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      </section>

      {/* 24시간 타임라인 바 */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-5 mb-4 text-white shadow-lg">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-70">Today&apos;s rhythm</p>
            <p className="text-base font-bold mt-0.5">하루 한눈에 보기</p>
          </div>
          <p className="text-[10px] opacity-70">총 24시간</p>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden bg-white/10 ring-1 ring-white/20">
          {schedule.segments.map((s, i) => {
            const pct = ((s.endMin - s.startMin) / 1440) * 100;
            const cls =
              s.type === 'night'
                ? 'bg-indigo-950'
                : s.type === 'nap'
                ? 'bg-purple-300'
                : 'bg-amber-200';
            return <div key={i} className={cls} style={{ width: `${pct}%` }} />;
          })}
        </div>
        <div className="flex justify-between text-[9px] opacity-60 mt-1.5 px-0.5">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
        <div className="flex gap-3 mt-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-200" />
            <span className="opacity-80">활동</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-300" />
            <span className="opacity-80">낮잠</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-950 ring-1 ring-white/40" />
            <span className="opacity-80">밤잠</span>
          </div>
        </div>
      </section>

      {/* 수직 타임라인 */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <p className="text-sm font-bold text-gray-900 mb-4">📅 오늘의 수면 일정</p>
        <div className="relative">
          {/* 타임라인 세로선 */}
          <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-amber-300 via-purple-300 to-indigo-400" />

          {/* 기상 */}
          <div className="flex items-start gap-3 mb-5 relative">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg shrink-0 z-10 ring-4 ring-white">
              ☀️
            </div>
            <div className="flex-1 pt-1">
              <p className="text-[11px] text-amber-600 font-semibold">아침 기상</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{formatKoreanTime(morningWake)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">하루 시작</p>
            </div>
          </div>

          {/* 낮잠들 */}
          {schedule.naps.map((nap, idx) => {
            const labels = ['첫', '두 번째', '세 번째', '네 번째', '다섯 번째'];
            const isCatNap = idx === schedule.naps.length - 1 && schedule.naps.length >= 3;
            const durMin = toMinutes(nap.end) - toMinutes(nap.start);
            return (
              <div key={idx} className="flex items-start gap-3 mb-5 relative">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg shrink-0 z-10 ring-4 ring-white">
                  {isCatNap ? '😺' : '💤'}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] text-purple-600 font-semibold">{labels[idx] ?? `${idx + 1}번째`} 낮잠</p>
                    {isCatNap && (
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">CAT NAP</span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-gray-900 leading-tight tabular-nums">
                    {formatKoreanTime(nap.start)} <span className="text-gray-300 mx-0.5">→</span> {formatKoreanTime(nap.end)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">약 {durMin}분 · 깨어있던 시간 {Math.round(schedule.wakeWin / 60 * 10) / 10}h</p>
                </div>
              </div>
            );
          })}

          {/* 밤잠 (수면코칭) */}
          <div className="flex items-start gap-3 relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg shrink-0 z-10 ring-4 ring-white shadow-md">
              🌙
            </div>
            <div className="flex-1 pt-1">
              <p className="text-[11px] text-indigo-600 font-semibold">밤잠 추천 시간</p>
              <p className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight tabular-nums">
                {formatKoreanTime(schedule.bedtime)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">권장 시간대 {wakeWindow.bedtimeMin} – {wakeWindow.bedtimeMax}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 월령 팁 */}
      <section className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 flex gap-3">
        <span className="text-xl shrink-0">💡</span>
        <p className="text-xs text-amber-800 leading-relaxed flex-1">
          <span className="font-bold">{ageMonths}개월 · </span>
          {getMonthTip(ageMonths, wakeWindow.tip)}
        </p>
      </section>

      {/* 수면코칭 정보 (접힘 가능) */}
      <details className="bg-white rounded-2xl shadow-sm overflow-hidden group">
        <summary className="p-4 cursor-pointer flex items-center justify-between list-none">
          <span className="text-sm font-bold text-gray-900">수면코칭이란?</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-open:rotate-180 transition-transform">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="px-4 pb-4 -mt-1">
          <p className="text-xs text-gray-500 leading-relaxed mb-3">
            멜라토닌이 가장 잘 분비되는 시간대에 잠들면 깊은 수면에 쉽게 들어갈 수 있어요.
            이 시간을 놓치면 코르티솔(각성 호르몬)이 다시 올라가는 &quot;second wind&quot; 현상으로 잠들기 어려워집니다.
          </p>
          <ul className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
            <li>• 멜라토닌은 해 진 뒤 1–2시간 후부터 분비가 시작돼요</li>
            <li>• 취침 30분 전부터 조명을 어둡게 하고 차분한 루틴을 시작하세요</li>
            <li>• 자극적인 놀이·화면 노출은 피해주세요</li>
          </ul>
        </div>
      </details>
      </main>
    </div>
  );
}
