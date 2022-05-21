/*
  Warnings:

  - You are about to drop the column `textFilterChannelId` on the `LogConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LogConfig" DROP COLUMN "textFilterChannelId",
ADD COLUMN     "userChangesChannelId" TEXT;
