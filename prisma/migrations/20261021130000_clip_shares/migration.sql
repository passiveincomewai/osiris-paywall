-- Public clip shares: an owner uploads a browser-local recording to
-- hosted blob storage and gets an unguessable /watch/<slug> page.
-- The slug is the only credential; revoking stamps revokedAt and the
-- stored file is deleted, so a revoked link serves a gone page.

-- CreateTable
CREATE TABLE "ClipShare" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "posterUrl" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'video/webm',
    "sizeBytes" INTEGER NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "cameraName" TEXT NOT NULL,
    "refCode" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClipShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClipShare_slug_key" ON "ClipShare"("slug");

-- CreateIndex
CREATE INDEX "ClipShare_userId_createdAt_idx" ON "ClipShare"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClipShare" ADD CONSTRAINT "ClipShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipShare" ADD CONSTRAINT "ClipShare_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "ClipMeta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
