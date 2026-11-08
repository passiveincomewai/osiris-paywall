-- Instagram OAuth handshake store for the Multilogin fleet's per-account
-- Instagram Login flow: single-use state nonces (stored as SHA-256 hashes),
-- one-time authorization-code pickup. Additive only.

-- CreateTable
CREATE TABLE "IgOAuthHandshake" (
    "id" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "pickedUpAt" TIMESTAMP(3),

    CONSTRAINT "IgOAuthHandshake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IgOAuthHandshake_nonceHash_key" ON "IgOAuthHandshake"("nonceHash");

-- CreateIndex
CREATE INDEX "IgOAuthHandshake_expiresAt_idx" ON "IgOAuthHandshake"("expiresAt");
