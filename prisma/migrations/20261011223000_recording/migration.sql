-- Phase 1 camera recording: saved cameras + clip metadata
CREATE TABLE "SavedCamera" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "group" TEXT NOT NULL DEFAULT 'Ungrouped',
  "cameraData" JSONB NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedCamera_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SavedCamera_userId_idx" ON "SavedCamera"("userId");
CREATE INDEX "SavedCamera_userId_group_idx" ON "SavedCamera"("userId", "group");
ALTER TABLE "SavedCamera" ADD CONSTRAINT "SavedCamera_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClipMeta" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "savedCameraId" TEXT,
  "cameraName" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "durationSec" INTEGER NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'video/webm',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClipMeta_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClipMeta_userId_createdAt_idx" ON "ClipMeta"("userId", "createdAt");
ALTER TABLE "ClipMeta" ADD CONSTRAINT "ClipMeta_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
