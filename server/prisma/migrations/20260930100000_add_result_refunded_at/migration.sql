-- 환불로 잠긴 상세 리포트를 표시하기 위한 컬럼.
-- 환불 시 isPaid 를 false 로 되돌리므로 열람 차단은 기존 코드가 그대로 처리하고,
-- 이 컬럼은 "환불됨"과 "애초에 결제 안 함"을 구분하는 용도로만 쓴다.
ALTER TABLE "temperament_results" ADD COLUMN "refundedAt" TIMESTAMP(3);
