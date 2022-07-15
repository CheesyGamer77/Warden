-- CreateEnum
CREATE TYPE "ModActionType" AS ENUM ('WARN', 'MUTE', 'UNMUTE', 'KICK', 'BAN', 'UNBAN');

-- CreateTable
CREATE TABLE "ModActions" (
    "guildId" TEXT NOT NULL,
    "caseNumber" INTEGER NOT NULL,
    "type" "ModActionType" NOT NULL,
    "offenderId" TEXT NOT NULL,
    "offenderTag" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "moderatorTag" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'No Reason Provided'
);

-- CreateIndex
CREATE UNIQUE INDEX "ModActions_guildId_caseNumber_key" ON "ModActions"("guildId", "caseNumber");
