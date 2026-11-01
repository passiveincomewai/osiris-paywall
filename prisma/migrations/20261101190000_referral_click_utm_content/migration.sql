-- Per-creative attribution for the Studio Repurposing Machine: record
-- the utm_content parameter (the variation's creativeId) on referral
-- clicks, alongside the utm_source/medium/campaign captured since the
-- affiliate suite. Additive only; no attribution rule changes.
ALTER TABLE "ReferralClick" ADD COLUMN "utmContent" VARCHAR(120);
