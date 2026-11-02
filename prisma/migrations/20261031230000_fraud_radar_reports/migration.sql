-- Fraud Radar Phase 9: Report Studio domain (PHASE9 §2.2).
-- Additive only: four new tables; the only change to existing
-- tables is none at the SQL level — the User / FrCase relations
-- are Prisma-side over the new FKs. A report version's pinSet
-- and composition are frozen at creation (enforced in the
-- data-access layer, which exposes no update path for them);
-- the generation fields (documentPathname, contentSha256,
-- manifest, validation*) are written once by the generation
-- job. Reports are owner-only user data, dark behind
-- fraudRadarEnabled.

-- CreateTable
CREATE TABLE "FrReport" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "caseId" TEXT,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrReportVersion" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "generatorVersion" TEXT NOT NULL,
    "pinSet" JSONB NOT NULL,
    "composition" JSONB NOT NULL,
    "documentPathname" TEXT,
    "contentSha256" TEXT,
    "manifest" JSONB,
    "validationVerdict" TEXT,
    "validationDetail" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrReportVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrReportExport" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "contentSha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrReportGenerationJob" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "formats" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrReportGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FrReport_ownerId_updatedAt_idx" ON "FrReport"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "FrReport_caseId_idx" ON "FrReport"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "FrReportVersion_reportId_versionNo_key" ON "FrReportVersion"("reportId", "versionNo");

-- CreateIndex
CREATE INDEX "FrReportVersion_reportId_createdAt_idx" ON "FrReportVersion"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "FrReportExport_versionId_format_idx" ON "FrReportExport"("versionId", "format");

-- CreateIndex
CREATE INDEX "FrReportGenerationJob_status_createdAt_idx" ON "FrReportGenerationJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FrReportGenerationJob_versionId_idx" ON "FrReportGenerationJob"("versionId");

-- AddForeignKey
ALTER TABLE "FrReport" ADD CONSTRAINT "FrReport_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrReport" ADD CONSTRAINT "FrReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "FrCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrReportVersion" ADD CONSTRAINT "FrReportVersion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FrReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrReportExport" ADD CONSTRAINT "FrReportExport_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "FrReportVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrReportGenerationJob" ADD CONSTRAINT "FrReportGenerationJob_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "FrReportVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
