-- Marketing Studio Phase 2: generation credits + job tracking.
-- Credits are the cost-control layer for Studio generation (see
-- src/lib/studio/credits.ts): a job is charged BEFORE rendering, success
-- keeps the debit, failure auto-refunds via a compensating ledger row.
-- Creations record which paid job produced them (paidJobId) so
-- re-downloads of an already-paid render never re-charge.
CREATE TABLE "StudioCreditAccount" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioCreditAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudioCreditAccount_profileId_key" ON "StudioCreditAccount"("profileId");
CREATE TABLE "StudioCreditLedger" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudioCreditLedger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudioCreditLedger_profileId_createdAt_idx" ON "StudioCreditLedger"("profileId", "createdAt");
CREATE INDEX "StudioCreditLedger_profileId_reason_createdAt_idx" ON "StudioCreditLedger"("profileId", "reason", "createdAt");
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "creditCost" INTEGER NOT NULL,
    "params" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GenerationJob_profileId_createdAt_idx" ON "GenerationJob"("profileId", "createdAt");
CREATE INDEX "GenerationJob_status_createdAt_idx" ON "GenerationJob"("status", "createdAt");
ALTER TABLE "StudioCreditAccount" ADD CONSTRAINT "StudioCreditAccount_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioCreditLedger" ADD CONSTRAINT "StudioCreditLedger_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioCreation" ADD COLUMN "paidJobId" TEXT;
