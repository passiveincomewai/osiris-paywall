-- Newsletter subscribers (double opt-in) + abandoned checkout tracking
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifyToken" TEXT,
    "unsubToken" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
CREATE UNIQUE INDEX "NewsletterSubscriber_verifyToken_key" ON "NewsletterSubscriber"("verifyToken");
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubToken_key" ON "NewsletterSubscriber"("unsubToken");
CREATE INDEX "NewsletterSubscriber_verified_idx" ON "NewsletterSubscriber"("verified");

CREATE TABLE "CheckoutAttempt" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "email" TEXT,
    "plan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'started',
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CheckoutAttempt_stripeSessionId_key" ON "CheckoutAttempt"("stripeSessionId");
CREATE INDEX "CheckoutAttempt_status_createdAt_idx" ON "CheckoutAttempt"("status", "createdAt");
