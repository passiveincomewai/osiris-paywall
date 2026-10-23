-- Lifecycle email system (src/lib/lifecycle): a marketing opt-out flag
-- on User plus the send log that is the system's never-double-send
-- memory and 48h-cap ledger. Written for branch
-- feature/lifecycle-emails; NOT applied to production — the parent
-- applies it with the Wave 2 deploy (see that branch's REPORT.md).

-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailOptOut" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LifecycleEmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "contextKey" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifecycleEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LifecycleEmailLog_userId_template_contextKey_key" ON "LifecycleEmailLog"("userId", "template", "contextKey");

-- CreateIndex
CREATE INDEX "LifecycleEmailLog_userId_createdAt_idx" ON "LifecycleEmailLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LifecycleEmailLog_recipientEmail_createdAt_idx" ON "LifecycleEmailLog"("recipientEmail", "createdAt");

-- CreateTable
CREATE TABLE "DigestSendLog" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "issueKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigestSendLog_email_issueKey_key" ON "DigestSendLog"("email", "issueKey");

-- CreateIndex
CREATE INDEX "DigestSendLog_issueKey_idx" ON "DigestSendLog"("issueKey");

-- AddForeignKey
ALTER TABLE "LifecycleEmailLog" ADD CONSTRAINT "LifecycleEmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
