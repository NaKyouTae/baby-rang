-- Split single durationMinutes into min/max range
ALTER TABLE "tests" ADD COLUMN "durationMinMinutes" INTEGER;
ALTER TABLE "tests" ADD COLUMN "durationMaxMinutes" INTEGER;

-- Backfill: existing single value goes into both min and max
UPDATE "tests"
SET "durationMinMinutes" = "durationMinutes",
    "durationMaxMinutes" = "durationMinutes";

ALTER TABLE "tests" DROP COLUMN "durationMinutes";
