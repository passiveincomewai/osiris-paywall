-- Fraud Radar Phase 3: care programs Neon grain (AUDIT §15a).
-- Additive only: four new tables, no existing table touched.
-- Medicare amounts are DERIVED from published averages and are named
-- as such; benesReported is a reported volume, never unique people.
-- The home-health star is CMS's own published rating, stored verbatim.

-- CreateTable
CREATE TABLE "FrMedicareHcpcsSummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "hcpcsCode" TEXT NOT NULL,
    "hcpcsDesc" TEXT,
    "dataYear" INTEGER NOT NULL,
    "distinctProviders" INTEGER NOT NULL,
    "totalServices" DECIMAL(20,2) NOT NULL,
    "benesReported" BIGINT NOT NULL,
    "pymtDerivedUsd" DECIMAL(18,2) NOT NULL,
    "allowedDerivedUsd" DECIMAL(18,2) NOT NULL,
    "stdzdDerivedUsd" DECIMAL(18,2) NOT NULL,
    "submittedDerivedUsd" DECIMAL(18,2) NOT NULL,
    "sourceRows" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrMedicareHcpcsSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrMedicareYearlySummary" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "dataYear" INTEGER NOT NULL,
    "distinctProviders" INTEGER NOT NULL,
    "distinctHcpcs" INTEGER NOT NULL,
    "totalServices" DECIMAL(20,2) NOT NULL,
    "benesReported" BIGINT NOT NULL,
    "pymtDerivedUsd" DECIMAL(18,2) NOT NULL,
    "allowedDerivedUsd" DECIMAL(18,2) NOT NULL,
    "stdzdDerivedUsd" DECIMAL(18,2) NOT NULL,
    "submittedDerivedUsd" DECIMAL(18,2) NOT NULL,
    "sourceRows" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrMedicareYearlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrHospiceProvider" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "ccn" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "county" TEXT,
    "phone" TEXT,
    "cmsRegion" TEXT,
    "ownershipType" TEXT,
    "certificationDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrHospiceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrHomeHealthAgency" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "ccn" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "ownershipType" TEXT,
    "certificationDate" DATE,
    "qualityStarRating" DECIMAL(3,1),
    "qualityStarFootnote" TEXT,
    "offersNursing" BOOLEAN,
    "offersPhysicalTherapy" BOOLEAN,
    "offersOccupationalTherapy" BOOLEAN,
    "offersSpeechPathology" BOOLEAN,
    "offersMedicalSocial" BOOLEAN,
    "offersHomeHealthAide" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrHomeHealthAgency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrMedicareHcpcsSummary_datasetVersion_hcpcsCode_dataYear_key" ON "FrMedicareHcpcsSummary"("datasetVersion", "hcpcsCode", "dataYear");

-- CreateIndex
CREATE INDEX "FrMedicareHcpcsSummary_datasetVersion_dataYear_idx" ON "FrMedicareHcpcsSummary"("datasetVersion", "dataYear");

-- CreateIndex
CREATE UNIQUE INDEX "FrMedicareYearlySummary_datasetVersion_dataYear_key" ON "FrMedicareYearlySummary"("datasetVersion", "dataYear");

-- CreateIndex
CREATE INDEX "FrMedicareYearlySummary_datasetVersion_idx" ON "FrMedicareYearlySummary"("datasetVersion");

-- CreateIndex
CREATE UNIQUE INDEX "FrHospiceProvider_datasetVersion_ccn_key" ON "FrHospiceProvider"("datasetVersion", "ccn");

-- CreateIndex
CREATE INDEX "FrHospiceProvider_datasetVersion_state_idx" ON "FrHospiceProvider"("datasetVersion", "state");

-- CreateIndex
CREATE UNIQUE INDEX "FrHomeHealthAgency_datasetVersion_ccn_key" ON "FrHomeHealthAgency"("datasetVersion", "ccn");

-- CreateIndex
CREATE INDEX "FrHomeHealthAgency_datasetVersion_state_idx" ON "FrHomeHealthAgency"("datasetVersion", "state");
