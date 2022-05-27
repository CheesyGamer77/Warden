-- CreateTable
CREATE TABLE "Reputation" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reputation" DECIMAL(65,30) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Reputation_guildId_userId_key" ON "Reputation"("guildId", "userId");
