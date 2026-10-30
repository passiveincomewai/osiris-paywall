-- Ski trip booking reminders: one row per (user, resort, arrival date).
-- Additive only — no existing table is touched; the User relation is a
-- foreign key from the new table, not a change to "User".

-- CreateTable
CREATE TABLE "SkiTripReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "resortSlug" TEXT NOT NULL,
    "resortName" TEXT NOT NULL,
    "tripStart" TIMESTAMP(3) NOT NULL,
    "tripEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "sent45At" TIMESTAMP(3),
    "sent14At" TIMESTAMP(3),
    "unsubToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkiTripReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkiTripReminder_status_tripStart_idx" ON "SkiTripReminder"("status", "tripStart");

-- CreateIndex
CREATE UNIQUE INDEX "SkiTripReminder_unsubToken_key" ON "SkiTripReminder"("unsubToken");

-- CreateIndex
CREATE UNIQUE INDEX "SkiTripReminder_userId_resortSlug_tripStart_key" ON "SkiTripReminder"("userId", "resortSlug", "tripStart");

-- AddForeignKey
ALTER TABLE "SkiTripReminder" ADD CONSTRAINT "SkiTripReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
