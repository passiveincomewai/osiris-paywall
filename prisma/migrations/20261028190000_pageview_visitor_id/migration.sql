-- Return-visit analytics: one additive, nullable column on PageView.
-- `visitorId` carries the persistent first-party visitor ID (random UUID,
-- client-generated, persisted in localStorage as `we_vid`) stamped by the
-- analytics ingest route. Per-visit sessionId cannot distinguish a
-- returning visitor from a new one, so the true return rate was
-- unmeasurable; existing rows stay NULL and return-rate reporting covers
-- only rows written after this ships.
-- STAGED migration: NOT applied to production by this branch — the
-- parent applies it at ship time.

-- AlterTable
ALTER TABLE "PageView" ADD COLUMN "visitorId" TEXT;

-- CreateIndex
CREATE INDEX "PageView_visitorId_createdAt_idx" ON "PageView"("visitorId", "createdAt");
