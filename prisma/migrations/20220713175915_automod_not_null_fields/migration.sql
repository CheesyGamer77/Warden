/*
  Warnings:

  - Made the column `antiSpamEnabled` on table `AutoModConfig` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nameSanitizerEnabled` on table `AutoModConfig` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AutoModConfig" ALTER COLUMN "antiSpamEnabled" SET NOT NULL,
ALTER COLUMN "nameSanitizerEnabled" SET NOT NULL;
