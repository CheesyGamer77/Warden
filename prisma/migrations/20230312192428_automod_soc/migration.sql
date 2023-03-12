/*
  Warnings:

  - You are about to drop the `AutoModConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "NameSanitizerConfig" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "AutoModConfig";

-- CreateTable
CREATE TABLE "AntispamConfig" (
    "guildId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AntispamConfig_pkey" PRIMARY KEY ("guildId")
);

-- AddForeignKey
ALTER TABLE "AntiSpamIgnoredChannels" ADD CONSTRAINT "AntiSpamIgnoredChannels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "AntispamConfig"("guildId") ON DELETE RESTRICT ON UPDATE CASCADE;
