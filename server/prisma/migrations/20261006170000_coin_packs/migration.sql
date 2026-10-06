-- 보석 충전 묶음을 디자인대로 7종으로 다시 정의한다.
-- (보석 1개는 광고 보상이라 결제 상품이 아니다.)
--
-- 아직 충전 결제가 0건이라 타입을 다시 만들어도 안전하다.
-- 혹시 남아 있으면 가장 가까운 묶음으로 옮긴 뒤 바꾼다.
UPDATE "payments" SET "productType" = 'OTHER'
WHERE "productType"::text IN ('COINS_SMALL', 'COINS_MEDIUM', 'COINS_LARGE');

ALTER TYPE "PaymentProductType" RENAME TO "PaymentProductType_old";
CREATE TYPE "PaymentProductType" AS ENUM (
  'COINS_10', 'COINS_20', 'COINS_30', 'COINS_50', 'COINS_100', 'COINS_200', 'COINS_300',
  'TEMPERAMENT_REPORT', 'WONDER_WEEKS_PREMIUM', 'NURSING_ROOM_PREMIUM', 'OTHER'
);
ALTER TABLE "payments"
  ALTER COLUMN "productType" TYPE "PaymentProductType"
  USING ("productType"::text::"PaymentProductType");
DROP TYPE "PaymentProductType_old";
