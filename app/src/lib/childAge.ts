/**
 * 아이 생년월일 기반 나이 계산 공통 유틸.
 * 화면마다 D+ / 개월수가 어긋나지 않도록 반드시 이 함수를 사용할 것.
 *
 * - birthDate 는 'YYYY-MM-DD' 또는 ISO 문자열을 모두 허용.
 * - 시/분/초/타임존 영향 제거를 위해 로컬 자정 기준으로 비교.
 */

export interface ChildAge {
  /** 출생일 포함 D+일수 (출생일 당일 = 0) */
  days: number;
  /** 만 개월수 */
  months: number;
  /** 만 개월수 이후 남은 일수 */
  extraDays: number;
}

function toLocalMidnight(date: string): Date | null {
  if (!date) return null;
  const ymd = date.slice(0, 10).split('-');
  if (ymd.length !== 3) return null;
  const [y, m, d] = ymd.map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function calcChildAge(birthDate: string, now: Date = new Date()): ChildAge {
  const birth = toLocalMidnight(birthDate);
  if (!birth) return { days: 0, months: 0, extraDays: 0 };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.max(
    0,
    Math.floor((today.getTime() - birth.getTime()) / 86400000),
  );

  let months =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth());
  let extraDays = today.getDate() - birth.getDate();
  if (extraDays < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    extraDays += prevMonthLastDay;
  }
  if (months < 0) {
    months = 0;
    extraDays = 0;
  }

  return { days, months, extraDays };
}

/** "D+123 · 4개월 5일" 형식 */
export function formatChildAge(birthDate: string, now?: Date): string {
  const { days, months, extraDays } = calcChildAge(birthDate, now);
  if (!birthDate) return '';
  return `D+${days} · ${months}개월 ${extraDays}일`;
}
