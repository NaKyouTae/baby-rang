/**
 * WHO 2021 가이드라인 기반 미세먼지 등급 계산.
 * 에어코리아 API가 주는 grade는 환경부 기준이라 무시하고, 원시값에서 다시 계산해 사용.
 */

export const GRADE_LABEL: Record<string, string> = {
  "1": "좋음",
  "2": "보통",
  "3": "나쁨",
  "4": "매우나쁨",
};

export const GRADE_COLOR: Record<string, string> = {
  "1": "#3078C9",
  "2": "#22C55E",
  "3": "#F97316",
  "4": "#EF4444",
};

export const GRADE_BG: Record<string, string> = {
  "1": "#EDF5FF",
  "2": "#E9FBEF",
  "3": "#FFF4E6",
  "4": "#FFEFEE",
};

export function whoGradePm10(value: string | null): string | null {
  if (!value || value === "-") return null;
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  if (v <= 30) return "1";
  if (v <= 50) return "2";
  if (v <= 100) return "3";
  return "4";
}

export function whoGradePm25(value: string | null): string | null {
  if (!value || value === "-") return null;
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  if (v <= 15) return "1";
  if (v <= 25) return "2";
  if (v <= 50) return "3";
  return "4";
}

export function gradeLabel(grade: string | null): string {
  return grade ? GRADE_LABEL[grade] ?? "-" : "-";
}

export function gradeColor(grade: string | null): string {
  return grade ? GRADE_COLOR[grade] ?? "#808991" : "#808991";
}

export function gradeBg(grade: string | null): string {
  return grade ? GRADE_BG[grade] ?? "#F7F8F9" : "#F7F8F9";
}
