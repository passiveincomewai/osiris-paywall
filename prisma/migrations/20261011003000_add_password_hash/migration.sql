-- Add passwordHash for email+password sign-in (null for OAuth/magic-link users)
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
