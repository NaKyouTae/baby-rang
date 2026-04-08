/*
  Warnings:

  - Added the required column `gender` to the `children` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "children" ADD COLUMN     "gender" TEXT NOT NULL;
