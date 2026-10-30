-- Powder Pass favourite resorts: one follow row per (user, resort slug).
-- Additive only — no existing table is touched.

-- CreateTable
CREATE TABLE "SkiResortFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resortSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkiResortFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkiResortFollow_userId_idx" ON "SkiResortFollow"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkiResortFollow_userId_resortSlug_key" ON "SkiResortFollow"("userId", "resortSlug");

-- AddForeignKey
ALTER TABLE "SkiResortFollow" ADD CONSTRAINT "SkiResortFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
