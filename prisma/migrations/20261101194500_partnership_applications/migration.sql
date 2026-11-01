-- Partnership applications: submissions from the /partners application
-- form, stored for admins to manage in /admin/partnerships.

-- CreateTable
CREATE TABLE "PartnershipApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "audienceSize" TEXT,
    "resources" TEXT NOT NULL,
    "seeking" TEXT NOT NULL,
    "proposal" TEXT NOT NULL,
    "opportunity" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "adminNotes" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnershipApplication_status_createdAt_idx" ON "PartnershipApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PartnershipApplication_type_createdAt_idx" ON "PartnershipApplication"("type", "createdAt");

-- CreateIndex
CREATE INDEX "PartnershipApplication_createdAt_idx" ON "PartnershipApplication"("createdAt");
