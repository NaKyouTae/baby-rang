// 기록 요약 집계. 화면(ClinicSummaryScreen)과 떼어 둔 순수 함수다.
//
// 기준
// - 24시간: 지금부터 직전 24시간.
// - 3일·7일: 오늘을 포함한 달력 날짜(KST) 첫날 00:00 부터 지금까지.
// - 하루 평균은 "조회 시작부터 지금까지 지난 시간(일)" 으로 나눈다. 오늘은 아직 끝나지 않아
//   날짜 수(3·7)로 나누면 평균이 낮게 나온다.
// - 체온·투약·병원은 평균이 아니라 기간 안의 실제 기록을 보여준다.
// - 항목에 기록이 하나도 없으면 0 이 아니라 null(기록 없음)이다.
import type { GrowthRecord } from '@/app/growth-record/types';

export type ClinicPeriod = '24h' | 3 | 7;

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const KST = 9 * HOUR;

/** 이 이상이면 발열로 센다(℃). */
export const FEVER_C = 38;

/** 해열제로 볼 약 이름(보호자가 적은 이름이라 포함 여부만 본다). */
const ANTIPYRETIC = /해열|타이레놀|아세트아미노펜|세토펜|챔프|부루펜|이부프로펜|맥시부펜|덱시부프로펜|브루펜/i;

/** KST 달력일 YYYY-MM-DD */
export function kstYmd(t: number) {
  return new Date(t + KST).toISOString().slice(0, 10);
}

/** 조회 구간 [start, end). end 는 지금. */
export function periodWindow(period: ClinicPeriod, now = Date.now()) {
  if (period === '24h') return { start: now - DAY, end: now };
  const today = kstYmd(now);
  const startOfToday = Date.parse(`${today}T00:00:00+09:00`);
  return { start: startOfToday - (period - 1) * DAY, end: now };
}

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const dataOf = (r: GrowthRecord) => (r.data ?? {}) as Record<string, unknown>;
const at = (r: GrowthRecord) => new Date(r.startAt).getTime();

export interface ClinicSummary {
  /** 하루 평균을 낼 때 나눈 일수(지난 시간 기준, 소수). 24시간은 1. */
  days: number;
  feed: null | {
    count: number;
    breastCount: number;
    breastMin: number;
    bottleCount: number;
    bottleMl: number;
    /** 연속된 수유 사이 실제 간격의 평균(분). 수유가 2번 미만이면 null. */
    avgGapMin: number | null;
    babyFoodCount: number;
    babyFoodG: number;
    babyFoodMl: number;
  };
  sleep: null | {
    totalMin: number;
    napMin: number;
    nightMin: number;
    /** 끝나지 않은 수면이 있다(지금까지로 셈). */
    ongoing: boolean;
  };
  diaper: null | { pee: number; poo: number };
  temp: null | {
    max: number;
    maxAt: string;
    /** 발열(FEVER_C 이상) 기록이 있는 KST 날짜 수 */
    feverDays: number;
    fevers: { at: string; c: number }[];
  };
  meds: { at: string; name: string; dose: string; antipyretic: boolean }[];
  hospital: { at: string; text: string }[];
}

/**
 * records 는 window 보다 넉넉히 받아 온 기록이어도 된다(앞날 밤잠을 잘라 넣으려고 하루 더 받는다).
 * 기간 경계에 걸친 수면은 기간 안에 든 시간만 센다.
 */
export function summarizeClinic(records: GrowthRecord[], period: ClinicPeriod, now = Date.now()): ClinicSummary {
  const { start, end } = periodWindow(period, now);
  const days = period === '24h' ? 1 : Math.max((end - start) / DAY, 1 / 24);
  const inWindow = records.filter((r) => {
    const t = at(r);
    return t >= start && t < end;
  });
  const of = (...types: GrowthRecord['type'][]) => inWindow.filter((r) => types.includes(r.type));

  // 먹기 — 같은 종류·같은 시각·같은 양으로 두 번 남은 기록은 한 번으로 센다(연타·동기화 중복)
  const seen = new Set<string>();
  const once = (list: GrowthRecord[]) =>
    list.filter((r) => {
      const k = `${r.type}|${r.startAt}|${JSON.stringify(r.data ?? {})}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  const breast = once(of('BREASTFEEDING'));
  const bottle = once(of('FORMULA', 'PUMPED_FEEDING'));
  const babyFood = once(of('BABY_FOOD'));
  const feeds = [...breast, ...bottle].map(at).sort((a, b) => a - b);
  // 같은 시각에 두 번 적은 기록은 한 번으로 본다(간격 0 제외). 12시간 넘게 빈 간격은 기록 누락으로 본다.
  const gaps = feeds.slice(1).map((t, i) => t - feeds[i]).filter((g) => g > 0 && g <= 12 * HOUR);
  const feed =
    breast.length + bottle.length + babyFood.length === 0
      ? null
      : {
          count: breast.length + bottle.length,
          breastCount: breast.length,
          breastMin: breast.reduce((s, r) => {
            const d = dataOf(r);
            return s + num(d.leftMin) + num(d.rightMin) + (num(d.leftSec) + num(d.rightSec)) / 60;
          }, 0),
          bottleCount: bottle.length,
          bottleMl: bottle.reduce((s, r) => s + num(dataOf(r).amountMl), 0),
          avgGapMin: gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length / 60_000 : null,
          babyFoodCount: babyFood.length,
          babyFoodG: babyFood.reduce((s, r) => {
            const d = dataOf(r);
            if (d.amountUnit === 'g') return s + num(d.amount);
            return s + (d.amount == null ? num(d.amountG) : 0);
          }, 0),
          babyFoodMl: babyFood.reduce((s, r) => {
            const d = dataOf(r);
            if (d.amountUnit === 'g') return s;
            return s + (d.amount != null ? num(d.amount) : num(d.amountMl));
          }, 0),
        };

  // 잠 — 시작이 기간 앞이어도 기간 안에 든 만큼은 센다
  let napMin = 0;
  let nightMin = 0;
  let ongoing = false;
  let sleepSeen = false;
  for (const r of records) {
    if (r.type !== 'SLEEP') continue;
    const s0 = at(r);
    const e0 = r.endAt ? new Date(r.endAt).getTime() : now;
    // 끝을 안 찍고 하루 넘게 지난 기록은 잊은 것으로 보고 넣지 않는다
    if (!r.endAt && now - s0 > DAY) continue;
    const s = Math.max(s0, start);
    const e = Math.min(e0, end);
    if (e <= s) continue;
    sleepSeen = true;
    if (!r.endAt) ongoing = true;
    const m = (e - s) / 60_000;
    if (dataOf(r).kind === 'NIGHT') nightMin += m;
    else napMin += m;
  }
  const sleep = sleepSeen ? { totalMin: napMin + nightMin, napMin, nightMin, ongoing } : null;

  // 배변
  const diapers = of('DIAPER');
  const diaper = diapers.length
    ? {
        pee: diapers.filter((r) => dataOf(r).kind !== 'POO').length,
        poo: diapers.filter((r) => dataOf(r).kind === 'POO' || dataOf(r).kind === 'BOTH').length,
      }
    : null;

  // 체온 — 평균이 아니라 최고값과 그 시각
  const temps = of('TEMPERATURE')
    .map((r) => ({ at: r.startAt, c: num(dataOf(r).tempC) }))
    .filter((t) => t.c > 0);
  const top = temps.reduce<{ at: string; c: number } | null>((m, t) => (!m || t.c > m.c ? t : m), null);
  const fevers = temps.filter((t) => t.c >= FEVER_C).sort((a, b) => b.at.localeCompare(a.at));
  const temp = top
    ? {
        max: top.c,
        maxAt: top.at,
        feverDays: new Set(fevers.map((f) => kstYmd(new Date(f.at).getTime()))).size,
        fevers,
      }
    : null;

  const meds = of('MEDICATION')
    .map((r) => {
      const d = dataOf(r);
      const name = String(d.name ?? r.memo ?? '').trim();
      return { at: r.startAt, name, dose: String(d.dose ?? '').trim(), antipyretic: ANTIPYRETIC.test(name) };
    })
    .sort((a, b) => b.at.localeCompare(a.at));

  const hospital = of('HOSPITAL')
    .map((r) => {
      const d = dataOf(r);
      return {
        at: r.startAt,
        text: [d.place, d.memo, r.memo].filter((v) => typeof v === 'string' && v.trim()).join(' · '),
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));

  return { days, feed, sleep, diaper, temp, meds, hospital };
}
