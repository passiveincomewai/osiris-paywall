-- WorldEye Ambient: per-member YouTube restream credentials for the
-- Stream to YouTube feature (src/lib/ambient). The stream key is
-- stored AES-256-GCM-encrypted (keyCiphertext); the relay token is
-- stored only as its SHA-256 hash (relayTokenHash).
-- STAGED migration: NOT applied to production by this branch — the
-- parent applies it with the owner's approval at ship time.

-- CreateTable
CREATE TABLE "AmbientStreamKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyCiphertext" TEXT NOT NULL,
    "relayTokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbientStreamKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmbientStreamKey_userId_key" ON "AmbientStreamKey"("userId");

-- AddForeignKey
ALTER TABLE "AmbientStreamKey" ADD CONSTRAINT "AmbientStreamKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
