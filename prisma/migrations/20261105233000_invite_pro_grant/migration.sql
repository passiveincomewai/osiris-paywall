-- Invite-a-friend Pro-days reward ledger (2026-11-05): additive only —
-- one new table, no changes to existing tables. The reward pays +7
-- days of Pro through the comp engine when a referred friend verifies
-- their email; this ledger is the one-reward-per-referred-account
-- record (see src/lib/invite-pro.ts). Applied to production via the
-- Neon HTTP endpoint at ship time (fleet practice) and kept here as
-- the record.
CREATE TABLE IF NOT EXISTS "InviteProGrant" (
  "id" TEXT NOT NULL,
  "inviteeUserId" TEXT NOT NULL,
  "inviterUserId" TEXT NOT NULL,
  "days" INTEGER NOT NULL DEFAULT 7,
  "status" TEXT NOT NULL DEFAULT 'granted',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),
  CONSTRAINT "InviteProGrant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "InviteProGrant_inviteeUserId_key" ON "InviteProGrant" ("inviteeUserId");
CREATE INDEX IF NOT EXISTS "InviteProGrant_inviterUserId_idx" ON "InviteProGrant" ("inviterUserId");
CREATE INDEX IF NOT EXISTS "InviteProGrant_inviterUserId_createdAt_idx" ON "InviteProGrant" ("inviterUserId", "createdAt");
