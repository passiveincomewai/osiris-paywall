-- Transit route email alerts: subscriptions + sent-alert ledger.
-- Additive only — no existing table is touched.

-- CreateTable
CREATE TABLE "TransitAlertSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "routeSlug" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "alertsSent" INTEGER NOT NULL DEFAULT 0,
    "conversionEmailSentAt" TIMESTAMP(3),
    "unsubToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransitAlertSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransitAlertSend" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "alertUpdatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransitAlertSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransitAlertSubscription_email_agency_routeId_key" ON "TransitAlertSubscription"("email", "agency", "routeId");

-- CreateIndex
CREATE INDEX "TransitAlertSubscription_agency_routeId_status_idx" ON "TransitAlertSubscription"("agency", "routeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TransitAlertSubscription_unsubToken_key" ON "TransitAlertSubscription"("unsubToken");

-- CreateIndex
CREATE UNIQUE INDEX "TransitAlertSend_subscriptionId_alertId_alertUpdatedAt_key" ON "TransitAlertSend"("subscriptionId", "alertId", "alertUpdatedAt");

-- CreateIndex
CREATE INDEX "TransitAlertSend_subscriptionId_idx" ON "TransitAlertSend"("subscriptionId");

-- AddForeignKey
ALTER TABLE "TransitAlertSend" ADD CONSTRAINT "TransitAlertSend_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "TransitAlertSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
