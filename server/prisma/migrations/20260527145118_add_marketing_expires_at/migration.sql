-- AlterTable: 마케팅 동의 만료일 컬럼 추가
ALTER TABLE "users" ADD COLUMN "marketingExpiresAt" TIMESTAMP(3);

-- 백필: 기존에 마케팅 동의한 사용자는 동의 시각 + 2년을 만료일로 설정.
-- (이미 2년이 지났다면 과거 시각이 되어 사실상 만료된 것으로 취급됨)
UPDATE "users"
SET "marketingExpiresAt" = "marketingAgreedAt" + INTERVAL '2 years'
WHERE "marketingAgreedAt" IS NOT NULL;
