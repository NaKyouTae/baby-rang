-- 소셜 로그인 연결을 users.kakaoId → accounts 테이블로 분리.
-- 카카오 외 google/naver/apple도 향후 추가될 수 있도록 1:N 구조로 변경.

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('KAKAO', 'GOOGLE', 'NAVER', 'APPLE');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerId_key" ON "accounts"("provider", "providerId");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: 기존 users.kakaoId → accounts(KAKAO, kakaoId)
INSERT INTO "accounts" ("id", "userId", "provider", "providerId", "createdAt")
SELECT gen_random_uuid()::text, "id", 'KAKAO'::"AuthProvider", "kakaoId", "createdAt"
FROM "users"
WHERE "kakaoId" IS NOT NULL;

-- Drop legacy column/index from users
DROP INDEX "users_kakaoId_key";
ALTER TABLE "users" DROP COLUMN "kakaoId";
