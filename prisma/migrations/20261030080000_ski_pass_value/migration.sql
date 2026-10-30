-- Powder Pass pass-value tracker: the member's own pass season (what
-- THEY paid, their own typical day price) and the days they log
-- against it. User-entered data only. Additive only — no existing
-- table is touched.

-- CreateTable
CREATE TABLE "SkiPassSeason" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL,
    "dayPriceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkiPassSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkiPassDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skiedOn" TIMESTAMP(3) NOT NULL,
    "resortSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkiPassDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkiPassSeason_userId_key" ON "SkiPassSeason"("userId");

-- CreateIndex
CREATE INDEX "SkiPassDay_userId_idx" ON "SkiPassDay"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkiPassDay_userId_skiedOn_resortSlug_key" ON "SkiPassDay"("userId", "skiedOn", "resortSlug");

-- AddForeignKey
ALTER TABLE "SkiPassSeason" ADD CONSTRAINT "SkiPassSeason_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkiPassDay" ADD CONSTRAINT "SkiPassDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
