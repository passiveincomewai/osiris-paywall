-- Fraud Radar Phase 2: the HCPCS summary's distinct-provider counts
-- are nullable in the source aggregates (a code whose reported cells
-- never carry that role's NPI has NO distinct count — absent, not 0).
-- 1,373 billing / 1,530 servicing of 12,263 codes in dataset
-- 2026-02-09. Dropping NOT NULL keeps the Neon grain as honest as
-- the artifacts; no rows exist yet in either table.
ALTER TABLE "FrHcpcsSummary" ALTER COLUMN "distinctBillingNpis" DROP NOT NULL;
ALTER TABLE "FrHcpcsSummary" ALTER COLUMN "distinctServicingNpis" DROP NOT NULL;
