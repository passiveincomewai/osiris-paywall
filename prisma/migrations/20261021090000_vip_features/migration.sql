-- VIP Pro features: watched places, event alerts (quake / launch / ISS
-- pass), saved globe views, and the personal-brief email opt-in.
-- Event alerts mirror the camera-alerts pattern: rules pause when the
-- owner's VIP lapses, events are the in-app inbox, and (ruleId,
-- dedupeKey) uniqueness makes the 15-minute checker idempotent.

-- CreateTable
CREATE TABLE "VipPlace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusKm" INTEGER NOT NULL DEFAULT 250,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAlertRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "placeId" TEXT,
    "config" JSONB NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAlertEvent" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "dedupeKey" TEXT NOT NULL,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layers" TEXT NOT NULL,
    "cameraId" TEXT,
    "cameraName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VipBriefPref" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipBriefPref_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VipPlace_userId_idx" ON "VipPlace"("userId");

-- CreateIndex
CREATE INDEX "EventAlertRule_userId_idx" ON "EventAlertRule"("userId");

-- CreateIndex
CREATE INDEX "EventAlertRule_active_kind_idx" ON "EventAlertRule"("active", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "EventAlertEvent_ruleId_dedupeKey_key" ON "EventAlertEvent"("ruleId", "dedupeKey");

-- CreateIndex
CREATE INDEX "EventAlertEvent_userId_createdAt_idx" ON "EventAlertEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EventAlertEvent_ruleId_idx" ON "EventAlertEvent"("ruleId");

-- CreateIndex
CREATE INDEX "SavedView_userId_idx" ON "SavedView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VipBriefPref_userId_key" ON "VipBriefPref"("userId");

-- AddForeignKey
ALTER TABLE "VipPlace" ADD CONSTRAINT "VipPlace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAlertRule" ADD CONSTRAINT "EventAlertRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAlertRule" ADD CONSTRAINT "EventAlertRule_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "VipPlace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAlertEvent" ADD CONSTRAINT "EventAlertEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EventAlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAlertEvent" ADD CONSTRAINT "EventAlertEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VipBriefPref" ADD CONSTRAINT "VipBriefPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
