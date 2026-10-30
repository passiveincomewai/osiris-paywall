-- Powder Pass ski email send log: one row per (user, kind, dedupe key).
-- The unique pair is the never-send-twice guarantee for the dawn-patrol
-- ('dawn', UTC run date) and powder-digest ('digest', ISO week) runners.
-- Additive only — no existing table is touched.

-- CreateTable
CREATE TABLE "SkiEmailSendLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkiEmailSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkiEmailSendLog_userId_idx" ON "SkiEmailSendLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkiEmailSendLog_userId_kind_dedupeKey_key" ON "SkiEmailSendLog"("userId", "kind", "dedupeKey");

-- AddForeignKey
ALTER TABLE "SkiEmailSendLog" ADD CONSTRAINT "SkiEmailSendLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
