-- Competitor comparison system (powers /compare + /compare/[slug])
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "categories" TEXT[] NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "pricing" TEXT,
    "whyWorldEye" JSONB NOT NULL DEFAULT '[]',
    "competitorWins" TEXT,
    "verdictWorldEye" TEXT,
    "verdictCompetitor" TEXT,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "lastReviewed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Competitor_slug_key" ON "Competitor"("slug");
CREATE INDEX "Competitor_published_idx" ON "Competitor"("published");
