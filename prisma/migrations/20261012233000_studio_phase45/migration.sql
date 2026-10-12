-- Marketing Studio Phases 4+5: campaigns + participations, badges,
-- ambassador applications, daily drops + claims; profile flags for the
-- link-in-bio showcase (showcaseEnabled) and ambassadors (isAmbassador);
-- A/B caption variant fields on StudioCreation. Additive only.

-- AlterTable
ALTER TABLE "AffiliateProfile" ADD COLUMN     "isAmbassador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showcaseEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StudioCreation" ADD COLUMN     "captionVariants" JSONB,
ADD COLUMN     "postedVariant" TEXT,
ADD COLUMN     "resultNote" TEXT;

-- CreateTable
CREATE TABLE "StudioCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "requiredHashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredCaptionSnippet" TEXT,
    "landingUrl" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "creditReward" INTEGER NOT NULL DEFAULT 0,
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "templateSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioCampaignParticipation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "reviewStatus" TEXT NOT NULL DEFAULT 'none',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioCampaignParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateBadge" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbassadorApplication" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "audience" INTEGER NOT NULL,
    "pitch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AmbassadorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioDrop" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "xpBonus" INTEGER NOT NULL DEFAULT 25,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioDrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioDropClaim" (
    "id" TEXT NOT NULL,
    "dropId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioDropClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioCampaign_status_startsAt_idx" ON "StudioCampaign"("status", "startsAt");

-- CreateIndex
CREATE INDEX "StudioCampaignParticipation_profileId_idx" ON "StudioCampaignParticipation"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioCampaignParticipation_campaignId_profileId_key" ON "StudioCampaignParticipation"("campaignId", "profileId");

-- CreateIndex
CREATE INDEX "AffiliateBadge_profileId_idx" ON "AffiliateBadge"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateBadge_profileId_badgeKey_key" ON "AffiliateBadge"("profileId", "badgeKey");

-- CreateIndex
CREATE INDEX "AmbassadorApplication_profileId_idx" ON "AmbassadorApplication"("profileId");

-- CreateIndex
CREATE INDEX "AmbassadorApplication_status_createdAt_idx" ON "AmbassadorApplication"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioDrop_date_key" ON "StudioDrop"("date");

-- CreateIndex
CREATE INDEX "StudioDrop_date_idx" ON "StudioDrop"("date");

-- CreateIndex
CREATE INDEX "StudioDropClaim_profileId_idx" ON "StudioDropClaim"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioDropClaim_dropId_profileId_key" ON "StudioDropClaim"("dropId", "profileId");

-- AddForeignKey
ALTER TABLE "StudioCampaignParticipation" ADD CONSTRAINT "StudioCampaignParticipation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "StudioCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioCampaignParticipation" ADD CONSTRAINT "StudioCampaignParticipation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateBadge" ADD CONSTRAINT "AffiliateBadge_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbassadorApplication" ADD CONSTRAINT "AmbassadorApplication_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioDrop" ADD CONSTRAINT "StudioDrop_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MarketingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioDropClaim" ADD CONSTRAINT "StudioDropClaim_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "StudioDrop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioDropClaim" ADD CONSTRAINT "StudioDropClaim_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

