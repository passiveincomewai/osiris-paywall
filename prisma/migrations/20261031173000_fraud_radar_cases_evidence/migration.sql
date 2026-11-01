-- Fraud Radar Phase 8: Cases & Evidence domain (PHASE8 §1, §1.7).
-- Additive only: eight new tables, no existing table altered apart
-- from no schema change at all — the User relation is Prisma-side
-- over the new FrCase FK. teamRef is an opaque string (no team
-- table, no FK to Organization); pgvector is NOT enabled.

-- CreateTable
CREATE TABLE "FrCase" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "teamRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "FrCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrCaseLead" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "entityLabel" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotSha256" TEXT NOT NULL,
    "sourceDataset" TEXT NOT NULL,
    "sourceDatasetVersion" TEXT NOT NULL,
    "ruleCode" TEXT,
    "pinnedById" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annotation" TEXT,

    CONSTRAINT "FrCaseLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrCaseEvidence" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "originalFilename" TEXT,
    "contentType" TEXT,
    "sizeBytes" BIGINT,
    "sha256" TEXT,
    "blobPathname" TEXT,
    "storageState" TEXT NOT NULL DEFAULT 'present',
    "artifactEnvelope" JSONB,
    "artifactSha256" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'not_requested',
    "processingPath" TEXT,
    "processorVersion" TEXT,
    "extractedTextPathname" TEXT,
    "pageCount" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrCaseEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrEvidenceProcessingJob" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "requestedPath" TEXT NOT NULL DEFAULT 'auto',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrEvidenceProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrCaseNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "leadId" TEXT,
    "evidenceId" TEXT,
    "claimId" TEXT,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrCaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrCaseClaim" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "subjectEngine" TEXT,
    "subjectEntityKey" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrCaseClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrClaimVerification" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "validatorVerdict" TEXT NOT NULL,
    "corpusVersions" JSONB NOT NULL,
    "checkerVersion" TEXT NOT NULL,
    "model" TEXT,
    "promptVersion" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrClaimVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrCaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrCaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FrCase_ownerId_status_updatedAt_idx" ON "FrCase"("ownerId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "FrCase_teamRef_idx" ON "FrCase"("teamRef");

-- CreateIndex
CREATE INDEX "FrCaseLead_caseId_pinnedAt_idx" ON "FrCaseLead"("caseId", "pinnedAt");

-- CreateIndex
CREATE INDEX "FrCaseLead_entityKey_idx" ON "FrCaseLead"("entityKey");

-- CreateIndex
CREATE UNIQUE INDEX "FrCaseLead_caseId_entityKey_ruleCode_snapshotSha256_key" ON "FrCaseLead"("caseId", "entityKey", "ruleCode", "snapshotSha256");

-- CreateIndex
CREATE INDEX "FrCaseEvidence_caseId_createdAt_idx" ON "FrCaseEvidence"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "FrCaseEvidence_sha256_idx" ON "FrCaseEvidence"("sha256");

-- CreateIndex
CREATE INDEX "FrEvidenceProcessingJob_status_createdAt_idx" ON "FrEvidenceProcessingJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FrEvidenceProcessingJob_evidenceId_idx" ON "FrEvidenceProcessingJob"("evidenceId");

-- CreateIndex
CREATE INDEX "FrEvidenceProcessingJob_caseId_idx" ON "FrEvidenceProcessingJob"("caseId");

-- CreateIndex
CREATE INDEX "FrCaseNote_caseId_createdAt_idx" ON "FrCaseNote"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "FrCaseClaim_caseId_createdAt_idx" ON "FrCaseClaim"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "FrClaimVerification_claimId_createdAt_idx" ON "FrClaimVerification"("claimId", "createdAt");

-- CreateIndex
CREATE INDEX "FrCaseEvent_caseId_createdAt_idx" ON "FrCaseEvent"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "FrCase" ADD CONSTRAINT "FrCase_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrCaseLead" ADD CONSTRAINT "FrCaseLead_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FrCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrCaseEvidence" ADD CONSTRAINT "FrCaseEvidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FrCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrEvidenceProcessingJob" ADD CONSTRAINT "FrEvidenceProcessingJob_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "FrCaseEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrCaseNote" ADD CONSTRAINT "FrCaseNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FrCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrCaseNote" ADD CONSTRAINT "FrCaseNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "FrCaseLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrCaseNote" ADD CONSTRAINT "FrCaseNote_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "FrCaseEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrCaseNote" ADD CONSTRAINT "FrCaseNote_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "FrCaseClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrCaseClaim" ADD CONSTRAINT "FrCaseClaim_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FrCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrClaimVerification" ADD CONSTRAINT "FrClaimVerification_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "FrCaseClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrCaseEvent" ADD CONSTRAINT "FrCaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FrCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
