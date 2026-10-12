-- Marketing Studio Phase 3: Cosmo-fulfilled AI jobs + credit packs.
-- AI results land on the GenerationJob (text) and on the StudioCreation
-- it produces (text + optional image bytes, capped ≈2.5MB at the
-- fulfillment endpoint so no blob storage is needed yet). The ledger
-- gains an idempotency key so a replayed Stripe webhook can never
-- double-credit a credit-pack purchase.
ALTER TABLE "GenerationJob" ADD COLUMN "resultText" TEXT;
ALTER TABLE "StudioCreation" ADD COLUMN "resultText" TEXT;
ALTER TABLE "StudioCreation" ADD COLUMN "resultImageBytes" BYTEA;
ALTER TABLE "StudioCreation" ADD COLUMN "resultImageMime" TEXT;
ALTER TABLE "StudioCreditLedger" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "StudioCreditLedger_idempotencyKey_key" ON "StudioCreditLedger"("idempotencyKey");
