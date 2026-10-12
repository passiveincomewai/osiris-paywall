-- Add optional event name to PageView for scroll-depth / interaction events
ALTER TABLE "PageView" ADD COLUMN "event" TEXT;
CREATE INDEX "PageView_event_createdAt_idx" ON "PageView"("event", "createdAt");
