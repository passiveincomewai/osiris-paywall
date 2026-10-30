-- Resources page: per-affiliate "mark as used / posted" state for the
-- copy templates (see model AffiliateTemplateUsage in schema.prisma).
-- Additive only: one new table, no changes to existing tables.

-- CreateTable
CREATE TABLE "AffiliateTemplateUsage" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "templateKind" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateTemplateUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateTemplateUsage_affiliateProfileId_idx" ON "AffiliateTemplateUsage"("affiliateProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateTemplateUsage_affiliateProfileId_templateKind_templateId_key" ON "AffiliateTemplateUsage"("affiliateProfileId", "templateKind", "templateId");

-- AddForeignKey
ALTER TABLE "AffiliateTemplateUsage" ADD CONSTRAINT "AffiliateTemplateUsage_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
