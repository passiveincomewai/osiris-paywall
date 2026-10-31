-- Gift subscriptions (2026-10-31): one prepaid term of a grid plan,
-- bought for a recipient and redeemed against their account
-- (src/lib/billing/gift.ts). Additive only — a new enum + table;
-- nothing existing is altered beyond the two FK references into User.

-- CreateEnum
CREATE TYPE "GiftSubscriptionStatus" AS ENUM ('pending', 'paid', 'redeemed', 'expired');

-- CreateTable
CREATE TABLE "GiftSubscription" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "buyerUserId" TEXT,
    "buyerEmail" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "status" "GiftSubscriptionStatus" NOT NULL DEFAULT 'pending',
    "stripeCheckoutSessionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "redeemedByUserId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftSubscription_code_key" ON "GiftSubscription"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GiftSubscription_stripeCheckoutSessionId_key" ON "GiftSubscription"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftSubscription_stripeSubscriptionId_key" ON "GiftSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "GiftSubscription_recipientEmail_idx" ON "GiftSubscription"("recipientEmail");

-- CreateIndex
CREATE INDEX "GiftSubscription_status_idx" ON "GiftSubscription"("status");

-- AddForeignKey
ALTER TABLE "GiftSubscription" ADD CONSTRAINT "GiftSubscription_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftSubscription" ADD CONSTRAINT "GiftSubscription_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
