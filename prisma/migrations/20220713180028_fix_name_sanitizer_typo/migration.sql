/*
  Warnings:

  - You are about to drop the column `blackFallBackName` on the `NameSanitizerConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "NameSanitizerConfig" DROP COLUMN "blackFallBackName",
ADD COLUMN     "blankFallbackName" TEXT NOT NULL DEFAULT 'nickname';
