// 서버 페이지와 표(클라이언트)가 같이 쓰는 결제 상태 표기. "use client" 파일에 두면 서버에서 값으로 읽을 수 없다.

export const PAYMENT_STATUS: Record<
  string,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "purple" }
> = {
  PAID: { label: "결제완료", variant: "success" },
  PENDING: { label: "대기", variant: "warning" },
  FAILED: { label: "실패", variant: "destructive" },
  CANCELLED: { label: "취소", variant: "secondary" },
  REFUNDED: { label: "환불", variant: "purple" },
  PARTIAL_REFUNDED: { label: "부분환불", variant: "purple" },
};
