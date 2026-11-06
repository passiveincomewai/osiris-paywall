-- Browser push (wave-2 item 4): subscription storage + push delivery
-- flags on the two alert-event tables.
--
-- The PushSubscription table already exists in production (created
-- 2026-10-25 by an earlier payload; orphaned and empty — verified via
-- information_schema 2026-11-06). Every statement below is therefore
-- idempotent: a fresh database gets the table, production keeps its
-- existing one untouched, and only the pushSent columns are new there.

-- CreateTable (no-op where the table already exists)
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- AddForeignKey (guarded: Postgres has no ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_userId_fkey') THEN
        ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable
ALTER TABLE "AlertEvent" ADD COLUMN IF NOT EXISTS "pushSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventAlertEvent" ADD COLUMN IF NOT EXISTS "pushSent" BOOLEAN NOT NULL DEFAULT false;
