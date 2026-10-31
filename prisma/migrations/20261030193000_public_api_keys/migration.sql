-- Public developer API: scope the existing API-key table so the same
-- credential machinery can serve the self-serve public API (/api/v1)
-- alongside the Enterprise collections API, and give public keys a
-- daily quota window. Additive only — existing rows default to the
-- "enterprise" scope they already serve.

-- AlterTable
ALTER TABLE "EnterpriseApiKey" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'enterprise';
ALTER TABLE "EnterpriseApiKey" ADD COLUMN "rateWindowStart" TIMESTAMP(3);
ALTER TABLE "EnterpriseApiKey" ADD COLUMN "rateWindowCount" INTEGER NOT NULL DEFAULT 0;
