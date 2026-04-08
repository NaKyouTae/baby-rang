-- AlterTable
ALTER TABLE "growth_records" ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
