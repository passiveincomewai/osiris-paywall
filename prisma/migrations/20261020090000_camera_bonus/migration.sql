-- Invite-a-friend camera bonus: a per-user spendable balance of bonus
-- camera opens, plus the grant ledger that makes each award
-- one-per-invited-account (unique invitee), ever.

-- CreateTable
CREATE TABLE "CameraBonusAccount" (
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraBonusAccount_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CameraBonusGrant" (
    "id" TEXT NOT NULL,
    "inviteeUserId" TEXT NOT NULL,
    "inviterUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CameraBonusGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CameraBonusGrant_inviteeUserId_key" ON "CameraBonusGrant"("inviteeUserId");

-- CreateIndex
CREATE INDEX "CameraBonusGrant_inviterUserId_idx" ON "CameraBonusGrant"("inviterUserId");

-- AddForeignKey
ALTER TABLE "CameraBonusAccount" ADD CONSTRAINT "CameraBonusAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
