-- Camera requests: demand capture from the globe/directory search
-- empty states ("Request this camera"), stored for admins to read in
-- /admin/camera-requests. Additive only.

-- CreateTable
CREATE TABLE "CameraRequest" (
    "id" TEXT NOT NULL,
    "query" TEXT,
    "placeText" TEXT NOT NULL,
    "email" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CameraRequest_status_createdAt_idx" ON "CameraRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CameraRequest_placeText_idx" ON "CameraRequest"("placeText");
