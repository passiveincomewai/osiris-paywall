/**
 * Fraud Radar Phase 6 — statistical intelligence app data layer.
 *
 * Covers the research-signals publication produced by the Phase 6
 * pipeline + artifact publisher (composite version
 * 2026-02-09+2022-2024+2026-10-06: Medicaid 2026-02-09 + Medicare
 * CY2022-2024 + USAspending 2026-10-06 inputs; rule library
 * 1.1.0). The small Neon grains (per-rule summaries + per-dataset
 * quality records) are read through signals-neon.ts. The app reads
 * ONLY these versioned artifacts + the Neon grain; it never
 * touches the pipeline Parquet or the source bulk files.
 * Peer-group statistics are published as data in the pipeline
 * publication and travel inside each lead's provenance block;
 * they are deliberately NOT copied into Neon (PHASE6 §6.5).
 *
 * Artifact contract (publisher: app-publish/publish_signals.py in
 * the Fraud Radar workspace — the contract of record):
 *   dataset.json            provenance + engine states + the
 *                           language rules and methods summary
 *   signals-neon.json       Neon loader input (see
 *                           fraud-radar-load-signals)
 *   rules/<engine>.json     the rule catalog per engine, verbatim
 *                           from the pipeline rule library
 *   quality.json            the data-quality record per dataset
 *   sig/<engine>/<bb>.json  per-entity LEADS ONLY buckets
 *                           (bb = md5 bucket, see signalBucket);
 *                           cross buckets additionally carry a
 *                           screeningRecords block
 *   admin/candidate-queue.json
 *                           S-06 human-review candidate pairs —
 *                           ADMIN ONLY, see the confinement rule
 *
 * Language rules enforced by this layer (PHASE6 §2.1 — the rule
 * library is the only source of signal names, definitions and
 * caveats rendered anywhere; copy is never written per-surface):
 *  - Anomalies are research leads — never declarations about an
 *    entity, never a statement of how likely wrongdoing is, never
 *    a grade of an entity. There is no composite standing: no
 *    sum, average, or count of leads is ever an entity's grade,
 *    and entities are never ranked against each other.
 *  - Provenance travels with every lead: each published lead row
 *    carries its rule code + rule-library version, its peer-group
 *    definition and rung, its peer n, the entity measure and the
 *    peer median, its percentile band, the input dataset versions
 *    it was computed from, and its computation timestamp. A lead
 *    rendered without that block is a defect.
 *  - Missing / not computed is a labelled state, never zero,
 *    never imputed, never silently absent. The contracts engine
 *    state is the typed pending state
 *    `not_computed_input_not_published` (Phase 5 C3 gate) —
 *    surfaced as a state, never as zero leads.
 *  - Class-S screening records are exact-identifier facts from
 *    named extracts. They live in their own block on an entity
 *    file, never merged with rule leads, never counted with them.
 *  - S-06 human-review candidate pairs are candidates for human
 *    review, never identity matches and never leads. They are
 *    published ONLY in the admin candidate queue artifact and are
 *    exposed by this layer ONLY through getAdminCandidateQueue()
 *    (the admin-gated path). The public entity loader filters
 *    S-06 rows out of every block it returns, so a candidate pair
 *    can never reach a public entity context through this layer.
 */

import { createHash } from "node:crypto";

export const SIGNALS_DATASET = "research-signals";
export const DEFAULT_SIGNALS_VERSION = "2026-02-09+2022-2024+2026-10-06";
export const DEFAULT_RULE_LIBRARY_VERSION = "1.1.0";

/** The one status every S-06 candidate row carries, verbatim. */
export const CANDIDATE_STATUS = "candidate — human review";

/** Typed pending state for an engine whose inputs are not yet
 *  published — a labelled state, never an empty or zero result. */
export const CONTRACTS_PENDING_STATE = "not_computed_input_not_published";

/** Closed not-computed vocabulary (PHASE6 §3.4). */
export const NOT_COMPUTED_STATES = [
  "not_computed_peer_group_too_small",
  "not_computed_missing_peer_key",
  "not_computed_below_activity_floor",
  "not_computed_suppressed_source",
  "not_computed_period_unaligned",
  "not_computed_input_not_published",
] as const;

export const RESEARCH_LEAD_FRAMING =
  "Research lead — [plain-language descriptive name]. [Entity] reported [measure value] versus a peer-group median of [peer median] among [peer n] [peer-group plain description] ([percentile band] within that group). Computed from [dataset names and versions]. A research lead is a reason to look closer; it is not a finding about the entity, and most entities above any statistical band have ordinary explanations (case mix, specialty practice patterns, contract type, reporting practices).";

export const RESEARCH_LEADS_NOTE =
  "Anomalies are research leads — never declarations about an entity, never a statement of how likely wrongdoing is, never a grade of an entity. There is no composite standing in this publication: no sum, average, or count of leads is rendered as an entity's grade, and entities are never ranked against each other. Every rendered lead carries its method and its input vintages (the provenance block); a lead rendered without that block is a defect. Missing or not computed is a labelled state, never zero, never imputed, never silently absent.";

export const SCREENING_RECORDS_NOTE =
  "Class-S screening records are exact-identifier facts from the named source extracts, presented in their own block on an entity file, never merged with rule leads and never counted alongside them. Listing status is as of the named extract and its extract date, not a live status check.";

export const CANDIDATE_QUEUE_NOTE =
  "Human-review candidate pairs (S-06) appear only in the admin review queue artifact. They are candidates for human review — never identity matches, never presented as leads — and the public entity loader in this layer never returns them.";

export const CONTRACTS_PENDING_NOTE =
  "The contracts rules (C-01 to C-06) and the contracts-side screening records (S-02, X-MULTI-01) are defined in the Phase 6 design, but their input aggregates are not yet published with a valid record, so no contracts signal has been computed. This state is a labelled state, not an empty result: no contracts lead count of zero is implied anywhere in this publication.";

// ---------------------------------------------------------------------------
// Artifact loading — same pattern as grants-data.ts. Root:
//   FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT  full prefix of the versioned
//   signals artifact tree, e.g. https://<store>.public.blob.vercel-
//   storage.com/fraud-radar/signals/2026-02-09+2022-2024+2026-10-06
//   or an absolute local path to that dir.
// Unconfigured => surfaces render an honest "not published yet" state.
// ---------------------------------------------------------------------------

export interface SignalsConfig {
  root: string;
  version: string;
  isHttp: boolean;
}

export function signalsConfig(
  env: Record<string, string | undefined> = process.env,
): SignalsConfig | null {
  const root = env.FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT?.trim().replace(/\/+$/, "");
  if (!root) return null;
  return {
    root,
    version: env.FRAUD_RADAR_SIGNALS_VERSION?.trim() || DEFAULT_SIGNALS_VERSION,
    isHttp: /^https?:\/\//i.test(root),
  };
}

export type SignalsLoader = (relPath: string) => Promise<unknown | null>;

export function createSignalsLoader(config: SignalsConfig): SignalsLoader {
  if (config.isHttp) {
    return async (relPath) => {
      try {
        const res = await fetch(`${config.root}/${relPath}`, {
          cache: "force-cache",
        });
        if (!res.ok) return null;
        return (await res.json()) as unknown;
      } catch {
        return null;
      }
    };
  }
  return async (relPath) => {
    try {
      const { readFile } = await import("node:fs/promises");
      const path = await import("node:path");
      return JSON.parse(await readFile(path.join(config.root, relPath), "utf8")) as unknown;
    } catch {
      return null;
    }
  };
}

let defaultLoader: SignalsLoader | null = null;
export function getSignalsLoader(): SignalsLoader | null {
  const config = signalsConfig();
  if (!config) return null;
  if (!defaultLoader) defaultLoader = createSignalsLoader(config);
  return defaultLoader;
}

/** Bucket scheme (must match the publisher):
 *  bucket(key) = int(md5(key utf-8) hexdigest first 8 chars, 16) % 100,
 *  rendered as two digits. */
export function signalBucket(key: string): string {
  const hex = createHash("md5").update(key, "utf8").digest("hex");
  const n = parseInt(hex.slice(0, 8), 16) % 100;
  return String(n).padStart(2, "0");
}

export type SignalsEngine = "healthcare" | "care" | "grants" | "cross" | "contracts";
export const PUBLISHED_ENGINES: SignalsEngine[] = ["healthcare", "care", "grants", "cross"];

// ---------------------------------------------------------------------------
// dataset.json — provenance + engine states + language rules.
// ---------------------------------------------------------------------------

export interface SignalsEngineState {
  state: string; // "published" | typeof CONTRACTS_PENDING_STATE
  publication: string | null;
  note: string | null;
}

export interface SignalsDatasetMeta {
  dataset: string;
  version: string;
  generatedAt: string | null;
  ruleLibraryVersion: string;
  engines: Record<string, SignalsEngineState>;
  languageRules: {
    framing: string;
    candidateStatusConstant: string;
    provenanceBlockFields: string[];
    standing: string[];
  } | null;
  methodsSummary: {
    leadTest: string;
    byConstructionDisclosure: string;
    models: string;
    peerGroups: string;
    screeningRecords: string;
    notComputedStates: string[];
  } | null;
  qualitySummary: {
    checkRecords: number | null;
    datasetsChecked: number | null;
    overallState: string | null;
    runDate: string | null;
    detailFile: string | null;
  } | null;
  provenance: Record<string, unknown> | null;
}

interface RawDataset {
  dataset: string;
  version: string;
  generatedAt?: string | null;
  ruleLibraryVersion?: string;
  engines?: Record<string, { state: string; publication?: string; note?: string }>;
  languageRules?: SignalsDatasetMeta["languageRules"];
  methodsSummary?: SignalsDatasetMeta["methodsSummary"];
  qualitySummary?: {
    checkRecords?: number;
    datasetsChecked?: number;
    overallState?: string;
    runDate?: string;
    detailFile?: string;
  } | null;
  provenance?: Record<string, unknown> | null;
}

export function decodeSignalsDatasetMeta(raw: RawDataset): SignalsDatasetMeta {
  const engines: Record<string, SignalsEngineState> = {};
  for (const [name, e] of Object.entries(raw.engines ?? {})) {
    engines[name] = {
      state: e.state,
      publication: e.publication ?? null,
      note: e.note ?? null,
    };
  }
  return {
    dataset: raw.dataset,
    version: raw.version,
    generatedAt: raw.generatedAt ?? null,
    ruleLibraryVersion: raw.ruleLibraryVersion ?? DEFAULT_RULE_LIBRARY_VERSION,
    engines,
    languageRules: raw.languageRules ?? null,
    methodsSummary: raw.methodsSummary ?? null,
    qualitySummary: raw.qualitySummary
      ? {
          checkRecords: raw.qualitySummary.checkRecords ?? null,
          datasetsChecked: raw.qualitySummary.datasetsChecked ?? null,
          overallState: raw.qualitySummary.overallState ?? null,
          runDate: raw.qualitySummary.runDate ?? null,
          detailFile: raw.qualitySummary.detailFile ?? null,
        }
      : null,
    provenance: raw.provenance ?? null,
  };
}

export async function getSignalsDatasetMeta(
  loader: SignalsLoader | null = getSignalsLoader(),
): Promise<SignalsDatasetMeta | null> {
  if (!loader) return null;
  const raw = (await loader("dataset.json")) as RawDataset | null;
  if (!raw) return null;
  return decodeSignalsDatasetMeta(raw);
}

/** The contracts engine as a typed pending state — never as an
 *  empty engine and never as zero leads. Reads the state from the
 *  dataset meta when published; falls back to the constant state
 *  so callers can render the labelled pending state even before
 *  artifacts are configured. */
export interface ContractsPendingState {
  engine: "contracts";
  state: typeof CONTRACTS_PENDING_STATE;
  ruleCodes: string[];
  recordCodes: string[];
  note: string;
}

export function contractsPendingState(
  meta: SignalsDatasetMeta | null,
): ContractsPendingState {
  return {
    engine: "contracts",
    state: CONTRACTS_PENDING_STATE,
    ruleCodes: ["C-01", "C-02", "C-03", "C-04", "C-05", "C-06"],
    recordCodes: ["S-02", "X-MULTI-01"],
    note: meta?.engines?.contracts?.note ?? CONTRACTS_PENDING_NOTE,
  };
}

// ---------------------------------------------------------------------------
// Rule catalog — rules/<engine>.json, generated from the pipeline
// rule library. The catalog is the ONLY source of names,
// definitions and caveats the app renders.
// ---------------------------------------------------------------------------

export interface SignalRuleDef {
  code: string;
  name: string;
  definition: string;
  engine: string;
  band: string | null;
  floors: Record<string, number> | null;
  ratioFloor: number | null;
  measureName: string | null;
  peerSpec: string | null;
  caveatCodes: string[];
  caveats: { code: string; text: string }[];
  inputVersions: string;
  methodFamily: string;
  role: string | null;
  sourceTable: string | null;
  ruleLibraryVersion: string;
}

export interface SignalsRulesFile {
  engine: string;
  ruleLibraryVersion: string;
  state: string; // "published" | typeof CONTRACTS_PENDING_STATE
  rules: SignalRuleDef[];
  /** Present only on the pending contracts file. */
  pending: {
    state: string;
    gate: string | null;
    reason: string | null;
    pendingRuleCodes: string[];
    pendingRecordCodes: string[];
  } | null;
}

interface RawRule {
  code: string;
  name: string;
  definition: string;
  engine: string;
  band?: string | null;
  floors?: Record<string, number> | null;
  ratio_floor?: number | null;
  measure_name?: string | null;
  peer_spec?: string | null;
  caveat_codes?: string[];
  caveats?: { code: string; text: string }[];
  input_versions: string;
  method_family: string;
  role?: string | null;
  source_table?: string | null;
  rule_library_version: string;
}

interface RawRulesFile {
  engine: string;
  ruleLibraryVersion?: string;
  state: string;
  v?: string;
  rules?: RawRule[];
  gate?: string;
  reason?: string;
  pendingRuleCodes?: string[];
  pendingRecordCodes?: string[];
}

export function decodeSignalRule(raw: RawRule): SignalRuleDef {
  return {
    code: raw.code,
    name: raw.name,
    definition: raw.definition,
    engine: raw.engine,
    band: raw.band ?? null,
    floors: raw.floors ?? null,
    ratioFloor: raw.ratio_floor ?? null,
    measureName: raw.measure_name ?? null,
    peerSpec: raw.peer_spec ?? null,
    caveatCodes: raw.caveat_codes ?? [],
    caveats: raw.caveats ?? [],
    inputVersions: raw.input_versions,
    methodFamily: raw.method_family,
    role: raw.role ?? null,
    sourceTable: raw.source_table ?? null,
    ruleLibraryVersion: raw.rule_library_version,
  };
}

export function decodeSignalsRulesFile(raw: RawRulesFile): SignalsRulesFile {
  const isPending = raw.state === CONTRACTS_PENDING_STATE;
  return {
    engine: raw.engine,
    ruleLibraryVersion: raw.ruleLibraryVersion ?? DEFAULT_RULE_LIBRARY_VERSION,
    state: raw.state,
    rules: (raw.rules ?? []).map(decodeSignalRule),
    pending: isPending
      ? {
          state: raw.state,
          gate: raw.gate ?? null,
          reason: raw.reason ?? null,
          pendingRuleCodes: raw.pendingRuleCodes ?? [],
          pendingRecordCodes: raw.pendingRecordCodes ?? [],
        }
      : null,
  };
}

export async function getSignalsRules(
  engine: SignalsEngine,
  loader: SignalsLoader | null = getSignalsLoader(),
): Promise<SignalsRulesFile | null> {
  if (!loader) return null;
  const raw = (await loader(`rules/${engine}.json`)) as RawRulesFile | null;
  if (!raw) return null;
  return decodeSignalsRulesFile(raw);
}

// ---------------------------------------------------------------------------
// Lead / screening-record rows — the wire shape is the pipeline's
// published row, snake_case, with the full provenance block on
// every row. Rule rows carry rule_code; cross rows carry
// record_code (+ record_class / record_key / source_table).
// ---------------------------------------------------------------------------

export interface SignalLead {
  entityKey: string;
  entityKeyType: string | null;
  /** rule_code on rule rows, record_code on cross rows. */
  code: string;
  codeKind: "rule" | "record";
  recordClass: string | null;
  recordKey: string | null;
  ruleLibraryVersion: string;
  lead: boolean;
  status: string;
  measureName: string;
  measureValue: number | null;
  peerGroupDefinition: string | null;
  peerGroupKey: string | null;
  peerRung: string | null;
  peerN: number | null;
  peerMedian: number | null;
  peerP90: number | null;
  peerP99: number | null;
  percentileBand: string | null;
  percentileWithinPeerGroup: number | null;
  ratioToPeerMedian: number | null;
  robustDistanceFromPeerMedian: number | null;
  inputVersions: string;
  computedAt: string;
  caveatCodes: string[];
  detail: Record<string, unknown> | null;
  sourceTable: string | null;
}

interface RawSignalRow {
  entity_key: string;
  entity_key_type?: string | null;
  rule_code?: string;
  record_code?: string;
  record_class?: string | null;
  record_key?: string | null;
  rule_library_version: string;
  lead: boolean;
  status: string;
  measure_name: string;
  measure_value: number | null;
  peer_group_definition: string | null;
  peer_group_key: string | null;
  peer_rung: string | null;
  peer_n: number | null;
  peer_median: number | null;
  peer_p90: number | null;
  peer_p99: number | null;
  percentile_band: string | null;
  percentile_within_peer_group: number | null;
  ratio_to_peer_median: number | null;
  robust_distance_from_peer_median: number | null;
  input_versions: string;
  computed_at: string;
  caveat_codes?: string[];
  detail?: Record<string, unknown> | null;
  source_table?: string | null;
}

export function decodeSignalRow(raw: RawSignalRow): SignalLead {
  const isRecord = raw.rule_code == null && raw.record_code != null;
  return {
    entityKey: raw.entity_key,
    entityKeyType: raw.entity_key_type ?? null,
    code: (raw.rule_code ?? raw.record_code) as string,
    codeKind: isRecord ? "record" : "rule",
    recordClass: raw.record_class ?? null,
    recordKey: raw.record_key ?? null,
    ruleLibraryVersion: raw.rule_library_version,
    lead: raw.lead,
    status: raw.status,
    measureName: raw.measure_name,
    measureValue: raw.measure_value ?? null,
    peerGroupDefinition: raw.peer_group_definition ?? null,
    peerGroupKey: raw.peer_group_key ?? null,
    peerRung: raw.peer_rung ?? null,
    peerN: raw.peer_n ?? null,
    peerMedian: raw.peer_median ?? null,
    peerP90: raw.peer_p90 ?? null,
    peerP99: raw.peer_p99 ?? null,
    percentileBand: raw.percentile_band ?? null,
    percentileWithinPeerGroup: raw.percentile_within_peer_group ?? null,
    ratioToPeerMedian: raw.ratio_to_peer_median ?? null,
    robustDistanceFromPeerMedian: raw.robust_distance_from_peer_median ?? null,
    inputVersions: raw.input_versions,
    computedAt: raw.computed_at,
    caveatCodes: raw.caveat_codes ?? [],
    detail: raw.detail ?? null,
    sourceTable: raw.source_table ?? null,
  };
}

/** The §2.3 provenance block is complete when the identity fields
 *  are all present and — wherever a peer median exists — the peer
 *  definition, rung and n travel with it. Own-history and
 *  cross-dataset rows carry a peer-group definition text stating
 *  there is no peer group; their peer statistics are null by
 *  design, which is completeness, not absence. */
export function signalLeadProvenanceComplete(lead: SignalLead): boolean {
  if (!lead.code || !lead.ruleLibraryVersion || !lead.inputVersions) return false;
  if (!lead.computedAt || !lead.measureName) return false;
  if (lead.peerMedian != null) {
    if (!lead.peerGroupDefinition || lead.peerN == null || !lead.peerRung) return false;
  }
  return true;
}

export interface EntitySignals {
  entityKey: string;
  entityKeyType: string | null;
  engine: string;
  /** Rule leads only (lead = true rows as published). */
  leads: SignalLead[];
  /** Class-S screening records — their own block, never merged
   *  with leads. Empty for non-cross engines. Never contains
   *  S-06 (see the confinement rule in the header). */
  screeningRecords: SignalLead[];
}

interface RawEntityFile {
  v: string;
  engine: string;
  entities: Record<
    string,
    {
      entityKey: string;
      entityKeyType?: string | null;
      leads?: RawSignalRow[];
      screeningRecords?: RawSignalRow[];
    }
  >;
}

const CANDIDATE_RECORD_CODE = "S-06";

function isCandidateRow(row: RawSignalRow): boolean {
  return (row.record_code ?? row.rule_code) === CANDIDATE_RECORD_CODE;
}

/**
 * Public entity read. Returns the entity's published leads and —
 * for cross — its screening records in their own block. S-06
 * candidate pairs are filtered from EVERY block here: they exist
 * only in the admin queue artifact (getAdminCandidateQueue), so
 * no public entity context can surface them through this layer
 * even if a bucket file were ever mis-published with one.
 * Entity files carry leads only: evaluated-but-not-lead rows and
 * not-computed status rows are not published per entity (their
 * counts live in the manifests and the Neon summary grain).
 */
export async function getEntitySignals(
  engine: SignalsEngine,
  entityKeyRaw: string,
  loader: SignalsLoader | null = getSignalsLoader(),
): Promise<EntitySignals | null> {
  if (!loader) return null;
  const entityKey = entityKeyRaw.trim();
  if (!entityKey) return null;
  const raw = (await loader(
    `sig/${engine}/${signalBucket(entityKey)}.json`,
  )) as RawEntityFile | null;
  if (!raw) return null;
  const ent = raw.entities?.[entityKey];
  if (!ent) return null;
  return {
    entityKey: ent.entityKey ?? entityKey,
    entityKeyType: ent.entityKeyType ?? null,
    engine: raw.engine ?? engine,
    leads: (ent.leads ?? []).filter((r) => !isCandidateRow(r)).map(decodeSignalRow),
    screeningRecords: (ent.screeningRecords ?? [])
      .filter((r) => !isCandidateRow(r))
      .map(decodeSignalRow),
  };
}

// ---------------------------------------------------------------------------
// Data quality — quality.json (the artifact twin of the Neon
// FrDataQualityRecord grain; signals-neon.ts reads the DB copy).
// ---------------------------------------------------------------------------

export interface DataQualityRecordData {
  datasetSlug: string;
  datasetVersion: string;
  datasetKey: string;
  /** Overall state: pass | warn | fail | error. */
  verdict: string;
  checkCounts: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
    error: number;
    notApplicable: number;
  };
  checks: Record<string, Record<string, number>>;
  defectsInForce: string[];
  detailPointer: string;
  filesChecked: number;
  vintageAgeDays: number;
}

interface RawQualityRecord {
  dataset: string;
  version: string;
  datasetKey: string;
  overallState: string;
  checkCounts: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
    error: number;
    not_applicable: number;
  };
  checks: Record<string, Record<string, number>>;
  defectsInForce: string[];
  detailPointer: string;
  filesChecked: number;
  vintageAgeDays: number;
}

export function decodeDataQualityRecord(raw: RawQualityRecord): DataQualityRecordData {
  return {
    datasetSlug: raw.dataset,
    datasetVersion: raw.version,
    datasetKey: raw.datasetKey,
    verdict: raw.overallState,
    checkCounts: {
      total: raw.checkCounts.total,
      pass: raw.checkCounts.pass,
      warn: raw.checkCounts.warn,
      fail: raw.checkCounts.fail,
      error: raw.checkCounts.error,
      notApplicable: raw.checkCounts.not_applicable,
    },
    checks: raw.checks ?? {},
    defectsInForce: raw.defectsInForce ?? [],
    detailPointer: raw.detailPointer,
    filesChecked: raw.filesChecked,
    vintageAgeDays: raw.vintageAgeDays,
  };
}

export interface SignalsQuality {
  runDate: string | null;
  overallState: string | null;
  datasetsChecked: number;
  checkRecords: number;
  datasets: DataQualityRecordData[];
}

export async function getSignalsQuality(
  loader: SignalsLoader | null = getSignalsLoader(),
): Promise<SignalsQuality | null> {
  if (!loader) return null;
  const raw = (await loader("quality.json")) as {
    runDate?: string;
    overallState?: string;
    datasetsChecked?: number;
    checkRecords?: number;
    datasets?: Record<string, RawQualityRecord>;
  } | null;
  if (!raw) return null;
  return {
    runDate: raw.runDate ?? null,
    overallState: raw.overallState ?? null,
    datasetsChecked: raw.datasetsChecked ?? 0,
    checkRecords: raw.checkRecords ?? 0,
    datasets: Object.values(raw.datasets ?? {}).map(decodeDataQualityRecord),
  };
}

// ---------------------------------------------------------------------------
// ADMIN ONLY — the S-06 human-review candidate queue.
//
// This is the single function in the data layer that can read
// admin/candidate-queue.json. Callers must be behind the admin
// gate (Payload B2 wires it into /admin/fraud-radar); it is never
// used by any public surface, and getEntitySignals above can
// never return these rows. Every record carries the status
// constant CANDIDATE_STATUS ("candidate — human review").
// ---------------------------------------------------------------------------

export interface AdminCandidateQueue {
  version: string | null;
  recordCode: string;
  recordClass: string | null;
  statusConstant: string;
  surface: string | null;
  count: number;
  records: SignalLead[];
}

export async function getAdminCandidateQueue(
  loader: SignalsLoader | null = getSignalsLoader(),
): Promise<AdminCandidateQueue | null> {
  if (!loader) return null;
  const raw = (await loader("admin/candidate-queue.json")) as {
    v?: string;
    recordCode?: string;
    recordClass?: string | null;
    statusConstant?: string;
    surface?: string | null;
    count?: number;
    records?: RawSignalRow[];
  } | null;
  if (!raw) return null;
  return {
    version: raw.v ?? null,
    recordCode: raw.recordCode ?? CANDIDATE_RECORD_CODE,
    recordClass: raw.recordClass ?? null,
    statusConstant: raw.statusConstant ?? CANDIDATE_STATUS,
    surface: raw.surface ?? null,
    count: raw.count ?? (raw.records ?? []).length,
    records: (raw.records ?? []).map(decodeSignalRow),
  };
}
