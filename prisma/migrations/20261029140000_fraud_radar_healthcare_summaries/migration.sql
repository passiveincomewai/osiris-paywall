-- Fraud Radar Phase 2: Neon summary grain (AUDIT §15a). Additive only:
-- two new tables, no existing table touched. Rows are published by
-- scripts/fraud-radar-load-healthcare.mjs from the versioned pipeline
-- aggregates; monetary columns carry both labelled treatments.

-- CreateTable
CREATE TABLE "FrHcpcsSummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "hcpcsCode" TEXT NOT NULL,
    "reportedCells" BIGINT NOT NULL,
    "totalClaimLines" BIGINT NOT NULL,
    "totalPatientsReported" BIGINT NOT NULL,
    "totalPaidAllCellsUsd" DECIMAL(18,2) NOT NULL,
    "outlierCells" BIGINT NOT NULL,
    "outlierPaidUsd" DECIMAL(18,2) NOT NULL,
    "totalPaidExclOutliersUsd" DECIMAL(18,2) NOT NULL,
    "distinctBillingNpis" INTEGER NOT NULL,
    "distinctServicingNpis" INTEGER NOT NULL,
    "firstClaimMonth" DATE,
    "lastClaimMonth" DATE,
    "activeMonths" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrHcpcsSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrMonthlyNationalSummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "claimMonth" DATE NOT NULL,
    "reportedCells" BIGINT NOT NULL,
    "totalClaimLines" BIGINT NOT NULL,
    "totalPatientsReported" BIGINT NOT NULL,
    "totalPaidAllCellsUsd" DECIMAL(18,2) NOT NULL,
    "outlierCells" BIGINT NOT NULL,
    "outlierPaidUsd" DECIMAL(18,2) NOT NULL,
    "totalPaidExclOutliersUsd" DECIMAL(18,2) NOT NULL,
    "distinctBillingNpis" INTEGER NOT NULL,
    "distinctServicingNpis" INTEGER NOT NULL,
    "distinctHcpcsCodes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrMonthlyNationalSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FrHcpcsSummary_datasetVersion_idx" ON "FrHcpcsSummary"("datasetVersion");

-- CreateIndex
CREATE UNIQUE INDEX "FrHcpcsSummary_datasetVersion_hcpcsCode_key" ON "FrHcpcsSummary"("datasetVersion", "hcpcsCode");

-- CreateIndex
CREATE INDEX "FrMonthlyNationalSummary_datasetVersion_idx" ON "FrMonthlyNationalSummary"("datasetVersion");

-- CreateIndex
CREATE UNIQUE INDEX "FrMonthlyNationalSummary_datasetVersion_claimMonth_key" ON "FrMonthlyNationalSummary"("datasetVersion", "claimMonth");
