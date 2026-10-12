-- Creator free-Pro program: applications from creators with 25k+ followers.
-- Approved applications receive a comp Subscription (see src/lib/pro/comp.ts).
CREATE TABLE "CreatorApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "profileUrl" TEXT NOT NULL,
  "followers" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "CreatorApplication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CreatorApplication_userId_idx" ON "CreatorApplication"("userId");
CREATE INDEX "CreatorApplication_status_createdAt_idx" ON "CreatorApplication"("status", "createdAt");
ALTER TABLE "CreatorApplication" ADD CONSTRAINT "CreatorApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
