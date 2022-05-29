-- CreateTable
CREATE TABLE "AutoModConfig" (
    "guildId" TEXT NOT NULL,
    "antiSpamEnabled" BOOLEAN DEFAULT false,

    CONSTRAINT "AutoModConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "AntiSpamIgnoredChannels" (
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AntiSpamIgnoredChannels_guildId_channelId_key" ON "AntiSpamIgnoredChannels"("guildId", "channelId");
