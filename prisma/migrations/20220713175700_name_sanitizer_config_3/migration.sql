/*
  Warnings:

  - Made the column `blackFallBackName` on table `NameSanitizerConfig` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cleanFancyCharacters` on table `NameSanitizerConfig` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "NameSanitizerConfig" ALTER COLUMN "blackFallBackName" SET NOT NULL,
ALTER COLUMN "cleanFancyCharacters" SET NOT NULL;
