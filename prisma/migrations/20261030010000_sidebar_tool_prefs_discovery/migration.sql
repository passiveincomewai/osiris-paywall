-- Additive only: sidebar tool-strip preferences (UserPreference) and
-- the set-once "how did you find out about us" answers (User).
ALTER TABLE "UserPreference" ADD COLUMN "sidebarToolOrder" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserPreference" ADD COLUMN "sidebarToolHidden" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "discoverySource" TEXT;
ALTER TABLE "User" ADD COLUMN "discoveryDetail" TEXT;
