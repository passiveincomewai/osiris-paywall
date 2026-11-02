-- Fraud Radar Phase 5 (P5-A2): nullable NAICS / PSC codes.
-- The publisher's contracts-neon.json carries one null-code row
-- per attributed fiscal year in each of the NAICS and PSC grains
-- (awards whose winning snapshot reports no code: NAICS 3,555
-- awards, PSC 921 awards in generation 2026-10-06). Those rows
-- are part of the published grain — every grain reconciles to
-- the same 42,446,263 award total only with them included.
-- Absence is stored as NULL, never as a fabricated sentinel
-- code. Additive only: two columns drop their NOT NULL
-- constraint; no data is rewritten.

-- AlterTable
ALTER TABLE "FrContractsNaicsSummary" ALTER COLUMN "naics" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FrContractsPscSummary" ALTER COLUMN "psc" DROP NOT NULL;
