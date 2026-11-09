-- Support WorldEye donations (2026-11-09): additive only. One row per
-- completed donation (webhook-written), a supporter flag on User so
-- prompts stop for donors, and the Donation table. No changes to any
-- subscription/plan table — donations never grant plan access.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "supporter" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "frequency" TEXT NOT NULL,
    "source" TEXT,
    "stripeRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Donation_stripeRef_key" ON "Donation"("stripeRef");

-- CreateIndex
CREATE INDEX "Donation_userId_idx" ON "Donation"("userId");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
