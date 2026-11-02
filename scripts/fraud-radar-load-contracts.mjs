/**
 * Fraud Radar Phase 5 — load the contracts Neon grain (AUDIT §15a).
 *
 * Reads a published contracts artifact directory (produced by
 * app-publish/publish_contracts.py) and replaces, per dataset
 * version:
 *   - FrContractsYearlySummary  (from contracts-neon.json "yearly")
 *   - FrContractsNaicsSummary   (from contracts-neon.json "naics")
 *   - FrContractsPscSummary     (from contracts-neon.json "psc")
 *   - FrContractsAgencySummary  (from contracts-neon.json "agency")
 * and appends an FrImportRun row to the registry for source
 * "usaspending" (the contracts dataset under the single shared
 * USAspending source entry — Phase 5 extends that entry, no
 * second slug), deduped by version + sha256 of dataset.json.
 *
 * All grains load under dataset.json's version ("2026-10-06",
 * the USAspending archive generation shared with Phase 4
 * assistance — datasetVersion is a column value).
 *
 * Run manually by an operator AFTER the
 * fraud_radar_contracts_summaries migration has been applied:
 *
 *   node scripts/fraud-radar-load-contracts.mjs <artifactDir>
 *
 * Idempotent: grain rows are replaced per dataset version on
 * every run; import-run history is append-only and deduped. NOT
 * part of any build or deploy. Amounts keep their source
 * semantics: USAspending figures are award-cumulative snapshot
 * totals (never fiscal-year obligations); ceilings are not
 * obligations and are not in this grain; FAC does not cover
 * contracts. Outlay may arrive null (no outlay on the winning
 * snapshots) — null is stored as absence, never coerced to zero;
 * a null in a NOT NULL amount column is a contract break.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const artifactDir = process.argv[2];
if (!artifactDir) {
  console.error("usage: node scripts/fraud-radar-load-contracts.mjs <artifactDir>");
  process.exit(2);
}

const readJson = (name) => JSON.parse(readFileSync(path.join(artifactDir, name), "utf8"));
const datasetRaw = readFileSync(path.join(artifactDir, "dataset.json"));
const dataset = JSON.parse(datasetRaw);
const neon = readJson("contracts-neon.json"); // plain-object arrays (contract)
const publishManifest = existsSync(path.join(artifactDir, "publish-manifest.json"))
  ? readJson("publish-manifest.json")
  : null;
const version = dataset.version;
const datasetSha = createHash("sha256").update(datasetRaw).digest("hex");

// Defensive coercions (grants loader parity): "-" / "" text is
// absent (null), counts arriving as floats/strings are truncated
// to integers, and a null in a NOT NULL amount column is a
// contract break — fail loudly rather than storing a fabricated
// value. Nullable amounts (outlay) keep null as absence.
const strOrNull = (v) => (v == null || v === "" || v === "-" ? null : String(v));
const reqStr = (v) => {
  const s = strOrNull(v);
  if (s == null) throw new Error(`contracts-neon.json: required string missing (got ${JSON.stringify(v)})`);
  return s.trim();
};
const toBig = (v) => BigInt(v == null ? 0 : Math.trunc(Number(v)));
const toInt = (v) => (v == null ? 0 : Math.trunc(Number(v)));
const dec = (v) => {
  if (v == null) throw new Error("contracts-neon.json: amount column arrived null — publisher contract break");
  return String(v);
};
const decOrNull = (v) => (v == null ? null : String(v));

const db = new PrismaClient();
try {
  const usaspending = await db.frDataSource.findUnique({ where: { slug: "usaspending" } });
  if (!usaspending) throw new Error("registry source usaspending not found — run the registry seed first");

  const yearly = neon.yearly ?? [];
  const naics = neon.naics ?? [];
  const psc = neon.psc ?? [];
  const agency = neon.agency ?? [];

  await db.$transaction(
    async (tx) => {
      await tx.frContractsYearlySummary.deleteMany({ where: { datasetVersion: version } });
      const yearlyRows = yearly.map((r) => ({
        datasetVersion: version,
        fiscalYear: toInt(r.fiscalYear),
        awards: toBig(r.awards),
        distinctVendors: toInt(r.distinctVendors),
        obligatedAwardCumulativeUsd: dec(r.obligatedAwardCumulativeUsd),
        outlayAwardCumulativeUsd: decOrNull(r.outlayAwardCumulativeUsd),
        transactions: toBig(r.transactionsInWindow),
        modifications: toBig(r.modificationsInWindow),
      }));
      for (let i = 0; i < yearlyRows.length; i += 1000) {
        await tx.frContractsYearlySummary.createMany({ data: yearlyRows.slice(i, i + 1000) });
      }

      await tx.frContractsNaicsSummary.deleteMany({ where: { datasetVersion: version } });
      const naicsRows = naics.map((r) => ({
        datasetVersion: version,
        // P5-A2: the publisher's null-code row (no NAICS code on
        // the winning snapshot) loads as null — absence, never a
        // fabricated sentinel code.
        naics: strOrNull(r.naics),
        naicsDescription: strOrNull(r.naicsDescription),
        attributedFiscalYear: toInt(r.attributedFiscalYear),
        awards: toBig(r.awards),
        distinctVendors: toInt(r.distinctVendors),
        distinctPscCodes: toInt(r.distinctPscCodes),
        obligatedAwardCumulativeUsd: dec(r.obligatedAwardCumulativeUsd),
        outlayAwardCumulativeUsd: decOrNull(r.outlayAwardCumulativeUsd),
        transactionsInWindow: toBig(r.transactionsInWindow),
        modificationsInWindow: toBig(r.modificationsInWindow),
      }));
      for (let i = 0; i < naicsRows.length; i += 1000) {
        await tx.frContractsNaicsSummary.createMany({ data: naicsRows.slice(i, i + 1000) });
      }

      await tx.frContractsPscSummary.deleteMany({ where: { datasetVersion: version } });
      const pscRows = psc.map((r) => ({
        datasetVersion: version,
        // P5-A2: same published null-code row as NAICS.
        psc: strOrNull(r.psc),
        pscDescription: strOrNull(r.pscDescription),
        attributedFiscalYear: toInt(r.attributedFiscalYear),
        awards: toBig(r.awards),
        distinctVendors: toInt(r.distinctVendors),
        distinctNaicsCodes: toInt(r.distinctNaicsCodes),
        obligatedAwardCumulativeUsd: dec(r.obligatedAwardCumulativeUsd),
        outlayAwardCumulativeUsd: decOrNull(r.outlayAwardCumulativeUsd),
        transactionsInWindow: toBig(r.transactionsInWindow),
        modificationsInWindow: toBig(r.modificationsInWindow),
      }));
      for (let i = 0; i < pscRows.length; i += 1000) {
        await tx.frContractsPscSummary.createMany({ data: pscRows.slice(i, i + 1000) });
      }

      await tx.frContractsAgencySummary.deleteMany({ where: { datasetVersion: version } });
      const agencyRows = agency.map((r) => ({
        datasetVersion: version,
        agency: reqStr(r.agency),
        agencyCode: strOrNull(r.agencyCode),
        attributedFiscalYear: toInt(r.attributedFiscalYear),
        awards: toBig(r.awards),
        distinctVendors: toInt(r.distinctVendors),
        obligatedAwardCumulativeUsd: dec(r.obligatedAwardCumulativeUsd),
        outlayAwardCumulativeUsd: decOrNull(r.outlayAwardCumulativeUsd),
        transactionsInWindow: toBig(r.transactionsInWindow),
        modificationsInWindow: toBig(r.modificationsInWindow),
      }));
      for (let i = 0; i < agencyRows.length; i += 1000) {
        await tx.frContractsAgencySummary.createMany({ data: agencyRows.slice(i, i + 1000) });
      }

      console.log(
        `loaded FrContractsYearlySummary=${yearlyRows.length} FrContractsNaicsSummary=${naicsRows.length} ` +
          `FrContractsPscSummary=${pscRows.length} FrContractsAgencySummary=${agencyRows.length}`,
      );
    },
    { timeout: 600_000 },
  );

  const totalRows = BigInt(yearly.length + naics.length + psc.length + agency.length);
  const existing = await db.frImportRun.findFirst({
    where: { sourceId: usaspending.id, datasetVersion: version, artifactSha256: datasetSha },
  });
  if (existing) {
    console.log(`import run already recorded for usaspending ${version} (contracts); skipped`);
  } else {
    await db.frImportRun.create({
      data: {
        sourceId: usaspending.id,
        datasetVersion: version,
        status: "succeeded",
        finishedAt: new Date(),
        rowsProcessed: totalRows,
        rowsValid: totalRows,
        rowsQuarantined: 0n,
        artifactPath: `fraud-radar/contracts/${version}`,
        artifactSha256: datasetSha,
        manifest: {
          kind: "app-artifact-publish",
          dataset: dataset.dataset,
          version,
          fiscalYears: dataset.fiscalYears,
          vendors: dataset.vendors,
          awards: dataset.awards,
          crossChecks: publishManifest?.crossChecks ?? publishManifest?.cross_checks ?? null,
        },
      },
    });
    console.log(`recorded FrImportRun for usaspending ${version} (contracts dataset)`);
  }
  console.log("done");
} finally {
  await db.$disconnect();
}
