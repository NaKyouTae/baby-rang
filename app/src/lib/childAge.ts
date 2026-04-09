/**
 * 아이 생년월일 기반 나이 계산 공통 유틸.
 * 화면마다 D+ / 개월수가 어긋나지 않도록 반드시 이 함수를 사용할 것.
 *
 * 규칙:
 * - 모든 날짜 비교는 한국시간(KST, UTC+9) 달력일 기준.
 * - birthDate 입력은 'YYYY-MM-DD', ISO 문자열(any timezone), Date 객체 모두 허용.
 *   ISO 문자열은 KST로 변환 후 달력일만 사용한다.
 * - 출생일 당일 = D+1, 0개월 1일 (한국식: 태어난 날이 1일째).
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface ChildAge {
  /** 출생일 포함 D+일수 (출생일 당일 = 1) */
  days: number;
  /** 개월수 */
  months: number;
  /** 개월수 이후 남은 일수 (출생일 당일/월 응답일 = 1일) */
  extraDays: number;
}

/** 임의의 입력을 KST 달력일(YYYY-MM-DD)로 변환 */
export function toKstYmd(input: string | Date | null | undefined): string {
  if (!input) return '';
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return '';
    return kstYmdFromDate(input);
  }
  const s = String(input).trim();
  if (!s) return '';
  // 이미 YYYY-MM-DD 형식이면 그대로 사용 (timezone shift 없음)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // ISO datetime 등은 KST 기준 달력일로 변환
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    // fallback: 앞 10글자가 YYYY-MM-DD 처럼 보이면 사용
    const head = s.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : '';
  }
  return kstYmdFromDate(d);
}

function kstYmdFromDate(d: Date): string {
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 오늘의 KST 달력일 */
export function todayKstYmd(now: Date = new Date()): string {
  return kstYmdFromDate(now);
}

/** YYYY-MM-DD 를 UTC 자정 Date 로 (비교 전용) */
function ymdToUtcMidnight(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

export function calcChildAge(
  birthDate: string | Date | null | undefined,
  now: Date = new Date(),
): ChildAge {
  const birthYmd = toKstYmd(birthDate);
  const todayYmd = todayKstYmd(now);
  const birth = ymdToUtcMidnight(birthYmd);
  const today = ymdToUtcMidnight(todayYmd);
  if (!birth || !today) return { days: 0, months: 0, extraDays: 0 };

  // 한국식: 태어난 날이 1일째이므로 전체 일수/남은 일수에 +1.
  const rawDays = Math.floor(
    (today.getTime() - birth.getTime()) / 86400000,
  );
  const days = Math.max(1, rawDays + 1);

  let months =
    (today.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - birth.getUTCMonth());
  let extraDays = today.getUTCDate() - birth.getUTCDate();
  if (extraDays < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0),
    ).getUTCDate();
    extraDays += prevMonthLastDay;
  }
  // 태어난 날/월 응답일을 1일로 치는 한국식 카운트
  extraDays += 1;
  if (months < 0) {
    months = 0;
    extraDays = 1;
  }

  return { days, months, extraDays };
}

/** "D+123 · 4개월 5일" 형식 */
export function formatChildAge(
  birthDate: string | Date | null | undefined,
  now?: Date,
): string {
  if (!birthDate) return '';
  const { days, months, extraDays } = calcChildAge(birthDate, now);
  return `D+${days} · ${months}개월 ${extraDays}일`;
}

/**
 * KST 달력일(YYYY-MM-DD) 을 "로컬 시간 자정" Date 로 변환.
 * 로컬 getFullYear/Month/Date 등을 사용하는 기존 헬퍼들과 호환되도록
 * 로컬 기준 자정으로 만든다. (timezone drift 없음)
 */
export function kstYmdToLocalMidnight(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * KST 기준 달력일로 만든 Date (UTC 자정).
 * WonderWeeks 등 birthDate 로부터 주차/일수 오프셋을 계산할 때 사용.
 */
export function toKstCalendarDate(
  input: string | Date | null | undefined,
): Date | null {
  const ymd = toKstYmd(input);
  return ymdToUtcMidnight(ymd);
}
