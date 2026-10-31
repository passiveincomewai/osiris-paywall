/**
 * Fraud Radar Phase 6 — Neon grain reads (AUDIT §15a).
 *
 * Small grains live in Neon: the per-rule summary grain
 * (FrSignalRuleSummary) and the per-dataset data-quality grain
 * (FrDataQualityRecord), both stamped with the composite signals
 * version 2026-02-09+2022-2024+2026-10-06. The entity grain lives
 * in versioned artifacts (signals-data.ts); peer groups are read
 * from artifacts, never from Neon (PHASE6 §6.5 — no peer-group
 * table exists). Fail-soft like grants-neon.ts: absent
 * tables/rows render an honest "not loaded yet" state, never a
 * 500.
 *
 * Counts cross the Prisma boundary as BigInt and are surfaced as
 * numbers. expectedByConstruction crosses as Decimal and stays
 * nullable: rule forms with no by-construction expectation
 * (own-history / count forms) carry null — not applicable, never
 * a fabricated zero — and noiseCaution is null exactly then. The
 * contracts engine has NO summary rows while its state is
 * not_computed_input_not_published: an empty contracts result
 * from these readers is the pending state, and callers render it
 * through contractsPendingState() in signals-data.ts, never as
 * zero leads.
 */
import { db } from "@/lib/db";
import { DEFAULT_SIGNALS_VERSION } from "./signals-data";

export interface SignalRuleSummaryRow {
  signalsVersion: string;
  engine: string;
  ruleCode: string;
  ruleName: string;
  ruleLibraryVersion: string;
  entitiesEvaluated: number;
  leadsPublished: number;
  aboveBandBeforeEffectFloor: number | null;
  /** Expected-by-construction count; null = the rule's form has
   *  no by-construction expectation (own-history / count forms). */
  expectedByConstruction: number | null;
  /** Null exactly when expectedByConstruction is null. */
  noiseCaution: boolean | null;
  peerDefinition: string;
  /** The publisher's verbatim input-versions string. */
  inputVersions: string;
  /** Per-status counts from the closed not-computed vocabulary. */
  notComputed: Record<string, number> | null;
}

function decodeInputVersions(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

export async function listSignalRuleSummaries(
  version: string = DEFAULT_SIGNALS_VERSION,
): Promise<SignalRuleSummaryRow[] | null> {
  try {
    const rows = await db.frSignalRuleSummary.findMany({
      where: { datasetVersion: version },
      orderBy: [{ engine: "asc" }, { ruleCode: "asc" }],
    });
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      signalsVersion: r.datasetVersion,
      engine: r.engine,
      ruleCode: r.ruleCode,
      ruleName: r.ruleName,
      ruleLibraryVersion: r.ruleLibraryVersion,
      entitiesEvaluated: Number(r.entitiesEvaluated),
      leadsPublished: Number(r.leadsPublished),
      aboveBandBeforeEffectFloor:
        r.aboveBandBeforeEffectFloor == null
          ? null
          : Number(r.aboveBandBeforeEffectFloor),
      expectedByConstruction:
        r.expectedByConstruction == null ? null : Number(r.expectedByConstruction),
      noiseCaution: r.noiseCaution,
      peerDefinition: r.peerDefinition,
      inputVersions: decodeInputVersions(r.inputVersions),
      notComputed: (r.notComputed as Record<string, number> | null) ?? null,
    }));
  } catch {
    return null;
  }
}

export async function getSignalRuleSummary(
  ruleCode: string,
  version: string = DEFAULT_SIGNALS_VERSION,
): Promise<SignalRuleSummaryRow | null> {
  try {
    const r = await db.frSignalRuleSummary.findUnique({
      where: {
        datasetVersion_ruleCode: {
          datasetVersion: version,
          ruleCode: ruleCode.trim(),
        },
      },
    });
    if (!r) return null;
    return {
      signalsVersion: r.datasetVersion,
      engine: r.engine,
      ruleCode: r.ruleCode,
      ruleName: r.ruleName,
      ruleLibraryVersion: r.ruleLibraryVersion,
      entitiesEvaluated: Number(r.entitiesEvaluated),
      leadsPublished: Number(r.leadsPublished),
      aboveBandBeforeEffectFloor:
        r.aboveBandBeforeEffectFloor == null
          ? null
          : Number(r.aboveBandBeforeEffectFloor),
      expectedByConstruction:
        r.expectedByConstruction == null ? null : Number(r.expectedByConstruction),
      noiseCaution: r.noiseCaution,
      peerDefinition: r.peerDefinition,
      inputVersions: decodeInputVersions(r.inputVersions),
      notComputed: (r.notComputed as Record<string, number> | null) ?? null,
    };
  } catch {
    return null;
  }
}

export interface DataQualityRecordRow {
  datasetSlug: string;
  datasetVersion: string;
  runDate: string;
  /** Overall state: pass | warn | fail | error. */
  verdict: string;
  checksTotal: number;
  checksPass: number;
  checksWarn: number;
  checksFail: number;
  checksError: number;
  checksNotApplicable: number;
  checks: Record<string, Record<string, number>>;
  defectsInForce: string[];
  detailPointer: string;
  filesChecked: number;
  vintageAgeDays: number;
}

export async function listDataQualityRecords(opts: {
  runDate?: string;
  datasetSlug?: string;
} = {}): Promise<DataQualityRecordRow[] | null> {
  try {
    const rows = await db.frDataQualityRecord.findMany({
      where: {
        ...(opts.runDate ? { runDate: opts.runDate } : {}),
        ...(opts.datasetSlug ? { datasetSlug: opts.datasetSlug } : {}),
      },
      orderBy: [{ runDate: "desc" }, { datasetSlug: "asc" }],
    });
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      datasetSlug: r.datasetSlug,
      datasetVersion: r.datasetVersion,
      runDate: r.runDate,
      verdict: r.verdict,
      checksTotal: r.checksTotal,
      checksPass: r.checksPass,
      checksWarn: r.checksWarn,
      checksFail: r.checksFail,
      checksError: r.checksError,
      checksNotApplicable: r.checksNotApplicable,
      checks: (r.checks as Record<string, Record<string, number>>) ?? {},
      defectsInForce: r.defectsInForce ?? [],
      detailPointer: r.detailPointer,
      filesChecked: r.filesChecked,
      vintageAgeDays: r.vintageAgeDays,
    }));
  } catch {
    return null;
  }
}
