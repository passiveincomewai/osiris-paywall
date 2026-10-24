-- Affiliate suite (Oct 22 wave): labeled tracking links, in-panel
-- notifications, personal payout threshold, cinematic-director toggle,
-- and source capture on referral clicks.
--
-- Everything here is additive: new columns are nullable or defaulted,
-- and the two new tables are standalone. No existing row is rewritten.
-- Rows written before this migration keep NULL source fields — reports
-- label those "not tracked" rather than guessing.

-- AffiliateProfile: personal payout threshold (cents, null = program min)
ALTER TABLE "AffiliateProfile" ADD COLUMN "payoutThresholdCents" INTEGER;

-- AffiliateProfile: cinematic Director tools switch (default OFF)
ALTER TABLE "AffiliateProfile" ADD COLUMN "directorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- ReferralClick: tracking-link attribution + source capture
ALTER TABLE "ReferralClick" ADD COLUMN "trackingLinkId" TEXT;
ALTER TABLE "ReferralClick" ADD COLUMN "referrer" VARCHAR(300);
ALTER TABLE "ReferralClick" ADD COLUMN "utmSource" VARCHAR(120);
ALTER TABLE "ReferralClick" ADD COLUMN "utmMedium" VARCHAR(120);
ALTER TABLE "ReferralClick" ADD COLUMN "utmCampaign" VARCHAR(120);

CREATE INDEX "ReferralClick_affiliateProfileId_trackingLinkId_createdAt_idx"
  ON "ReferralClick"("affiliateProfileId", "trackingLinkId", "createdAt");

-- CreateTable
CREATE TABLE "AffiliateTrackingLink" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateTrackingLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffiliateTrackingLink_affiliateProfileId_slug_key"
  ON "AffiliateTrackingLink"("affiliateProfileId", "slug");
CREATE INDEX "AffiliateTrackingLink_affiliateProfileId_createdAt_idx"
  ON "AffiliateTrackingLink"("affiliateProfileId", "createdAt");

-- CreateTable
CREATE TABLE "AffiliateNotification" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" TEXT NOT NULL,
    "href" VARCHAR(300),
    "idempotencyKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffiliateNotification_idempotencyKey_key"
  ON "AffiliateNotification"("idempotencyKey");
CREATE INDEX "AffiliateNotification_affiliateProfileId_readAt_createdAt_idx"
  ON "AffiliateNotification"("affiliateProfileId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "ReferralClick" ADD CONSTRAINT "ReferralClick_trackingLinkId_fkey"
  FOREIGN KEY ("trackingLinkId") REFERENCES "AffiliateTrackingLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateTrackingLink" ADD CONSTRAINT "AffiliateTrackingLink_affiliateProfileId_fkey"
  FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateNotification" ADD CONSTRAINT "AffiliateNotification_affiliateProfileId_fkey"
  FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
