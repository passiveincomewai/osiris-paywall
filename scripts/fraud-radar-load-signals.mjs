/**
 * Fraud Radar Phase 6 — load the signals Neon grain (AUDIT §15a).
 *
 * Reads a published signals artifact directory (produced by
 * app-publish/publish_signals.py) and replaces, per version:
 *   - FrSignalRuleSummary  (from signals-neon.json "ruleSummaries")
 *   - FrDataQualityRecord  (from signals-neon.json
 *     "dataQualityRecords", stamped with the quality run date
 *     from quality.json / dataset.json's qualitySummary)
 * and appends FrImportRun rows to the registry under the EXISTING
 * input sources the publication derives from. Signals are a
 * derived publication, not a source: there is NO new registry
 * slug (PHASE6 §6.5 registry precedent, Phase 5 Payload C shape).
 * Anchor sources and what each run accounts for:
 *   - medicaid-hcpcs — the healthcare engine summaries
 *   - cms-medicare   — the care engine summaries
 *   - usaspending    — the grants + cross engine summaries
 *   - fac            — the FAC-attributable subset (G-06, G-07,
 *     X-990-01) of the grants/cross engines
 * Runs are deduped by (source, datasetVersion, artifactSha256 =
 * sha256 of dataset.json), one per anchor per publication.
 *
 * Peer groups are deliberately NOT loaded: they are read from the
 * artifacts where a profile needs them (PHASE6 §6.5). The
 * contracts engine has no summary rows while its state is
 * not_computed_input_not_published — signals-neon.json carries it
 * as a "pendingEngines" entry, and this loader records that state
 * in each import run's manifest; it never writes a zero row.
 *
 * Run manually by an operator AFTER the
 * fraud_radar_signal_summaries migration has been applied:
 *
 *   node scripts/fraud-radar-load-signals.mjs <artifactDir>
 *
 * Idempotent: grain rows are replaced per version / run date on
 * every run; import-run history is append-only and deduped. NOT
 * part of any build or deploy. Signals are research leads only;
 * expectedByConstruction / noiseCaution stay NULL for rule forms
 * with no by-construction expectation — never fabricated.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const artifactDir = process.argv[2];
if (!artifactDir) {
  console.error("usage: node scripts/fraud-radar-load-signals.mjs <artifactDir>");
  process.exit(2);
}

const readJson = (name) => JSON.parse(readFileSync(path.join(artifactDir, name), "utf8"));
const datasetRaw = readFileSync(path.join(artifactDir, "dataset.json"));
const dataset = JSON.parse(datasetRaw);
const neon = readJson("signals-neon.json"); // plain-object arrays (contract)
const publishManifest = existsSync(path.join(artifactDir, "publish-manifest.json"))
  ? readJson("publish-manifest.json")
  : null;
const quality = existsSync(path.join(artifactDir, "quality.json"))
  ? readJson("quality.json")
  : null;
const version = dataset.version;
const runDate =
  quality?.runDate ?? dataset.qualitySummary?.runDate ?? null;
if (!runDate) {
  throw new Error(
    "signals artifacts: no data-quality run date (quality.json runDate / dataset qualitySummary.runDate) — publisher contract break",
  );
}
const datasetSha = createHash("sha256").update(datasetRaw).digest("hex");

// Defensive coercions (Phase 3 §8 lessons, grants-loader parity):
// the pipeline normalizes at publish, and this loader coerces too,
// so a placeholder can never be stored as a fact. "-" / "" text is
// absent (null) for nullable strings and a loud error for required
// strings; counts arriving as floats/strings truncate to integers;
// nullable figures stay null end-to-end (absence is never zero).
const strOrNull = (v) => (v == null || v === "" || v === "-" ? null : String(v));
const reqStr = (v) => {
  const s = strOrNull(v);
  if (s == null) throw new Error(`signals-neon.json: required string missing (got ${JSON.stringify(v)})`);
  return s.trim();
};
const toBig = (v) => BigInt(v == null ? 0 : Math.trunc(Number(v)));
const toBigOrNull = (v) => (v == null ? null : BigInt(Math.trunc(Number(v))));
const toInt = (v) => (v == null ? 0 : Math.trunc(Number(v)));
const decOrNull = (v) => (v == null ? null : String(v));
const boolOrNull = (v) => (v == null ? null : Boolean(v));

const db = new PrismaClient();
try {
  const anchors = [
    { slug: "medicaid-hcpcs", engines: ["healthcare"], ruleCodes: null },
    { slug: "cms-medicare", engines: ["care"], ruleCodes: null },
    { slug: "usaspending", engines: ["grants", "cross"], ruleCodes: null },
    { slug: "fac", engines: [], ruleCodes: ["G-06", "G-07", "X-990-01"] },
  ];
  const sources = {};
  for (const a of anchors) {
    const src = await db.frDataSource.findUnique({ where: { slug: a.slug } });
    if (!src) throw new Error(`registry source ${a.slug} not found — run the registry seed first`);
    sources[a.slug] = src;
  }

  const summaries = neon.ruleSummaries ?? [];
  const dqRecords = neon.dataQualityRecords ?? [];
  const pendingEngines = neon.pendingEngines ?? [];

  await db.$transaction(
    async (tx) => {
      await tx.frSignalRuleSummary.deleteMany({ where: { datasetVersion: version } });
      const summaryRows = summaries.map((r) => ({
        datasetVersion: reqStr(r.signalsVersion ?? version),
        engine: reqStr(r.engine),
        ruleCode: reqStr(r.ruleCode),
        ruleName: reqStr(r.ruleName),
        ruleLibraryVersion: reqStr(r.ruleLibraryVersion ?? neon.ruleLibraryVersion),
        entitiesEvaluated: toBig(r.entitiesEvaluated),
        leadsPublished: toBig(r.leadsPublished),
        aboveBandBeforeEffectFloor: toBigOrNull(r.aboveBandBeforeEffectFloor),
        expectedByConstruction: decOrNull(r.expectedByConstruction),
        noiseCaution: boolOrNull(r.noiseCaution),
        peerDefinition: reqStr(r.peerDefinition),
        // Verbatim input-versions string, stored as a JSON value.
        inputVersions: reqStr(r.inputVersions),
        notComputed: r.notComputed ?? null,
      }));
      for (let i = 0; i < summaryRows.length; i += 1000) {
        await tx.frSignalRuleSummary.createMany({ data: summaryRows.slice(i, i + 1000) });
      }

      await tx.frDataQualityRecord.deleteMany({ where: { runDate } });
      const dqRows = dqRecords.map((r) => {
        const cc = r.checkCounts ?? {};
        return {
          datasetSlug: reqStr(r.dataset),
          datasetVersion: reqStr(r.version),
          runDate,
          verdict: reqStr(r.overallState),
          checksTotal: toInt(cc.total),
          checksPass: toInt(cc.pass),
          checksWarn: toInt(cc.warn),
          checksFail: toInt(cc.fail),
          checksError: toInt(cc.error),
          checksNotApplicable: toInt(cc.not_applicable),
          checks: r.checks ?? {},
          defectsInForce: (r.defectsInForce ?? []).map((d) => String(d)),
          detailPointer: reqStr(r.detailPointer),
          filesChecked: toInt(r.filesChecked),
          vintageAgeDays: toInt(r.vintageAgeDays),
        };
      });
      for (let i = 0; i < dqRows.length; i += 1000) {
        await tx.frDataQualityRecord.createMany({ data: dqRows.slice(i, i + 1000) });
      }

      console.log(
        `loaded FrSignalRuleSummary=${summaryRows.length} FrDataQualityRecord=${dqRows.length} ` +
          `(version=${version}, qualityRun=${runDate}, pendingEngines=${pendingEngines
            .map((p) => `${p.engine}:${p.state}`)
            .join(",") || "none"})`,
      );
    },
    { timeout: 600_000 },
  );

  for (const a of anchors) {
    const rows = a.ruleCodes
      ? summaries.filter((r) => a.ruleCodes.includes(r.ruleCode)).length
      : summaries.filter((r) => a.engines.includes(r.engine)).length;
    const existing = await db.frImportRun.findFirst({
      where: { sourceId: sources[a.slug].id, datasetVersion: version, artifactSha256: datasetSha },
    });
    if (existing) {
      console.log(`import run already recorded for ${a.slug} ${version}; skipped`);
    } else {
      await db.frImportRun.create({
        data: {
          sourceId: sources[a.slug].id,
          datasetVersion: version,
          status: "succeeded",
          finishedAt: new Date(),
          rowsProcessed: BigInt(rows),
          rowsValid: BigInt(rows),
          rowsQuarantined: 0n,
          artifactPath: `fraud-radar/signals/${version}`,
          artifactSha256: datasetSha,
          manifest: {
            kind: "app-artifact-publish",
            dataset: dataset.dataset,
            version,
            ruleLibraryVersion: dataset.ruleLibraryVersion ?? neon.ruleLibraryVersion ?? null,
            engines: a.engines,
            ruleCodes: a.ruleCodes,
            ruleSummaries: summaries.length,
            dataQualityRecords: dqRecords.length,
            qualityRunDate: runDate,
            pendingEngines,
            crossChecks: publishManifest?.crossChecks ?? null,
          },
        },
      });
      console.log(`recorded FrImportRun for ${a.slug} ${version}`);
    }
  }
  console.log("done");
} finally {
  await db.$disconnect();
}
