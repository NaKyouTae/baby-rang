-- AlterTable: 사용자에 동의 시각 컬럼 추가
ALTER TABLE "users" ADD COLUMN "termsAgreedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "privacyAgreedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "marketingAgreedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "thirdPartyAgreedAt" TIMESTAMP(3);

-- 이미 온보딩을 마친 기존 사용자는 가입 시점(onboardedAt or createdAt)을 필수 동의 시각으로 백필.
-- 동의 UI가 없던 시기에 회원가입한 사용자는 가입 행위 자체가 약관/개인정보 동의로 간주되어 왔으므로 보존.
UPDATE "users"
SET "termsAgreedAt"   = COALESCE("onboardedAt", "createdAt"),
    "privacyAgreedAt" = COALESCE("onboardedAt", "createdAt")
WHERE "onboardedAt" IS NOT NULL OR "createdAt" IS NOT NULL;

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS', 'PRIVACY', 'MARKETING', 'THIRD_PARTY');

-- CreateTable: append-only 동의 이력
CREATE TABLE "consent_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "agreed" BOOLEAN NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_logs_userId_type_occurredAt_idx" ON "consent_logs"("userId", "type", "occurredAt");

-- AddForeignKey
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
