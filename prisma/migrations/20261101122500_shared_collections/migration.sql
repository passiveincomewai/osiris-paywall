-- Shareable camera collections: a visitor's themed public collection
-- of catalogue cameras (public page + rights-gated embed).
-- Additive only — no existing table is touched.

-- CreateTable
CREATE TABLE "SharedCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedCollection_userId_idx" ON "SharedCollection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedCollection_slug_key" ON "SharedCollection"("slug");

-- CreateIndex
CREATE INDEX "SharedCollectionItem_collectionId_position_idx" ON "SharedCollectionItem"("collectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "SharedCollectionItem_collectionId_cameraId_key" ON "SharedCollectionItem"("collectionId", "cameraId");

-- AddForeignKey
ALTER TABLE "SharedCollection" ADD CONSTRAINT "SharedCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedCollectionItem" ADD CONSTRAINT "SharedCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "SharedCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
