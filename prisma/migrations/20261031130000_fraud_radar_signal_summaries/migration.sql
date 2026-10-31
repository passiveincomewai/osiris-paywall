-- Fraud Radar Phase 6: statistical intelligence Neon grain (AUDIT §15a).
-- Additive only: two new tables, no existing table touched.
-- Summary grain only (PHASE6 §6.5): per-rule summaries plus
-- per-dataset data-quality records. Peer groups are deliberately
-- NOT modelled here — they are read from the published artifacts.
-- Signals are research leads only; there is no composite standing.
-- expectedByConstruction / noiseCaution are nullable: rule forms
-- with no by-construction expectation (own-history / count forms)
-- carry NULL (not applicable), never a fabricated zero/false. The
-- contracts engine has no rows while its state is
-- not_computed_input_not_published — absence is the pending
-- state, never a count of zero.

-- CreateTable
CREATE TABLE "FrSignalRuleSummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleLibraryVersion" TEXT NOT NULL,
    "entitiesEvaluated" BIGINT NOT NULL,
    "leadsPublished" BIGINT NOT NULL,
    "aboveBandBeforeEffectFloor" BIGINT,
    "expectedByConstruction" DECIMAL(20,2),
    "noiseCaution" BOOLEAN,
    "peerDefinition" TEXT NOT NULL,
    "inputVersions" JSONB NOT NULL,
    "notComputed" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrSignalRuleSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrDataQualityRecord" (
    "id" TEXT NOT NULL,
    "datasetSlug" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "runDate" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "checksTotal" INTEGER NOT NULL,
    "checksPass" INTEGER NOT NULL,
    "checksWarn" INTEGER NOT NULL,
    "checksFail" INTEGER NOT NULL,
    "checksError" INTEGER NOT NULL,
    "checksNotApplicable" INTEGER NOT NULL,
    "checks" JSONB NOT NULL,
    "defectsInForce" TEXT[],
    "detailPointer" TEXT NOT NULL,
    "filesChecked" INTEGER NOT NULL,
    "vintageAgeDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrDataQualityRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrSignalRuleSummary_datasetVersion_ruleCode_key" ON "FrSignalRuleSummary"("datasetVersion", "ruleCode");

-- CreateIndex
CREATE INDEX "FrSignalRuleSummary_datasetVersion_idx" ON "FrSignalRuleSummary"("datasetVersion");

-- CreateIndex
CREATE INDEX "FrSignalRuleSummary_datasetVersion_engine_idx" ON "FrSignalRuleSummary"("datasetVersion", "engine");

-- CreateIndex
CREATE UNIQUE INDEX "FrDataQualityRecord_datasetSlug_datasetVersion_runDate_key" ON "FrDataQualityRecord"("datasetSlug", "datasetVersion", "runDate");

-- CreateIndex
CREATE INDEX "FrDataQualityRecord_runDate_idx" ON "FrDataQualityRecord"("runDate");

-- CreateIndex
CREATE INDEX "FrDataQualityRecord_datasetSlug_idx" ON "FrDataQualityRecord"("datasetSlug");
