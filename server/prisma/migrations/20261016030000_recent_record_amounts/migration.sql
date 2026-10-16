CREATE TABLE "recent_record_amounts" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "type" "GrowthRecordType" NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recent_record_amounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recent_record_amounts_childId_type_value_unit_key"
  ON "recent_record_amounts"("childId", "type", "value", "unit");
CREATE INDEX "recent_record_amounts_childId_type_lastUsedAt_idx"
  ON "recent_record_amounts"("childId", "type", "lastUsedAt");
ALTER TABLE "recent_record_amounts" ADD CONSTRAINT "recent_record_amounts_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
