-- Affiliate payouts: Venmo becomes the live-flow payout method (2026-10-30).
-- Additive only: a nullable Venmo handle on the profile, and the last
-- status the affiliate was emailed about on the payout (email idempotency).
-- Legacy "paypal" method values are untouched — they remain on historical
-- records only.
ALTER TABLE "AffiliateProfile" ADD COLUMN "venmoHandle" TEXT;
ALTER TABLE "Payout" ADD COLUMN "lastEmailedStatus" TEXT;
