-- 네이티브 앱 하단 배너 광고 네트워크를 어드민에서 고를 수 있도록 앱 전역 설정 테이블을 만든다.
-- 행은 id=1 하나만 쓰는 싱글톤이다.

-- CreateEnum
CREATE TYPE "AppAdNetwork" AS ENUM ('GOOGLE', 'KAKAO');

-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "adNetwork" "AppAdNetwork" NOT NULL DEFAULT 'KAKAO',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- 설정 행을 미리 만들어 둔다. AdMob 계정 정지(2026-10-15) 중이라 KAKAO 로 시작한다.
INSERT INTO "app_settings" ("id", "adNetwork", "updatedAt")
VALUES (1, 'KAKAO', CURRENT_TIMESTAMP);
