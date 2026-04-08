-- CreateEnum
CREATE TYPE "GrowthRecordType" AS ENUM (
  'BREASTFEEDING',
  'FORMULA',
  'BABY_FOOD',
  'SLEEP',
  'PUMPED_FEEDING',
  'PUMPING',
  'BATH',
  'HOSPITAL',
  'TEMPERATURE',
  'MEDICATION',
  'DIAPER',
  'SNACK',
  'MILK',
  'WATER',
  'PLAY',
  'TUMMY_TIME',
  'ETC'
);

-- CreateTable
CREATE TABLE "growth_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "GrowthRecordType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "memo" TEXT,
    "imageUrl" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "growth_records_childId_startAt_idx" ON "growth_records"("childId", "startAt");

-- CreateIndex
CREATE INDEX "growth_records_userId_startAt_idx" ON "growth_records"("userId", "startAt");

-- AddForeignKey
ALTER TABLE "growth_records" ADD CONSTRAINT "growth_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_records" ADD CONSTRAINT "growth_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "growth_quick_buttons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "GrowthRecordType" NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_quick_buttons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "growth_quick_buttons_userId_idx" ON "growth_quick_buttons"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "growth_quick_buttons_userId_type_key" ON "growth_quick_buttons"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "growth_quick_buttons_userId_position_key" ON "growth_quick_buttons"("userId", "position");

-- AddForeignKey
ALTER TABLE "growth_quick_buttons" ADD CONSTRAINT "growth_quick_buttons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
