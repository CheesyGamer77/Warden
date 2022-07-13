-- CreateTable
CREATE TABLE "NameSanitizerConfig" (
    "guildId" TEXT NOT NULL,
    "blackFallBackName" TEXT DEFAULT 'nickname',
    "cleanFancyCharacters" BOOLEAN DEFAULT false,

    CONSTRAINT "NameSanitizerConfig_pkey" PRIMARY KEY ("guildId")
);
