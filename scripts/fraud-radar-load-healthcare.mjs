/**
 * Fraud Radar Phase 2 — load the Neon summary grain (AUDIT §15a).
 *
 * Reads a published healthcare artifact directory (produced by the
 * pipeline's app-publish/publish_healthcare.py) and upserts:
 *   - FrHcpcsSummary            (from hcpcs.json, 12,263 code rows)
 *   - FrMonthlyNationalSummary  (from national.json, 84 month rows)
 * and appends one FrImportRun to the registry for the aggregates
 * publication (source slug "medicaid-hcpcs"), carrying the publisher's
 * cross-check results in its manifest — unless an identical run (same
 * dataset version + dataset.json sha256) is already recorded.
 *
 * Run manually by an operator AFTER the
 * fraud_radar_healthcare_summaries migration has been applied:
 *
 *   node scripts/fraud-radar-load-healthcare.mjs <artifactDir>
 *
 * Idempotent: summary rows are replaced per dataset version on every
 * run (a republish is a new version of the same grain); import-run
 * history is append-only and deduped as described above. This script
 * is NOT part of any build or deploy.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const artifactDir = process.argv[2];
if (!artifactDir) {
  console.error("usage: node scripts/fraud-radar-load-healthcare.mjs <artifactDir>");
  process.exit(2);
}

const readJson = (name) => JSON.parse(readFileSync(path.join(artifactDir, name), "utf8"));
const datasetRaw = readFileSync(path.join(artifactDir, "dataset.json"));
const dataset = JSON.parse(datasetRaw);
const publishManifest = readJson("publish-manifest.json");
const hcpcs = readJson("hcpcs.json");
const national = readJson("national.json");
const version = dataset.version;
const datasetSha = createHash("sha256").update(datasetRaw).digest("hex");

const toDate = (v) => (v == null ? null : new Date(`${v}T00:00:00.000Z`));
const ymToDate = (ym) =>
  new Date(`${Math.floor(ym / 100)}-${String(ym % 100).padStart(2, "0")}-01T00:00:00.000Z`);

const db = new PrismaClient();
try {
  const source = await db.frDataSource.findUnique({ where: { slug: "medicaid-hcpcs" } });
  if (!source) throw new Error("registry source medicaid-hcpcs not found — run the registry seed first");

  // HCPCS grain: hcpcs.json rows are {"s":[code, first, last], "n":[...]}.
  let hcpcsCount = 0;
  await db.$transaction(async (tx) => {
    await tx.frHcpcsSummary.deleteMany({ where: { datasetVersion: version } });
    const rows = hcpcs.rows.map((r) => ({
      datasetVersion: version,
      hcpcsCode: r.s[0],
      firstClaimMonth: toDate(r.s[1]),
      lastClaimMonth: toDate(r.s[2]),
      reportedCells: BigInt(r.n[0]),
      totalClaimLines: BigInt(r.n[1]),
      totalPatientsReported: BigInt(r.n[2]),
      totalPaidAllCellsUsd: String(r.n[3]),
      outlierCells: BigInt(r.n[4]),
      outlierPaidUsd: String(r.n[5]),
      totalPaidExclOutliersUsd: String(r.n[6]),
      distinctBillingNpis: r.n[7],
      distinctServicingNpis: r.n[8],
      activeMonths: r.n[9],
    }));
    for (let i = 0; i < rows.length; i += 1000) {
      const res = await tx.frHcpcsSummary.createMany({ data: rows.slice(i, i + 1000) });
      hcpcsCount += res.count;
    }

    await tx.frMonthlyNationalSummary.deleteMany({ where: { datasetVersion: version } });
    const natRows = national.rows.map((a) => ({
      datasetVersion: version,
      claimMonth: ymToDate(a[0]),
      reportedCells: BigInt(a[1]),
      totalClaimLines: BigInt(a[2]),
      totalPatientsReported: BigInt(a[3]),
      totalPaidAllCellsUsd: String(a[4]),
      outlierCells: BigInt(a[5]),
      outlierPaidUsd: String(a[6]),
      totalPaidExclOutliersUsd: String(a[7]),
      distinctBillingNpis: a[8],
      distinctServicingNpis: a[9],
      distinctHcpcsCodes: a[10],
    }));
    await tx.frMonthlyNationalSummary.createMany({ data: natRows });
    console.log(`loaded FrHcpcsSummary=${hcpcsCount} FrMonthlyNationalSummary=${natRows.length} for version ${version}`);
  });

  const existing = await db.frImportRun.findFirst({
    where: { sourceId: source.id, datasetVersion: version, artifactSha256: datasetSha },
  });
  if (existing) {
    console.log("import run already recorded for this publish (same version + dataset.json sha256); skipped");
  } else {
    const totalRows = Object.values(publishManifest.inventory).reduce((acc, f) => acc + (f.rows ?? 0), 0);
    await db.frImportRun.create({
      data: {
        sourceId: source.id,
        datasetVersion: version,
        status: "succeeded",
        finishedAt: new Date(),
        rowsProcessed: BigInt(totalRows),
        rowsValid: BigInt(totalRows),
        rowsQuarantined: 0n,
        artifactPath: `fraud-radar/healthcare/${version}`,
        artifactSha256: datasetSha,
        manifest: {
          kind: "app-artifact-publish",
          dataset: dataset.dataset,
          version,
          identityIncluded: publishManifest.identityIncluded,
          inventory: publishManifest.inventory,
          checks: publishManifest.checks,
          generatedAt: publishManifest.generatedAt,
        },
      },
    });
    console.log("recorded FrImportRun for the aggregates publication");
  }
  console.log("done");
} finally {
  await db.$disconnect();
}
