-- Universal share identity: a personal share code for everyone,
-- including signed-out visitors (one identity per device token),
-- claimable by an account later (first-claim-wins). Signups recorded
-- against an unclaimed code wait in ShareReferral and are flushed
-- into ReferralAttribution when the identity is claimed.

-- CreateTable
CREATE TABLE "ShareIdentity" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "deviceTokenHash" TEXT NOT NULL,
    "claimedByUserId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "mintIpHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareClick" (
    "id" TEXT NOT NULL,
    "shareIdentityId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userAgent" VARCHAR(300),
    "path" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareReferral" (
    "id" TEXT NOT NULL,
    "shareIdentityId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "flushedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareIdentity_code_key" ON "ShareIdentity"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ShareIdentity_deviceTokenHash_key" ON "ShareIdentity"("deviceTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ShareIdentity_claimedByUserId_key" ON "ShareIdentity"("claimedByUserId");

-- CreateIndex
CREATE INDEX "ShareIdentity_mintIpHash_createdAt_idx" ON "ShareIdentity"("mintIpHash", "createdAt");

-- CreateIndex
CREATE INDEX "ShareClick_shareIdentityId_ipHash_createdAt_idx" ON "ShareClick"("shareIdentityId", "ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "ShareClick_createdAt_idx" ON "ShareClick"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareReferral_referredUserId_key" ON "ShareReferral"("referredUserId");

-- CreateIndex
CREATE INDEX "ShareReferral_shareIdentityId_idx" ON "ShareReferral"("shareIdentityId");

-- AddForeignKey
ALTER TABLE "ShareIdentity" ADD CONSTRAINT "ShareIdentity_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareClick" ADD CONSTRAINT "ShareClick_shareIdentityId_fkey" FOREIGN KEY ("shareIdentityId") REFERENCES "ShareIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareReferral" ADD CONSTRAINT "ShareReferral_shareIdentityId_fkey" FOREIGN KEY ("shareIdentityId") REFERENCES "ShareIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
