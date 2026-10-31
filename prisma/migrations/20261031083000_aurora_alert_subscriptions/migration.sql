-- Aurora alerts (item #21, owner-approved 2026-10-31): preset-place
-- aurora subscriptions for signed-in users, with the once-per-night
-- claim fields the sender uses (lastAlertNight = the place-local
-- evening date). Additive only: one new table, nothing else touched.

-- CreateTable
CREATE TABLE "AuroraAlertSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placeSlug" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "timeZone" TEXT NOT NULL,
    "magLat" DOUBLE PRECISION NOT NULL,
    "requiredKp" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastAlertNight" TEXT,
    "lastAlertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuroraAlertSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuroraAlertSubscription_active_idx" ON "AuroraAlertSubscription"("active");

-- CreateIndex
CREATE INDEX "AuroraAlertSubscription_userId_idx" ON "AuroraAlertSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuroraAlertSubscription_userId_placeSlug_key" ON "AuroraAlertSubscription"("userId", "placeSlug");

-- AddForeignKey
ALTER TABLE "AuroraAlertSubscription" ADD CONSTRAINT "AuroraAlertSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
