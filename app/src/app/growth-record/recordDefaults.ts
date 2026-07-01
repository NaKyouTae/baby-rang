import { GrowthType, GrowthRecord, TYPE_CONFIG } from './types';

const BABYFOOD_UNIT_KEY = 'baby-rang:settings:babyfood-default-unit';
const DIAPER_KIND_KEY = 'baby-rang:settings:diaper-default-kind';
const SLEEP_NIGHT_RANGE_KEY = 'baby-rang:settings:sleep-night-range';
const QUICK_TYPES_KEY = 'baby-rang:settings:quick-types';
const DAYS_CACHE_PREFIX = 'baby-rang:cache:growth-days:';

export type BabyFoodUnit = 'ml' | 'g';
export type DiaperKind = 'PEE' | 'POO' | 'BOTH';
export interface SleepNightRange {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

const DEFAULT_BABYFOOD_UNIT: BabyFoodUnit = 'ml';
const DEFAULT_DIAPER_KIND: DiaperKind = 'PEE';
const DEFAULT_SLEEP_NIGHT_RANGE: SleepNightRange = { start: '19:00', end: '07:00' };

function safeRead(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

export function getBabyFoodDefaultUnit(): BabyFoodUnit {
  const raw = safeRead(BABYFOOD_UNIT_KEY);
  return raw === 'g' || raw === 'ml' ? raw : DEFAULT_BABYFOOD_UNIT;
}

export function setBabyFoodDefaultUnit(unit: BabyFoodUnit) {
  safeWrite(BABYFOOD_UNIT_KEY, unit);
}

export function getDiaperDefaultKind(): DiaperKind {
  const raw = safeRead(DIAPER_KIND_KEY);
  return raw === 'PEE' || raw === 'POO' || raw === 'BOTH' ? raw : DEFAULT_DIAPER_KIND;
}

export function setDiaperDefaultKind(kind: DiaperKind) {
  safeWrite(DIAPER_KIND_KEY, kind);
}

function isValidHHMM(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function getSleepNightRange(): SleepNightRange {
  const raw = safeRead(SLEEP_NIGHT_RANGE_KEY);
  if (!raw) return DEFAULT_SLEEP_NIGHT_RANGE;
  try {
    const parsed = JSON.parse(raw) as Partial<SleepNightRange>;
    if (
      typeof parsed.start === 'string' &&
      typeof parsed.end === 'string' &&
      isValidHHMM(parsed.start) &&
      isValidHHMM(parsed.end)
    ) {
      return { start: parsed.start, end: parsed.end };
    }
  } catch {
    /* fallthrough */
  }
  return DEFAULT_SLEEP_NIGHT_RANGE;
}

export function setSleepNightRange(range: SleepNightRange) {
  safeWrite(SLEEP_NIGHT_RANGE_KEY, JSON.stringify(range));
}

/** 기록 빠른 버튼(quick types) 마지막 저장값 캐시 — 메뉴 진입 시 깜빡임 방지 */
export function getCachedQuickTypes(): string[] | null {
  const raw = safeRead(QUICK_TYPES_KEY);
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.every((x) => typeof x === 'string')) {
      return arr as string[];
    }
  } catch {
    /* noop */
  }
  return null;
}

export function setCachedQuickTypes(types: string[]) {
  safeWrite(QUICK_TYPES_KEY, JSON.stringify(types));
}

export interface CachedDayGroup {
  date: string;
  records: GrowthRecord[];
}

/** 기록 리스트 첫 페이지 캐시(아이별) — 메뉴 진입 시 깜빡임 방지 */
export function getCachedDays(childId: string): CachedDayGroup[] | null {
  const raw = safeRead(DAYS_CACHE_PREFIX + childId);
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (
      Array.isArray(arr) &&
      arr.every(
        (g) =>
          g &&
          typeof g.date === 'string' &&
          Array.isArray((g as CachedDayGroup).records),
      )
    ) {
      return arr as CachedDayGroup[];
    }
  } catch {
    /* noop */
  }
  return null;
}

export function setCachedDays(childId: string, days: CachedDayGroup[]) {
  safeWrite(DAYS_CACHE_PREFIX + childId, JSON.stringify(days));
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 자정을 넘기는 범위(start > end)도 처리. end는 미포함. */
export function isWithinNightRange(
  hour: number,
  minute: number,
  range: SleepNightRange = getSleepNightRange(),
): boolean {
  const now = hour * 60 + minute;
  const start = hhmmToMinutes(range.start);
  const end = hhmmToMinutes(range.end);
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

/**
 * 빠른 버튼으로 기록을 즉시 생성할 때 저장할 기본 data(JSON) 값.
 * EntrySheet를 새 기록으로 열고 곧바로 저장했을 때와 동일한 결과를 만든다.
 * (숫자/텍스트 필드는 값이 없으면 저장에서 생략되므로 여기서도 제외)
 */
export function buildDefaultRecordData(type: GrowthType): Record<string, unknown> {
  if (type === 'PUMPING') {
    return { pumpingMode: 'LR', volumeMode: 'LR' };
  }

  const cfg = TYPE_CONFIG[type];
  const data: Record<string, unknown> = {};
  const now = new Date();

  cfg.fields.forEach((f) => {
    if (type === 'SLEEP' && f.key === 'kind') {
      data.kind = isWithinNightRange(now.getHours(), now.getMinutes())
        ? 'NIGHT'
        : 'NAP';
      return;
    }
    if (type === 'DIAPER' && f.key === 'kind') {
      data.kind = getDiaperDefaultKind();
      return;
    }
    if (f.kind === 'segmented' && f.options && f.options.length > 0) {
      data[f.key] = f.options[0].value;
    }
  });

  return data;
}
