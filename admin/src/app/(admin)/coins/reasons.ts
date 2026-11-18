// 서버 페이지와 표(클라이언트)가 같이 쓰는 보석 적립 사유. "use client" 파일에 두면 서버에서 값으로 읽을 수 없다.

export const REASONS: {
  value: string;
  label: string;
  variant: "success" | "warning" | "info" | "purple" | "secondary";
}[] = [
  { value: "PURCHASE", label: "결제", variant: "success" },
  { value: "AD_REWARD", label: "광고", variant: "warning" },
  { value: "REWARD", label: "기록 보상", variant: "info" },
  { value: "SIGNUP", label: "가입", variant: "purple" },
];

export const reasonOf = (value: string) =>
  REASONS.find((r) => r.value === value) ?? { value, label: value, variant: "secondary" as const };
