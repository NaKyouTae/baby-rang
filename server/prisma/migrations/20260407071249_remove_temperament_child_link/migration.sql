/*
  Warnings:

  - You are about to drop the column `childId` on the `temperament_submissions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "temperament_submissions" DROP CONSTRAINT "temperament_submissions_childId_fkey";

-- DropIndex
DROP INDEX "temperament_submissions_childId_completedAt_idx";

-- AlterTable
ALTER TABLE "temperament_submissions" DROP COLUMN "childId";
