-- Enterprise camera feed: collections, their camera picks, and API keys.
-- Secrets (feed tokens, API keys) are stored only as SHA-256 hashes;
-- plaintext is shown to the customer once and never persisted.

-- CreateTable
CREATE TABLE "CameraCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feedTokenHash" TEXT,
    "feedHits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CameraCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CameraCollection_userId_idx" ON "CameraCollection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CameraCollection_feedTokenHash_key" ON "CameraCollection"("feedTokenHash");

-- CreateIndex
CREATE INDEX "CameraCollectionItem_collectionId_idx" ON "CameraCollectionItem"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "CameraCollectionItem_collectionId_cameraId_key" ON "CameraCollectionItem"("collectionId", "cameraId");

-- CreateIndex
CREATE INDEX "EnterpriseApiKey_userId_idx" ON "EnterpriseApiKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseApiKey_keyHash_key" ON "EnterpriseApiKey"("keyHash");

-- AddForeignKey
ALTER TABLE "CameraCollection" ADD CONSTRAINT "CameraCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraCollectionItem" ADD CONSTRAINT "CameraCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "CameraCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseApiKey" ADD CONSTRAINT "EnterpriseApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
