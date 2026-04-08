/**
 * 아이 생년월일 기반 나이 계산 공통 유틸.
 * 화면마다 D+ / 개월수가 어긋나지 않도록 반드시 이 함수를 사용할 것.
 *
 * - birthDate 는 'YYYY-MM-DD' 또는 ISO 문자열을 모두 허용.
 * - 서버(UTC)/클라이언트 환경 차이를 없애기 위해 항상 한국시간(KST, UTC+9) 자정 기준으로 비교.
 */

export interface ChildAge {
  /** 출생일 포함 D+일수 (출생일 당일 = 0) */
  days: number;
  /** 만 개월수 */
  months: number;
  /** 만 개월수 이후 남은 일수 */
  extraDays: number;
}

/** KST(UTC+9) 기준의 Y/M/D 를 구해 UTC 자정 Date 로 반환 (비교 전용) */
function toKstMidnight(date: Date): Date {
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const k = new Date(kstMs);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()));
}

function parseBirthToKstMidnight(date: string): Date | null {
  if (!date) return null;
  const ymd = date.slice(0, 10).split('-');
  if (ymd.length !== 3) return null;
  const [y, m, d] = ymd.map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export function calcChildAge(birthDate: string, now: Date = new Date()): ChildAge {
  const birth = parseBirthToKstMidnight(birthDate);
  if (!birth) return { days: 0, months: 0, extraDays: 0 };

  const today = toKstMidnight(now);
  const days = Math.max(
    0,
    Math.floor((today.getTime() - birth.getTime()) / 86400000),
  );

  let months =
    (today.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - birth.getUTCMonth());
  let extraDays = today.getUTCDate() - birth.getUTCDate();
  if (extraDays < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)).getUTCDate();
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
