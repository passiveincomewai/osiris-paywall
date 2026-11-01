-- AI Demo Studio (2026-11-01): additive only — three new tables, no
-- changes to existing tables. Applied to production via the Neon HTTP
-- endpoint at ship time (fleet practice) and kept here as the record.
CREATE TABLE IF NOT EXISTS "DemoJob" (
  "id" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "plan" JSONB NOT NULL,
  "style" TEXT NOT NULL DEFAULT 'cinematic',
  "orientation" TEXT NOT NULL DEFAULT 'landscape',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "progress" TEXT,
  "error" TEXT,
  "videoId" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "DemoJob_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "DemoVideo" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "features" JSONB NOT NULL,
  "prompt" TEXT NOT NULL,
  "style" TEXT NOT NULL DEFAULT 'cinematic',
  "orientation" TEXT NOT NULL DEFAULT 'landscape',
  "durationSec" DOUBLE PRECISION,
  "videoUrl" TEXT NOT NULL,
  "rawUrl" TEXT,
  "posterUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "affiliateShared" BOOLEAN NOT NULL DEFAULT false,
  "outdated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoVideo_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "DemoPlacement" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "page" TEXT NOT NULL,
  "slot" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DemoPlacement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DemoJob_status_createdAt_idx" ON "DemoJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "DemoVideo_status_createdAt_idx" ON "DemoVideo"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "DemoVideo_affiliateShared_status_idx" ON "DemoVideo"("affiliateShared", "status");
CREATE INDEX IF NOT EXISTS "DemoPlacement_page_slot_active_idx" ON "DemoPlacement"("page", "slot", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "DemoPlacement_page_slot_videoId_key" ON "DemoPlacement"("page", "slot", "videoId");
ALTER TABLE "DemoJob" ADD CONSTRAINT "DemoJob_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "DemoVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DemoPlacement" ADD CONSTRAINT "DemoPlacement_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "DemoVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
