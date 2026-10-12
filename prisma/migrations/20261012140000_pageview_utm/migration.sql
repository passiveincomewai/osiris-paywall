-- First-touch UTM attribution on first-party analytics (Growth Engine hybrid integration)
ALTER TABLE "PageView" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "PageView" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "PageView" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "PageView" ADD COLUMN "utmContent" TEXT;
CREATE INDEX "PageView_utmCampaign_createdAt_idx" ON "PageView"("utmCampaign", "createdAt");
