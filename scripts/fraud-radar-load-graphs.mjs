/**
 * Fraud Radar Phase 10 — load the graph Neon grain (PHASE10 §6.6).
 *
 * Reads a published graphs artifact directory (pipeline G4 output:
 * dataset.json + ego/) and replaces the single FrGraphYearlySummary
 * row for the composite vintage. The loader input is dataset.json
 * itself — G4 published no separate graphs-neon.json; the totals,
 * reconciliation and parent-linkage blocks in dataset.json ARE the
 * loader contract (measured by the pipeline, never recomputed).
 *
 * Run manually by an operator AFTER the
 * fraud_radar_graphs_geo_summaries migration has been applied:
 *   node scripts/fraud-radar-load-graphs.mjs <artifactDir> <compositeVersion>
 * Idempotent: the row is replaced per dataset version on every run.
 * NOT part of any build or deploy.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";

const artifactDir = process.argv[2];
const version = process.argv[3];
if (!artifactDir || !version) {
  console.error(
    "usage: node scripts/fraud-radar-load-graphs.mjs <artifactDir> <compositeVersion>",
  );
  process.exit(2);
}
const dataset = JSON.parse(
  readFileSync(path.join(artifactDir, "dataset.json"), "utf8"),
);
const totals = dataset.totals ?? {};
const byType = dataset.reconciliation?.published_by_type ?? {};
const pl = dataset.parentLinkage ?? {};
const toBig = (v) => BigInt(v == null ? 0 : Math.trunc(Number(v)));
const toInt = (v) => (v == null ? 0 : Math.trunc(Number(v)));

const db = new PrismaClient();
try {
  const row = {
    datasetVersion: version,
    graphCatalogVersion: String(dataset.graphCatalogVersion ?? "1.0.0"),
    entitiesTotal: toBig(totals.egos),
    entitiesUei: toInt(byType.entity_uei),
    entitiesEin: toInt(byType.entity_ein),
    entitiesNpi: toInt(byType.entity_npi),
    nodesTotal: toBig(totals.nodes),
    edgesExcludingCandidates: toBig(totals.edgesExcludingCandidates),
    candidateEdges: toBig(totals.candidateEdges),
    annotations: toBig(totals.annotations),
    truncations: toBig(totals.truncations),
    candidateMatchRatePct:
      pl.normalisedDiagnostic?.matchRatePctPerAward == null
        ? null
        : String(pl.normalisedDiagnostic.matchRatePctPerAward),
    candidateAsDesignedRatePct:
      pl.asDesigned?.matchRatePct == null ? null : String(pl.asDesigned.matchRatePct),
  };
  await db.frGraphYearlySummary.deleteMany({ where: { datasetVersion: version } });
  await db.frGraphYearlySummary.create({ data: row });
  console.log(`loaded FrGraphYearlySummary for ${version}`);
} finally {
  await db.$disconnect();
}
