-- Onboarding & Activation analytics (Build B): two additive, nullable
-- columns on PageView. `variant` carries the onboarding A/B experiment
-- group ("A" | "B"); `device` carries the coarse device class
-- ("mobile" | "tablet" | "desktop"). Both are stamped by the analytics
-- ingest route; existing rows stay NULL and report as "unknown".

-- AlterTable
ALTER TABLE "PageView" ADD COLUMN     "variant" TEXT,
ADD COLUMN     "device" TEXT;
