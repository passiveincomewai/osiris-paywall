-- Marketing Studio 2.0: AI Video Repurposing Machine.
-- StudioProject (one owned source video + measured analysis),
-- StudioVariation (one creative treatment: persisted composition,
-- rendered in the browser, tracked by creativeId), StudioPost
-- (content-calendar / publishing records). Additive only.

-- CreateTable
CREATE TABLE "StudioProject" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceRef" TEXT,
    "sourceName" TEXT,
    "durationSec" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "ownershipConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "analysis" JSONB,
    "transcript" TEXT,
    "trackingLinkId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "folder" TEXT NOT NULL DEFAULT 'drafts',
    "brandVoice" TEXT,
    "campaignTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioVariation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "aspect" TEXT NOT NULL DEFAULT '9:16',
    "composition" JSONB NOT NULL,
    "hookText" TEXT,
    "captionText" TEXT,
    "codeSnapshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "renderJobId" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "postedPlatform" TEXT,
    "postedUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioPost" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "projectId" TEXT,
    "variationId" TEXT,
    "platform" TEXT NOT NULL,
    "caption" TEXT,
    "affiliateLink" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "method" TEXT NOT NULL DEFAULT 'reminder',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "reminderOffsetsMin" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "remindedFor" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "publishedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioProject_profileId_createdAt_idx" ON "StudioProject"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "StudioProject_profileId_folder_idx" ON "StudioProject"("profileId", "folder");

-- CreateIndex
CREATE INDEX "StudioVariation_projectId_createdAt_idx" ON "StudioVariation"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioVariation_creativeId_key" ON "StudioVariation"("creativeId");

-- CreateIndex
CREATE INDEX "StudioPost_profileId_scheduledAt_idx" ON "StudioPost"("profileId", "scheduledAt");

-- CreateIndex
CREATE INDEX "StudioPost_status_scheduledAt_idx" ON "StudioPost"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioVariation" ADD CONSTRAINT "StudioVariation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioPost" ADD CONSTRAINT "StudioPost_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioPost" ADD CONSTRAINT "StudioPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioPost" ADD CONSTRAINT "StudioPost_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "StudioVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
