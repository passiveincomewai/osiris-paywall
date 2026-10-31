/**
 * Fraud Radar Phase 4 — load the grants Neon grain (AUDIT §15a).
 *
 * Reads a published grants artifact directory (produced by
 * app-publish/publish_grants.py) and replaces, per dataset version:
 *   - FrGrantsYearlySummary  (from grants-neon.json "yearly")
 *   - FrGrantsAlnSummary     (from grants-neon.json "aln")
 *   - FrGrantsAgencySummary  (from grants-neon.json "agency")
 *   - FrFacYearlySummary     (from grants-neon.json "facYearly")
 * and appends FrImportRun rows to the registry for sources
 * "usaspending" (the three grants grains) and "fac" (the FAC
 * grain), one per publication, deduped by version + sha256.
 *
 * The grants grains load under dataset.json's version
 * ("2026-10-06", the USAspending generation); the FAC grain loads
 * under dataset.json's facVersion ("2026-10-31_ay2026", the FAC
 * vintage) — datasetVersion is a column value, not separate tables.
 *
 * Run manually by an operator AFTER the
 * fraud_radar_grants_summaries migration has been applied:
 *
 *   node scripts/fraud-radar-load-grants.mjs <artifactDir>
 *
 * Idempotent: grain rows are replaced per dataset version on every
 * run; import-run history is append-only and deduped. NOT part of
 * any build or deploy. Amounts keep their source semantics:
 * USAspending figures are award-cumulative snapshot totals (never
 * fiscal-year obligations); FAC expended is auditee-reported and
 * questioned costs are flag counts only — no amounts exist.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const artifactDir = process.argv[2];
if (!artifactDir) {
  console.error("usage: node scripts/fraud-radar-load-grants.mjs <artifactDir>");
  process.exit(2);
}

const readJson = (name) => JSON.parse(readFileSync(path.join(artifactDir, name), "utf8"));
const datasetRaw = readFileSync(path.join(artifactDir, "dataset.json"));
const dataset = JSON.parse(datasetRaw);
const neon = readJson("grants-neon.json"); // plain-object arrays (contract)
const publishManifest = existsSync(path.join(artifactDir, "publish-manifest.json"))
  ? readJson("publish-manifest.json")
  : null;
const version = dataset.version;
const facVersion = dataset.facVersion ?? "2026-10-31_ay2026";
const datasetSha = createHash("sha256").update(datasetRaw).digest("hex");

// Defensive coercions (Phase 3 §8 lessons): the pipeline normalizes
// at publish, and this loader coerces too, so a placeholder can
// never be stored as a fact. "-" / "" text is absent (null), counts
// arriving as floats/strings are truncated to integers, and a null
// in a NOT NULL amount column is a contract break — fail loudly
// rather than storing a fabricated value.
const strOrNull = (v) => (v == null || v === "" || v === "-" ? null : String(v));
const reqStr = (v) => {
  const s = strOrNull(v);
  if (s == null) throw new Error(`grants-neon.json: required string missing (got ${JSON.stringify(v)})`);
  return s.trim();
};
const toBig = (v) => BigInt(v == null ? 0 : Math.trunc(Number(v)));
const toInt = (v) => (v == null ? 0 : Math.trunc(Number(v)));
const dec = (v) => {
  if (v == null) throw new Error("grants-neon.json: amount column arrived null — publisher contract break");
  return String(v);
};

const db = new PrismaClient();
try {
  const usaspending = await db.frDataSource.findUnique({ where: { slug: "usaspending" } });
  if (!usaspending) throw new Error("registry source usaspending not found — run the registry seed first");
  const fac = await db.frDataSource.findUnique({ where: { slug: "fac" } });
  if (!fac) throw new Error("registry source fac not found — run the registry seed first");

  const yearly = neon.yearly ?? [];
  const aln = neon.aln ?? [];
  const agency = neon.agency ?? [];
  const facYearly = neon.facYearly ?? [];

  await db.$transaction(
    async (tx) => {
      await tx.frGrantsYearlySummary.deleteMany({ where: { datasetVersion: version } });
      const yearlyRows = yearly.map((r) => ({
        datasetVersion: version,
        fiscalYear: toInt(r.fiscalYear),
        awards: toBig(r.awards),
        distinctRecipients: toInt(r.distinctRecipients),
        obligatedAwardCumulativeUsd: dec(r.obligatedAwardCumulativeUsd),
        outlayAwardCumulativeUsd: dec(r.outlayAwardCumulativeUsd),
        subawardsCount: toBig(r.subawardsCount),
        subawardAmountUsd: dec(r.subawardAmountUsd),
      }));
      for (let i = 0; i < yearlyRows.length; i += 1000) {
        await tx.frGrantsYearlySummary.createMany({ data: yearlyRows.slice(i, i + 1000) });
      }

      await tx.frGrantsAlnSummary.deleteMany({ where: { datasetVersion: version } });
      const alnRows = aln.map((r) => ({
        datasetVersion: version,
        aln: reqStr(r.aln),
        alnTitle: strOrNull(r.alnTitle),
        attributedFiscalYear: toInt(r.attributedFiscalYear),
        awards: toBig(r.awards),
        distinctRecipients: toInt(r.distinctRecipients),
        obligatedAwardCumulativeUsd: dec(r.obligatedAwardCumulativeUsd),
      }));
      for (let i = 0; i < alnRows.length; i += 1000) {
        await tx.frGrantsAlnSummary.createMany({ data: alnRows.slice(i, i + 1000) });
      }

      await tx.frGrantsAgencySummary.deleteMany({ where: { datasetVersion: version } });
      const agencyRows = agency.map((r) => ({
        datasetVersion: version,
        agency: reqStr(r.agency),
        attributedFiscalYear: toInt(r.attributedFiscalYear),
        awards: toBig(r.awards),
        distinctRecipients: toInt(r.distinctRecipients),
        obligatedAwardCumulativeUsd: dec(r.obligatedAwardCumulativeUsd),
      }));
      for (let i = 0; i < agencyRows.length; i += 1000) {
        await tx.frGrantsAgencySummary.createMany({ data: agencyRows.slice(i, i + 1000) });
      }

      await tx.frFacYearlySummary.deleteMany({ where: { datasetVersion: facVersion } });
      const facRows = facYearly.map((r) => ({
        datasetVersion: facVersion,
        auditYear: toInt(r.auditYear),
        reports: toBig(r.reports),
        totalExpendedUsd: dec(r.totalExpendedUsd),
        findingsCount: toBig(r.findingsCount),
        repeatFindingsCount: toBig(r.repeatFindingsCount),
        questionedCostFlagCount: toBig(r.questionedCostFlagCount),
        distinctAuditees: toInt(r.distinctAuditees),
      }));
      for (let i = 0; i < facRows.length; i += 1000) {
        await tx.frFacYearlySummary.createMany({ data: facRows.slice(i, i + 1000) });
      }

      console.log(
        `loaded FrGrantsYearlySummary=${yearlyRows.length} FrGrantsAlnSummary=${alnRows.length} ` +
          `FrGrantsAgencySummary=${agencyRows.length} FrFacYearlySummary=${facRows.length}`,
      );
    },
    { timeout: 600_000 },
  );

  const runs = [
    {
      source: usaspending,
      datasetVersion: version,
      rows: BigInt(yearly.length + aln.length + agency.length),
      artifactPath: `fraud-radar/grants/${version}`,
      manifest: {
        kind: "app-artifact-publish",
        dataset: dataset.dataset,
        version,
        fiscalYears: dataset.fiscalYears,
        recipients: dataset.recipients,
        crossChecks: publishManifest?.crossChecks ?? publishManifest?.cross_checks ?? null,
      },
    },
    {
      source: fac,
      datasetVersion: facVersion,
      rows: BigInt(facYearly.length),
      artifactPath: `fraud-radar/grants/${version}`,
      manifest: {
        kind: "app-artifact-publish",
        dataset: dataset.dataset,
        version,
        facVersion,
        fac: dataset.fac,
        crossChecks: publishManifest?.crossChecks ?? publishManifest?.cross_checks ?? null,
      },
    },
  ];
  for (const run of runs) {
    const existing = await db.frImportRun.findFirst({
      where: { sourceId: run.source.id, datasetVersion: run.datasetVersion, artifactSha256: datasetSha },
    });
    if (existing) {
      console.log(`import run already recorded for ${run.source.slug} ${run.datasetVersion}; skipped`);
    } else {
      await db.frImportRun.create({
        data: {
          sourceId: run.source.id,
          datasetVersion: run.datasetVersion,
          status: "succeeded",
          finishedAt: new Date(),
          rowsProcessed: run.rows,
          rowsValid: run.rows,
          rowsQuarantined: 0n,
          artifactPath: run.artifactPath,
          artifactSha256: datasetSha,
          manifest: run.manifest,
        },
      });
      console.log(`recorded FrImportRun for ${run.source.slug} ${run.datasetVersion}`);
    }
  }
  console.log("done");
} finally {
  await db.$disconnect();
}
