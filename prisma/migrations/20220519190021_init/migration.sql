-- CreateTable
CREATE TABLE "LogConfig" (
    "guildId" TEXT NOT NULL,
    "joinsChannelId" TEXT,
    "leavesChannelId" TEXT,
    "userFilterChannelId" TEXT,

    CONSTRAINT "LogConfig_pkey" PRIMARY KEY ("guildId")
);
