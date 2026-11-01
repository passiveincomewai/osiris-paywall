-- Fraud Radar Phase 5: contracts Neon grain (AUDIT §15a).
-- Additive only: four new tables, no existing table touched.
-- USAspending amounts are AWARD-CUMULATIVE snapshot totals and are
-- named as such; NAICS/PSC/agency fiscal years are attributed
-- (archive fiscal year of each award's winning snapshot). Ceilings
-- are not obligations and are not modelled. Outlay is nullable:
-- absence (no outlay on the winning snapshot) is never a zero.
-- FAC does NOT cover contracts — no FAC table exists in Phase 5.

-- CreateTable
CREATE TABLE "FrContractsYearlySummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "awards" BIGINT NOT NULL,
    "distinctVendors" INTEGER NOT NULL,
    "obligatedAwardCumulativeUsd" DECIMAL(24,2) NOT NULL,
    "outlayAwardCumulativeUsd" DECIMAL(24,2),
    "transactions" BIGINT NOT NULL,
    "modifications" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrContractsYearlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrContractsNaicsSummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "naics" TEXT NOT NULL,
    "naicsDescription" TEXT,
    "attributedFiscalYear" INTEGER NOT NULL,
    "awards" BIGINT NOT NULL,
    "distinctVendors" INTEGER NOT NULL,
    "distinctPscCodes" INTEGER NOT NULL,
    "obligatedAwardCumulativeUsd" DECIMAL(24,2) NOT NULL,
    "outlayAwardCumulativeUsd" DECIMAL(24,2),
    "transactionsInWindow" BIGINT NOT NULL,
    "modificationsInWindow" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrContractsNaicsSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrContractsPscSummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "psc" TEXT NOT NULL,
    "pscDescription" TEXT,
    "attributedFiscalYear" INTEGER NOT NULL,
    "awards" BIGINT NOT NULL,
    "distinctVendors" INTEGER NOT NULL,
    "distinctNaicsCodes" INTEGER NOT NULL,
    "obligatedAwardCumulativeUsd" DECIMAL(24,2) NOT NULL,
    "outlayAwardCumulativeUsd" DECIMAL(24,2),
    "transactionsInWindow" BIGINT NOT NULL,
    "modificationsInWindow" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrContractsPscSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrContractsAgencySummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "agencyCode" TEXT,
    "attributedFiscalYear" INTEGER NOT NULL,
    "awards" BIGINT NOT NULL,
    "distinctVendors" INTEGER NOT NULL,
    "obligatedAwardCumulativeUsd" DECIMAL(24,2) NOT NULL,
    "outlayAwardCumulativeUsd" DECIMAL(24,2),
    "transactionsInWindow" BIGINT NOT NULL,
    "modificationsInWindow" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrContractsAgencySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrContractsYearlySummary_datasetVersion_fiscalYear_key" ON "FrContractsYearlySummary"("datasetVersion", "fiscalYear");

-- CreateIndex
CREATE INDEX "FrContractsYearlySummary_datasetVersion_idx" ON "FrContractsYearlySummary"("datasetVersion");

-- CreateIndex
CREATE UNIQUE INDEX "FrContractsNaicsSummary_datasetVersion_naics_attributedFiscalYear_key" ON "FrContractsNaicsSummary"("datasetVersion", "naics", "attributedFiscalYear");

-- CreateIndex
CREATE INDEX "FrContractsNaicsSummary_datasetVersion_attributedFiscalYear_idx" ON "FrContractsNaicsSummary"("datasetVersion", "attributedFiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "FrContractsPscSummary_datasetVersion_psc_attributedFiscalYear_key" ON "FrContractsPscSummary"("datasetVersion", "psc", "attributedFiscalYear");

-- CreateIndex
CREATE INDEX "FrContractsPscSummary_datasetVersion_attributedFiscalYear_idx" ON "FrContractsPscSummary"("datasetVersion", "attributedFiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "FrContractsAgencySummary_datasetVersion_agency_attributedFiscalYear_key" ON "FrContractsAgencySummary"("datasetVersion", "agency", "attributedFiscalYear");

-- CreateIndex
CREATE INDEX "FrContractsAgencySummary_datasetVersion_attributedFiscalYear_idx" ON "FrContractsAgencySummary"("datasetVersion", "attributedFiscalYear");
