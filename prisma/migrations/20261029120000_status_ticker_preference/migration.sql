-- Item 5 (2026-10-29): the globe's bottom status ticker (crypto prices +
-- major earthquakes) becomes an opt-in account preference, default OFF.
ALTER TABLE "UserPreference" ADD COLUMN "showStatusTicker" BOOLEAN NOT NULL DEFAULT false;
