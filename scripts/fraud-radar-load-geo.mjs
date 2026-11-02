/**
 * Fraud Radar Phase 10 — load the geo Neon grain (PHASE10 §6.6).
 *
 * Reads geo-neon.json from a published geo artifact directory
 * (pipeline G3 output) and replaces, per composite version:
 *   - FrGeoStateSummary  (from "stateSummaries")
 *   - FrGeoYearlySummary (from "nationalSummaries")
 * Withheld small cells keep NULL value/entity counts — the loader
 * never converts a withheld cell to zero (§5.3).
 *
 * Run manually by an operator AFTER the
 * fraud_radar_graphs_geo_summaries migration has been applied:
 *   node scripts/fraud-radar-load-geo.mjs <artifactDir>
 * Idempotent: rows are replaced per dataset version on every run.
 * NOT part of any build or deploy.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";

const artifactDir = process.argv[2];
if (!artifactDir) {
  console.error("usage: node scripts/fraud-radar-load-geo.mjs <artifactDir>");
  process.exit(2);
}
const neon = JSON.parse(readFileSync(path.join(artifactDir, "geo-neon.json"), "utf8"));
const version = neon.datasetVersion;
if (!version) throw new Error("geo-neon.json: datasetVersion missing");
const toBigOrNull = (v) => (v == null ? null : BigInt(Math.trunc(Number(v))));
const toIntOrNull = (v) => (v == null ? null : Math.trunc(Number(v)));

// Primary measure per layer family: the first money/count value the
// publisher names for the layer, else null (directory layers carry
// counts only). The full values object is stored verbatim in Json.
function primaryValue(values) {
  if (!values) return null;
  for (const k of ["obligated_usd", "paid_excl_outliers_usd", "derived_payment_usd", "award_count"]) {
    if (typeof values[k] === "number") return String(values[k]);
  }
  return null;
}

const db = new PrismaClient();
try {
  const states = (neon.stateSummaries ?? []).map((r) => ({
    datasetVersion: version,
    engine: String(r.engine),
    layer: String(r.layer),
    geographyField: String(r.geographyField ?? ""),
    stateCode: String(r.stateCode),
    stateName: String(r.stateName),
    attributionState: String(r.attributionState ?? "attributed"),
    entityCount: toIntOrNull(r.entityCount),
    awardCount: toBigOrNull(r.values?.award_count),
    value: primaryValue(r.values),
    values: r.values ?? {},
  }));
  const yearly = (neon.nationalSummaries ?? []).map((r) => ({
    datasetVersion: version,
    engine: String(r.engine),
    layer: String(r.layer),
    geographyField: String(r.geographyField ?? ""),
    national: r.national ?? {},
    unknown: r.unknown ?? {},
    coverageStatement: String(r.coverageStatement ?? ""),
  }));
  await db.$transaction(async (tx) => {
    await tx.frGeoStateSummary.deleteMany({ where: { datasetVersion: version } });
    for (let i = 0; i < states.length; i += 500) {
      await tx.frGeoStateSummary.createMany({ data: states.slice(i, i + 500) });
    }
    await tx.frGeoYearlySummary.deleteMany({ where: { datasetVersion: version } });
    await tx.frGeoYearlySummary.createMany({ data: yearly });
  });
  console.log(`loaded geo grain for ${version}: ${states.length} states, ${yearly.length} layers`);
} finally {
  await db.$disconnect();
}
