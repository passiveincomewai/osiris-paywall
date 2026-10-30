-- Affiliate demo join flow: a signed-in user's recorded acceptance of
-- the affiliate program terms (src/lib/affiliate/terms), written by
-- POST /api/affiliate/accept-terms immediately before enrolment via
-- /api/affiliate/join. One row per user per terms version.
-- Additive only: new table, no existing column touched.

-- CreateTable
CREATE TABLE "AffiliateTermsAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'demo',
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateTermsAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateTermsAcceptance_userId_idx" ON "AffiliateTermsAcceptance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateTermsAcceptance_userId_termsVersion_key" ON "AffiliateTermsAcceptance"("userId", "termsVersion");

-- AddForeignKey
ALTER TABLE "AffiliateTermsAcceptance" ADD CONSTRAINT "AffiliateTermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
