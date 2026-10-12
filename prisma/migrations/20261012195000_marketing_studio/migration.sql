-- Marketing Studio (Phase 1): affiliate ad templates + saved creations.
-- Creations store render params, not files; downloads re-render
-- deterministically (see src/lib/studio/).
CREATE TABLE "MarketingTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "svgBody" TEXT,
    "assetUrl" TEXT,
    "previewUrl" TEXT,
    "editableFields" JSONB NOT NULL,
    "layers" JSONB,
    "carouselGroup" TEXT,
    "slideIndex" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingTemplate_slug_key" ON "MarketingTemplate"("slug");
CREATE INDEX "MarketingTemplate_category_active_featured_idx" ON "MarketingTemplate"("category", "active", "featured");
CREATE INDEX "MarketingTemplate_publishAt_idx" ON "MarketingTemplate"("publishAt");
CREATE TABLE "StudioCreation" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "campaignKey" TEXT,
    "params" JSONB NOT NULL,
    "renderHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioCreation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudioCreation_affiliateProfileId_createdAt_idx" ON "StudioCreation"("affiliateProfileId", "createdAt");
CREATE INDEX "StudioCreation_renderHash_idx" ON "StudioCreation"("renderHash");
ALTER TABLE "StudioCreation" ADD CONSTRAINT "StudioCreation_affiliateProfileId_fkey"
  FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioCreation" ADD CONSTRAINT "StudioCreation_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "MarketingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
