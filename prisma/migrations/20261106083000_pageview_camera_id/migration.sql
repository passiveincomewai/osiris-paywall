-- "Pick up where you left off" (Wave 2 item 7): two additive, nullable
-- columns on PageView carrying the camera identity of camera_open event
-- rows. Until now a camera_open row recorded THAT a camera was opened
-- but never WHICH one (the event:detail suffix sanitizes to [a-z0-9_],
-- max 24 chars — real camera ids are long dashed slugs), so no
-- return-visit rail could be built from history. The ingest route stamps
-- cameraId/cameraName only for camera_open events carrying a
-- well-formed id; cameraName is the ingest-time label snapshot and
-- render-time resolution via /api/cctv?id= stays authoritative.
-- Existing rows stay NULL — pre-instrumentation opens have no id
-- recorded anywhere, so no backfill is possible and the rail only ever
-- shows post-ship history.
-- Applied to production statement-by-statement at ship time (the Neon
-- batch applier silently drops array-payload DDL); verified afterwards
-- via information_schema.

-- AlterTable
ALTER TABLE "PageView" ADD COLUMN "cameraId" TEXT;
ALTER TABLE "PageView" ADD COLUMN "cameraName" TEXT;

-- CreateIndex
CREATE INDEX "PageView_userId_event_createdAt_idx" ON "PageView"("userId", "event", "createdAt");
