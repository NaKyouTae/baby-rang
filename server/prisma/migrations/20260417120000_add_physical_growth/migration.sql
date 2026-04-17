-- CreateTable
CREATE TABLE "physical_growths" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "measuredAt" DATE NOT NULL,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "headCircumCm" DOUBLE PRECISION,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_growths_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "physical_growths_childId_measuredAt_idx" ON "physical_growths"("childId", "measuredAt");

-- AddForeignKey
ALTER TABLE "physical_growths" ADD CONSTRAINT "physical_growths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_growths" ADD CONSTRAINT "physical_growths_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
