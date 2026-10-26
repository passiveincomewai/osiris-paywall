-- Submit-a-camera intake: public /submit-camera submissions, reviewed by
-- admins in /admin/camera-submissions. Approval marks a submission
-- cleared-for-import; the catalogue import is a separate ops step.
-- Branch-only migration: NOT applied to production by this branch.

-- CreateTable
CREATE TABLE "CameraSubmission" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "cameraName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "notes" TEXT,
    "submitterName" TEXT NOT NULL,
    "submitterEmail" TEXT NOT NULL,
    "declaration" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "probeStatus" TEXT NOT NULL DEFAULT 'unknown',
    "probeDetail" TEXT,
    "probedAt" TIMESTAMP(3),
    "reviewerNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "receiptEmailedAt" TIMESTAMP(3),
    "decisionEmailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CameraSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CameraSubmission_status_createdAt_idx" ON "CameraSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CameraSubmission_submitterEmail_idx" ON "CameraSubmission"("submitterEmail");

-- CreateIndex
CREATE INDEX "CameraSubmission_createdAt_idx" ON "CameraSubmission"("createdAt");
