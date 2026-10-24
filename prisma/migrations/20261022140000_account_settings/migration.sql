-- Account settings expansion (2026-10-22): preferences store, TOTP,
-- device sessions, sign-in history, referral-code aliases, account
-- deletion grace fields, clip-share visibility.
-- Branch-only migration: NOT applied to production by this branch.

-- AlterTable: account deletion grace period
ALTER TABLE "User" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deletionScheduledFor" TIMESTAMP(3);

-- AlterTable: share-link visibility default for new clip shares
ALTER TABLE "ClipShare" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'public';

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "homeLabel" TEXT,
    "homeLat" DOUBLE PRECISION,
    "homeLng" DOUBLE PRECISION,
    "defaultLayers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "units" TEXT NOT NULL DEFAULT 'imperial',
    "timezone" TEXT,
    "clockFormat" TEXT NOT NULL DEFAULT '12',
    "defaultMapStyle" TEXT NOT NULL DEFAULT 'standard',
    "performanceMode" BOOLEAN NOT NULL DEFAULT false,
    "cameraGridDensity" TEXT NOT NULL DEFAULT 'comfortable',
    "cameraPreviewRefreshSeconds" INTEGER NOT NULL DEFAULT 30,
    "cameraAutoplay" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT NOT NULL DEFAULT '22:00',
    "quietHoursEnd" TEXT NOT NULL DEFAULT '07:00',
    "cameraAlertChannel" TEXT NOT NULL DEFAULT 'email',
    "eventAlertChannel" TEXT NOT NULL DEFAULT 'email',
    "recordingClipSeconds" INTEGER NOT NULL DEFAULT 60,
    "recordingQuality" TEXT NOT NULL DEFAULT 'balanced',
    "emailTrialReminders" BOOLEAN NOT NULL DEFAULT true,
    "emailWeeklyDigest" BOOLEAN NOT NULL DEFAULT false,
    "emailProductNews" BOOLEAN NOT NULL DEFAULT true,
    "emailAffiliateUpdates" BOOLEAN NOT NULL DEFAULT true,
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "digestLastSentAt" TIMESTAMP(3),
    "publicProfile" BOOLEAN NOT NULL DEFAULT true,
    "shareVisibility" TEXT NOT NULL DEFAULT 'public',
    "billingEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTotp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secretEncrypted" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3),
    "backupCodeHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTotp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDeviceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "userAgent" VARCHAR(500),
    "ipHash" TEXT,
    "approximateLocation" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSignInEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceLabel" TEXT NOT NULL,
    "ipHash" TEXT,
    "approximateLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSignInEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCodeAlias" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCodeAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");
CREATE UNIQUE INDEX "UserTotp_userId_key" ON "UserTotp"("userId");
CREATE UNIQUE INDEX "UserDeviceSession_userId_deviceId_key" ON "UserDeviceSession"("userId", "deviceId");
CREATE INDEX "UserDeviceSession_userId_revokedAt_lastSeenAt_idx" ON "UserDeviceSession"("userId", "revokedAt", "lastSeenAt");
CREATE INDEX "UserSignInEvent_userId_createdAt_idx" ON "UserSignInEvent"("userId", "createdAt");
CREATE INDEX "UserSignInEvent_userId_deviceId_createdAt_idx" ON "UserSignInEvent"("userId", "deviceId", "createdAt");
CREATE UNIQUE INDEX "ReferralCodeAlias_code_key" ON "ReferralCodeAlias"("code");
CREATE INDEX "ReferralCodeAlias_affiliateProfileId_idx" ON "ReferralCodeAlias"("affiliateProfileId");
CREATE INDEX "ReferralCodeAlias_userId_idx" ON "ReferralCodeAlias"("userId");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserTotp" ADD CONSTRAINT "UserTotp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserDeviceSession" ADD CONSTRAINT "UserDeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSignInEvent" ADD CONSTRAINT "UserSignInEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralCodeAlias" ADD CONSTRAINT "ReferralCodeAlias_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralCodeAlias" ADD CONSTRAINT "ReferralCodeAlias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
