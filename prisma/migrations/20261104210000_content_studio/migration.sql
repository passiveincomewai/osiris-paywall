-- Content Studio admin controls (2026-11-04): additive only — three
-- new tables for the autonomous content engine admin panel, no
-- changes to existing tables. The panel sets control state only and
-- never publishes anything. Applied to production via the Neon HTTP
-- endpoint at ship time (fleet practice) and kept here as the record.
CREATE TABLE IF NOT EXISTS "ContentPlatformState" (
  "platform" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'manual',
  "ceiling" TEXT NOT NULL DEFAULT 'manual',
  "paused" BOOLEAN NOT NULL DEFAULT false,
  "connectionStatus" TEXT NOT NULL DEFAULT 'not_connected',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentPlatformState_pkey" PRIMARY KEY ("platform")
);
CREATE TABLE IF NOT EXISTS "ContentControlEvent" (
  "id" TEXT NOT NULL,
  "actor" TEXT,
  "action" TEXT NOT NULL,
  "platform" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentControlEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ContentEngineSnapshot" (
  "id" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentEngineSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ContentControlEvent_createdAt_idx" ON "ContentControlEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "ContentEngineSnapshot_section_createdAt_idx" ON "ContentEngineSnapshot"("section", "createdAt");
INSERT INTO "ContentPlatformState" ("platform", "mode", "ceiling", "paused", "connectionStatus", "updatedAt") VALUES ('youtube_long', 'manual', 'autonomous', false, 'connected_studio_browser', CURRENT_TIMESTAMP) ON CONFLICT ("platform") DO NOTHING;
INSERT INTO "ContentPlatformState" ("platform", "mode", "ceiling", "paused", "connectionStatus", "updatedAt") VALUES ('youtube_shorts', 'manual', 'autonomous', false, 'connected_studio_browser', CURRENT_TIMESTAMP) ON CONFLICT ("platform") DO NOTHING;
INSERT INTO "ContentPlatformState" ("platform", "mode", "ceiling", "paused", "connectionStatus", "updatedAt") VALUES ('instagram_reels', 'manual', 'autonomous', false, 'link_dropped', CURRENT_TIMESTAMP) ON CONFLICT ("platform") DO NOTHING;
INSERT INTO "ContentPlatformState" ("platform", "mode", "ceiling", "paused", "connectionStatus", "updatedAt") VALUES ('tiktok', 'manual', 'hybrid', false, 'browser_route_signin_pending', CURRENT_TIMESTAMP) ON CONFLICT ("platform") DO NOTHING;
INSERT INTO "ContentPlatformState" ("platform", "mode", "ceiling", "paused", "connectionStatus", "updatedAt") VALUES ('x_twitter', 'manual', 'autonomous', false, 'browser_route_parked', CURRENT_TIMESTAMP) ON CONFLICT ("platform") DO NOTHING;
INSERT INTO "ContentPlatformState" ("platform", "mode", "ceiling", "paused", "connectionStatus", "updatedAt") VALUES ('reddit', 'manual', 'manual', false, 'draft_only', CURRENT_TIMESTAMP) ON CONFLICT ("platform") DO NOTHING;
INSERT INTO "ContentPlatformState" ("platform", "mode", "ceiling", "paused", "connectionStatus", "updatedAt") VALUES ('__global__', 'manual', 'autonomous', false, 'not_connected', CURRENT_TIMESTAMP) ON CONFLICT ("platform") DO NOTHING;
