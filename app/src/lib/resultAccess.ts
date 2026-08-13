// 검사 결과 열람 기간 — 검사 완료 시점부터 7일.
// 서버(server/src/temperament/temperament.service.ts)의 RESULT_ACCESS_DAYS 와 동일하게 유지할 것.
export const RESULT_ACCESS_DAYS = 7;

export function isResultExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  return Date.now() >= new Date(expiresAt).getTime();
}

/** 남은 열람 기간 라벨. 만료됐으면 null. */
export function remainingAccessLabel(expiresAt: string | null | undefined) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return days <= 1 ? '오늘까지' : `${days}일 남음`;
}
