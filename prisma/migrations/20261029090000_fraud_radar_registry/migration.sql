-- CreateTable
CREATE TABLE "FrDataSource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "accessUrl" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "apiKeyRequirement" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "commercialUse" TEXT NOT NULL,
    "dataFields" TEXT[],
    "coverageStart" TEXT,
    "coverageEnd" TEXT,
    "limitations" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "notes" TEXT NOT NULL DEFAULT '',
    "lastPublishedAt" TIMESTAMP(3),
    "lastImportedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "sourceVersion" TEXT,
    "completeness" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrDataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrImportRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "datasetVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "rowsProcessed" BIGINT,
    "rowsValid" BIGINT,
    "rowsQuarantined" BIGINT,
    "artifactPath" TEXT,
    "artifactSha256" TEXT,
    "manifest" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrDataSource_slug_key" ON "FrDataSource"("slug");

-- CreateIndex
CREATE INDEX "FrDataSource_engine_idx" ON "FrDataSource"("engine");

-- CreateIndex
CREATE INDEX "FrDataSource_status_idx" ON "FrDataSource"("status");

-- CreateIndex
CREATE INDEX "FrImportRun_sourceId_startedAt_idx" ON "FrImportRun"("sourceId", "startedAt");

-- CreateIndex
CREATE INDEX "FrImportRun_status_idx" ON "FrImportRun"("status");

-- AddForeignKey
ALTER TABLE "FrImportRun" ADD CONSTRAINT "FrImportRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FrDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

