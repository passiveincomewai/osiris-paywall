-- Powder #5 (rescoped): snow-stake overnight capture nights.
CREATE TABLE "SkiStakeNight" (
    "id" TEXT NOT NULL,
    "resortSlug" TEXT NOT NULL,
    "nightKey" TEXT NOT NULL,
    "frames" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkiStakeNight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SkiStakeNight_resortSlug_nightKey_key" ON "SkiStakeNight"("resortSlug", "nightKey");

CREATE INDEX "SkiStakeNight_nightKey_idx" ON "SkiStakeNight"("nightKey");
