-- Fraud Radar Phase 11 SHV-11 (P11-B): append-only usage ledger.
-- Additive only. Reversals are new rows (reversalOfId), never edits.
CREATE TABLE "FrUsageLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "kind" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "reversalOfId" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCostUsd" DECIMAL(12,6),
    "tierAtCharge" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FrUsageLedger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FrUsageLedger_userId_kind_createdAt_idx" ON "FrUsageLedger"("userId", "kind", "createdAt");
CREATE INDEX "FrUsageLedger_teamId_kind_createdAt_idx" ON "FrUsageLedger"("teamId", "kind", "createdAt");
CREATE INDEX "FrUsageLedger_reversalOfId_idx" ON "FrUsageLedger"("reversalOfId");
