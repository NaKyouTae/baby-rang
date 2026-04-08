-- CreateEnum
CREATE TYPE "NursingRoomReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "nursing_room_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sido" TEXT NOT NULL,
    "sigungu" TEXT,
    "roadAddress" TEXT NOT NULL,
    "detailLocation" TEXT,
    "tel" TEXT,
    "dadAvailable" BOOLEAN NOT NULL DEFAULT false,
    "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "openHours" TEXT,
    "notes" TEXT,
    "reporterName" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "status" "NursingRoomReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nursing_room_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nursing_room_reports_status_createdAt_idx" ON "nursing_room_reports"("status", "createdAt");
