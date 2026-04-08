-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "bgColor" TEXT,
    "linkUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_isActive_sortOrder_idx" ON "banners"("isActive", "sortOrder");

-- Seed default banner for temperament event
INSERT INTO "banners" ("id", "title", "subtitle", "bgColor", "linkUrl", "sortOrder", "isActive", "updatedAt")
VALUES (
  gen_random_uuid(),
  '우리 아이 기질 검사',
  '맞춤 양육 가이드를 받아보세요',
  '#FFB347',
  '/events/temperament',
  0,
  true,
  CURRENT_TIMESTAMP
);
