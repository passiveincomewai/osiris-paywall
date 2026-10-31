-- Fraud Radar Phase 4: grants Neon grain (AUDIT §15a).
-- Additive only: four new tables, no existing table touched.
-- USAspending amounts are AWARD-CUMULATIVE snapshot totals and are
-- named as such; ALN/agency fiscal years are attributed (archive
-- fiscal year of each award's winning snapshot). FAC expended is
-- auditee-reported; questioned costs are flag counts only.
-- The FAC datasetVersion ("2026-10-31_ay2026") is a column value in
-- the same table shape as the grants grains ("2026-10-06").

-- CreateTable
CREATE TABLE "FrGrantsYearlySummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "awards" BIGINT NOT NULL,
    "distinctRecipients" INTEGER NOT NULL,
    "obligatedAwardCumulativeUsd" DECIMAL(24,2) NOT NULL,
    "outlayAwardCumulativeUsd" DECIMAL(24,2) NOT NULL,
    "subawardsCount" BIGINT NOT NULL,
    "subawardAmountUsd" DECIMAL(24,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrGrantsYearlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrGrantsAlnSummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "aln" TEXT NOT NULL,
    "alnTitle" TEXT,
    "attributedFiscalYear" INTEGER NOT NULL,
    "awards" BIGINT NOT NULL,
    "distinctRecipients" INTEGER NOT NULL,
    "obligatedAwardCumulativeUsd" DECIMAL(24,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrGrantsAlnSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrGrantsAgencySummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "attributedFiscalYear" INTEGER NOT NULL,
    "awards" BIGINT NOT NULL,
    "distinctRecipients" INTEGER NOT NULL,
    "obligatedAwardCumulativeUsd" DECIMAL(24,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrGrantsAgencySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrFacYearlySummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "auditYear" INTEGER NOT NULL,
    "reports" BIGINT NOT NULL,
    "totalExpendedUsd" DECIMAL(24,2) NOT NULL,
    "findingsCount" BIGINT NOT NULL,
    "repeatFindingsCount" BIGINT NOT NULL,
    "questionedCostFlagCount" BIGINT NOT NULL,
    "distinctAuditees" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrFacYearlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrGrantsYearlySummary_datasetVersion_fiscalYear_key" ON "FrGrantsYearlySummary"("datasetVersion", "fiscalYear");

-- CreateIndex
CREATE INDEX "FrGrantsYearlySummary_datasetVersion_idx" ON "FrGrantsYearlySummary"("datasetVersion");

-- CreateIndex
CREATE UNIQUE INDEX "FrGrantsAlnSummary_datasetVersion_aln_attributedFiscalYear_key" ON "FrGrantsAlnSummary"("datasetVersion", "aln", "attributedFiscalYear");

-- CreateIndex
CREATE INDEX "FrGrantsAlnSummary_datasetVersion_attributedFiscalYear_idx" ON "FrGrantsAlnSummary"("datasetVersion", "attributedFiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "FrGrantsAgencySummary_datasetVersion_agency_attributedFiscalYear_key" ON "FrGrantsAgencySummary"("datasetVersion", "agency", "attributedFiscalYear");

-- CreateIndex
CREATE INDEX "FrGrantsAgencySummary_datasetVersion_attributedFiscalYear_idx" ON "FrGrantsAgencySummary"("datasetVersion", "attributedFiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "FrFacYearlySummary_datasetVersion_auditYear_key" ON "FrFacYearlySummary"("datasetVersion", "auditYear");

-- CreateIndex
CREATE INDEX "FrFacYearlySummary_datasetVersion_idx" ON "FrFacYearlySummary"("datasetVersion");
