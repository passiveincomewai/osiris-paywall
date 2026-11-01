-- Fraud Radar Phase 11 SHV-11 (P11-A): separate FR subscription model
-- + billing-event idempotency table. Additive only; the house
-- Subscription table is untouched (AUDIT §6). No Stripe objects are
-- created by this migration — plans are data-only config until the
-- owner's P11-H operations step.
CREATE TABLE "FraudRadarSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "seatsPurchased" INTEGER,
    "isComp" BOOLEAN NOT NULL DEFAULT false,
    "compSource" TEXT,
    "compGrantedBy" TEXT,
    "compReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FraudRadarSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FraudRadarSubscription_userId_key" ON "FraudRadarSubscription"("userId");
CREATE UNIQUE INDEX "FraudRadarSubscription_stripeCustomerId_key" ON "FraudRadarSubscription"("stripeCustomerId");
CREATE UNIQUE INDEX "FraudRadarSubscription_stripeSubscriptionId_key" ON "FraudRadarSubscription"("stripeSubscriptionId");
CREATE INDEX "FraudRadarSubscription_status_idx" ON "FraudRadarSubscription"("status");
CREATE INDEX "FraudRadarSubscription_currentPeriodEnd_idx" ON "FraudRadarSubscription"("currentPeriodEnd");
CREATE INDEX "FraudRadarSubscription_stripePriceId_idx" ON "FraudRadarSubscription"("stripePriceId");
ALTER TABLE "FraudRadarSubscription" ADD CONSTRAINT "FraudRadarSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FrBillingEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL,
    "error" TEXT,
    CONSTRAINT "FrBillingEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FrBillingEvent_stripeEventId_key" ON "FrBillingEvent"("stripeEventId");
CREATE INDEX "FrBillingEvent_type_processedAt_idx" ON "FrBillingEvent"("type", "processedAt");
