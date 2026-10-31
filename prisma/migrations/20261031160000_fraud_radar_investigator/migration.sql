-- Fraud Radar Phase 7: AI Investigator conversations + usage ledger
-- (PHASE7 §3.5, §4.4). Additive only: three new tables, no existing
-- table touched apart from no schema change at all — the User
-- relation is Prisma-side over the new FK. Conversations are
-- owner-scoped (userId FK, cascade on account deletion); the
-- ledger is the quota source of truth and carries userId/turnId
-- as plain columns so Phase 11 entitlements adopt it as-is.

-- CreateTable
CREATE TABLE "FrInvestigatorConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrInvestigatorConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrInvestigatorMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "model" TEXT,
    "promptVersion" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "validatorVerdict" TEXT,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "errorCode" TEXT,
    "events" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrInvestigatorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrInvestigatorUsageLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "turnId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "toolCallCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'charged',
    "validatorVerdict" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrInvestigatorUsageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FrInvestigatorConversation_userId_updatedAt_idx" ON "FrInvestigatorConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "FrInvestigatorMessage_conversationId_createdAt_idx" ON "FrInvestigatorMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FrInvestigatorUsageLedger_turnId_key" ON "FrInvestigatorUsageLedger"("turnId");

-- CreateIndex
CREATE INDEX "FrInvestigatorUsageLedger_userId_createdAt_idx" ON "FrInvestigatorUsageLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FrInvestigatorUsageLedger_conversationId_idx" ON "FrInvestigatorUsageLedger"("conversationId");

-- AddForeignKey
ALTER TABLE "FrInvestigatorConversation" ADD CONSTRAINT "FrInvestigatorConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrInvestigatorMessage" ADD CONSTRAINT "FrInvestigatorMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "FrInvestigatorConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
