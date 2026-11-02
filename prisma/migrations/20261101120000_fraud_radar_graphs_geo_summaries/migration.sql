-- Fraud Radar Phase 10: graphs + geo Neon grain (PHASE10 §6.6).
-- Additive only: three new tables, no existing table touched.
-- Summary grain only: one graph row per composite vintage; geo
-- state cells + per-layer national summaries mirroring the
-- published geo-neon.json 1:1. No per-entity or per-edge rows.
-- Candidate edges are counted separately with their measured
-- linkage rates, never merged into published-edge totals (§2.3).
-- Withheld geo small cells carry NULL value/entity counts (§5.3).

-- CreateTable
CREATE TABLE "FrGraphYearlySummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "graphCatalogVersion" TEXT NOT NULL,
    "entitiesTotal" BIGINT NOT NULL,
    "entitiesUei" INTEGER NOT NULL,
    "entitiesEin" INTEGER NOT NULL,
    "entitiesNpi" INTEGER NOT NULL,
    "nodesTotal" BIGINT NOT NULL,
    "edgesExcludingCandidates" BIGINT NOT NULL,
    "candidateEdges" BIGINT NOT NULL,
    "annotations" BIGINT NOT NULL,
    "truncations" BIGINT NOT NULL,
    "candidateMatchRatePct" DECIMAL(10,4),
    "candidateAsDesignedRatePct" DECIMAL(10,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrGraphYearlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrGeoStateSummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "layer" TEXT NOT NULL,
    "geographyField" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "attributionState" TEXT NOT NULL,
    "entityCount" INTEGER,
    "awardCount" BIGINT,
    "value" DECIMAL(24,2),
    "values" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrGeoStateSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrGeoYearlySummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "layer" TEXT NOT NULL,
    "geographyField" TEXT NOT NULL,
    "national" JSONB NOT NULL,
    "unknown" JSONB NOT NULL,
    "coverageStatement" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrGeoYearlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrGraphYearlySummary_datasetVersion_key" ON "FrGraphYearlySummary"("datasetVersion");

-- CreateIndex
CREATE INDEX "FrGraphYearlySummary_datasetVersion_idx" ON "FrGraphYearlySummary"("datasetVersion");

-- CreateIndex
CREATE UNIQUE INDEX "FrGeoStateSummary_datasetVersion_engine_layer_stateCode_key" ON "FrGeoStateSummary"("datasetVersion", "engine", "layer", "stateCode");

-- CreateIndex
CREATE INDEX "FrGeoStateSummary_datasetVersion_engine_layer_idx" ON "FrGeoStateSummary"("datasetVersion", "engine", "layer");

-- CreateIndex
CREATE UNIQUE INDEX "FrGeoYearlySummary_datasetVersion_engine_layer_key" ON "FrGeoYearlySummary"("datasetVersion", "engine", "layer");

-- CreateIndex
CREATE INDEX "FrGeoYearlySummary_datasetVersion_idx" ON "FrGeoYearlySummary"("datasetVersion");
