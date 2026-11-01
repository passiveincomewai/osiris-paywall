/**
 * Fraud Radar Phase 8 — lead capture (PHASE8 §1.3).
 *
 * Pinning captures THROUGH the data layer, never the client
 * (rule 3): the pin routes take identifiers only — engine +
 * entityKey + ruleCode — and this module calls the same
 * data-layer functions the profile pages and the Phase 7 tools
 * use, stores what they return wrapped in the Phase 7 §2.3
 * citation-envelope shape, and computes snapshotSha256 over the
 * canonical serialisation. A client can never submit a snapshot
 * body, so a fabricated "lead" cannot be injected into a case.
 *
 * Snapshot semantics (the six binding rules, §1.3):
 *  1. Immutability — this module exposes create/read/delete
 *     only; the store (store.ts) has no snapshot update path.
 *     A dataset refresh produces a different hash and therefore
 *     a SECOND lead row (two vintages), never an edit.
 *  2. Rendering reads the snapshot, never live data (UI, P8-D).
 *  3. Server-side capture (above).
 *  4. S-06 candidate pairs keep their status verbatim and are
 *     pinnable ONLY through pinCandidateLeadAsAdmin — the
 *     public capture path refuses them by construction (the
 *     signals data layer filters S-06 out of every public read,
 *     and captureLead rejects the candidate kind outright).
 *  5. Investigator findings pin from the persisted message,
 *     read server-side by id with an ownership check — never
 *     from pasted answer text.
 *  6. not_computed_* states are pinnable as entity leads: an
 *     entity snapshot carries the entity's published signals
 *     block alongside its profile, so a published absence of a
 *     computed comparison is itself frozen as case material.
 */

import { createHash } from "node:crypto";
import {
  getProviderProfile,
  getDatasetMeta,
  HEALTHCARE_DATASET,
  DEFAULT_HEALTHCARE_VERSION,
} from "../healthcare-data";
import {
  getCareProviderProfile,
  getCareDatasetMeta,
  CARE_DATASET,
  DEFAULT_CARE_VERSION,
} from "../care-data";
import {
  getGrantRecipientProfile,
  getGrantsDatasetMeta,
  GRANTS_DATASET,
  DEFAULT_GRANTS_VERSION,
  SAM_ENTITIES_EXTRACT_VERSION,
  SAM_EXCLUSIONS_EXTRACT_VERSION,
} from "../grants-data";
import {
  getEntitySignals,
  getAdminCandidateQueue,
  getSignalsDatasetMeta,
  SIGNALS_DATASET,
  DEFAULT_SIGNALS_VERSION,
  CANDIDATE_STATUS,
  type SignalsEngine,
} from "../signals-data";
import type { CitationEnvelope } from "../investigator/citations";
import { getInvestigatorStore } from "../investigator/store";
import type { CaseStore, LeadRecord } from "./store";

// ---------------------------------------------------------------------------
// Canonical serialisation + hash
// ---------------------------------------------------------------------------

/** Deterministic JSON: object keys sorted recursively, array
 *  order preserved, undefined dropped (JSON semantics). The hash
 *  is only meaningful against this exact serialisation. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
    .join(",")}}`;
}

export function snapshotSha256(snapshot: unknown): string {
  return createHash("sha256").update(canonicalJson(snapshot), "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Errors — honest codes the routes map to HTTP states
// ---------------------------------------------------------------------------

export type LeadCaptureErrorCode =
  | "invalid_input"
  | "dataset_not_published"
  | "lead_not_found"
  | "candidate_admin_only";

export class LeadCaptureError extends Error {
  code: LeadCaptureErrorCode;
  constructor(code: LeadCaptureErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Entity keys
// ---------------------------------------------------------------------------

export const LEAD_ENGINES = ["healthcare", "care", "grants", "contracts", "cross"] as const;
export type LeadEngine = (typeof LEAD_ENGINES)[number];
export const LEAD_KINDS = ["signal", "screening", "candidate", "entity", "investigator"] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

/** Split a submitted entity key into the bare data-layer key and
 *  the canonical stored form ("NPI:…" / "UEI:…" / "EIN:…"). */
export function splitEntityKey(
  engine: string,
  raw: string,
): { bare: string; canonical: string; keyType: string | null } {
  const trimmed = raw.trim();
  const prefixed = /^([A-Za-z]+):(.+)$/.exec(trimmed);
  let bare = trimmed;
  let keyType: string | null = null;
  if (prefixed) {
    keyType = prefixed[1].toUpperCase();
    bare = prefixed[2].trim();
  } else if (engine === "healthcare" || engine === "care") {
    keyType = "NPI";
  } else if (engine === "grants") {
    keyType = "UEI";
  } else if (engine === "cross") {
    if (/^\d{10}$/.test(trimmed)) keyType = "NPI";
    else if (/^\d{9}$/.test(trimmed)) keyType = "EIN";
    else keyType = "UEI";
  }
  bare = bare.toUpperCase();
  return { bare, canonical: keyType ? `${keyType}:${bare}` : bare, keyType };
}

function signalsEngineFor(engine: string): SignalsEngine | null {
  if (engine === "healthcare" || engine === "care" || engine === "grants" || engine === "cross") {
    return engine;
  }
  return null; // contracts signals are a labelled pending state, not an engine read
}

// ---------------------------------------------------------------------------
// Capture dependencies (injectable for tests; defaults are the
// published data layers — the same functions the pages/tools use)
// ---------------------------------------------------------------------------

export interface LeadCaptureDeps {
  getProviderProfile: typeof getProviderProfile;
  getDatasetMeta: typeof getDatasetMeta;
  getCareProviderProfile: typeof getCareProviderProfile;
  getCareDatasetMeta: typeof getCareDatasetMeta;
  getGrantRecipientProfile: typeof getGrantRecipientProfile;
  getGrantsDatasetMeta: typeof getGrantsDatasetMeta;
  getEntitySignals: typeof getEntitySignals;
  getAdminCandidateQueue: typeof getAdminCandidateQueue;
  getSignalsDatasetMeta: typeof getSignalsDatasetMeta;
}

export const defaultCaptureDeps: LeadCaptureDeps = {
  getProviderProfile,
  getDatasetMeta,
  getCareProviderProfile,
  getCareDatasetMeta,
  getGrantRecipientProfile,
  getGrantsDatasetMeta,
  getEntitySignals,
  getAdminCandidateQueue,
  getSignalsDatasetMeta,
};

export interface CapturedLead {
  kind: string;
  engine: string;
  entityKey: string;
  entityLabel: string;
  snapshot: CitationEnvelope & { data: unknown };
  snapshotSha256: string;
  sourceDataset: string;
  sourceDatasetVersion: string;
  ruleCode: string | null;
}

function envelope(args: {
  dataset: string;
  datasetVersion: string;
  grainKey: string;
  sourceVintages: CitationEnvelope["sourceVintages"];
  caveats: string[];
  data: unknown;
}): CitationEnvelope & { data: unknown } {
  return {
    tool: "case_lead_capture",
    dataset: args.dataset,
    datasetVersion: args.datasetVersion,
    grainKey: args.grainKey,
    sourceVintages: args.sourceVintages,
    caveats: args.caveats,
    truncated: false,
    data: args.data,
  };
}

function finish(
  partial: Omit<CapturedLead, "snapshotSha256">,
): CapturedLead {
  return { ...partial, snapshotSha256: snapshotSha256(partial.snapshot) };
}

/** Fail-soft display label from the entity's profile, when one is
 *  published; the canonical key is the honest fallback label. */
async function labelFor(
  engine: string,
  bare: string,
  canonical: string,
  deps: LeadCaptureDeps,
): Promise<string> {
  try {
    if (engine === "healthcare") {
      const p = await deps.getProviderProfile(bare);
      return p?.identity?.displayName ?? p?.stub?.displayName ?? canonical;
    }
    if (engine === "care") {
      const p = await deps.getCareProviderProfile(bare);
      return p?.identity?.displayName ?? p?.stub?.displayName ?? canonical;
    }
    if (engine === "grants") {
      const p = await deps.getGrantRecipientProfile(bare);
      return p?.identity?.recipientName ?? p?.stub?.recipientName ?? canonical;
    }
  } catch {
    /* label is cosmetic; the snapshot is the record */
  }
  return canonical;
}

// ---------------------------------------------------------------------------
// Capture — the public path (signal / screening / entity)
// ---------------------------------------------------------------------------

export interface PinInput {
  kind: string;
  engine: string;
  entityKey: string;
  ruleCode?: string | null;
}

export async function captureLead(
  input: PinInput,
  deps: LeadCaptureDeps = defaultCaptureDeps,
): Promise<CapturedLead> {
  const kind = input.kind;
  const engine = input.engine;
  if (!(LEAD_KINDS as readonly string[]).includes(kind)) {
    throw new LeadCaptureError("invalid_input", `unknown lead kind: ${kind}`);
  }
  if (!(LEAD_ENGINES as readonly string[]).includes(engine)) {
    throw new LeadCaptureError("invalid_input", `unknown engine: ${engine}`);
  }
  if (kind === "candidate") {
    // Rule 4: candidates are pinnable only from the admin review
    // queue path (pinCandidateLeadAsAdmin). The public path
    // refuses by construction, whatever ruleCode was submitted.
    throw new LeadCaptureError(
      "candidate_admin_only",
      "candidate pairs can only be pinned from the admin review queue",
    );
  }
  if (kind === "investigator") {
    throw new LeadCaptureError(
      "invalid_input",
      "investigator findings pin through the from-investigator path",
    );
  }
  if (!input.entityKey?.trim()) {
    throw new LeadCaptureError("invalid_input", "entityKey is required");
  }
  const { bare, canonical } = splitEntityKey(engine, input.entityKey);
  const ruleCode = input.ruleCode?.trim() ? input.ruleCode.trim() : null;

  if (kind === "signal" || kind === "screening") {
    if (!ruleCode) {
      throw new LeadCaptureError("invalid_input", "ruleCode is required for signal/screening leads");
    }
    if (kind === "screening" && ruleCode === "S-06") {
      throw new LeadCaptureError(
        "candidate_admin_only",
        "candidate pairs can only be pinned from the admin review queue",
      );
    }
    const sigEngine = signalsEngineFor(engine);
    if (!sigEngine) {
      throw new LeadCaptureError(
        "dataset_not_published",
        "research signals for the contracts engine are not yet published",
      );
    }
    const signals = await deps.getEntitySignals(sigEngine, bare);
    if (!signals) {
      throw new LeadCaptureError(
        "dataset_not_published",
        "the research signals dataset is not published for this entity in this deployment",
      );
    }
    const meta = await deps.getSignalsDatasetMeta().catch(() => null);
    const version = meta?.version ?? DEFAULT_SIGNALS_VERSION;
    const pool = kind === "signal" ? signals.leads : signals.screeningRecords;
    const record = pool.find((r) => r.code === ruleCode && (kind === "screening" || r.lead));
    if (!record) {
      throw new LeadCaptureError(
        "lead_not_found",
        `no published ${kind} record ${ruleCode} for this entity`,
      );
    }
    const entityLabel = await labelFor(engine, bare, canonical, deps);
    return finish({
      kind,
      engine,
      entityKey: canonical,
      entityLabel,
      sourceDataset: SIGNALS_DATASET,
      sourceDatasetVersion: version,
      ruleCode,
      snapshot: envelope({
        dataset: SIGNALS_DATASET,
        datasetVersion: version,
        grainKey: canonical,
        sourceVintages: [{ source: SIGNALS_DATASET, version }],
        caveats: record.caveatCodes,
        data: record,
      }),
    });
  }

  // kind === "entity": the profile record itself (rule 6 — the
  // published signals block travels with it, including its
  // published absence of computed leads).
  if (engine === "contracts") {
    throw new LeadCaptureError(
      "dataset_not_published",
      "contract vendor profiles are not yet published in this deployment",
    );
  }
  const sigEngine = signalsEngineFor(engine);
  const signals = sigEngine
    ? await deps.getEntitySignals(sigEngine, bare).catch(() => null)
    : null;

  if (engine === "healthcare") {
    const profile = await deps.getProviderProfile(bare);
    if (!profile) {
      throw new LeadCaptureError("lead_not_found", "no published Medicaid provider profile for this entity");
    }
    const meta = await deps.getDatasetMeta().catch(() => null);
    const version = meta?.version ?? DEFAULT_HEALTHCARE_VERSION;
    return finish({
      kind,
      engine,
      entityKey: canonical,
      entityLabel: profile.identity?.displayName ?? profile.stub?.displayName ?? canonical,
      sourceDataset: HEALTHCARE_DATASET,
      sourceDatasetVersion: version,
      ruleCode: null,
      snapshot: envelope({
        dataset: HEALTHCARE_DATASET,
        datasetVersion: version,
        grainKey: canonical,
        sourceVintages: [{ source: HEALTHCARE_DATASET, version }],
        caveats: [],
        data: { profile, signals },
      }),
    });
  }
  if (engine === "care") {
    const profile = await deps.getCareProviderProfile(bare);
    if (!profile) {
      throw new LeadCaptureError("lead_not_found", "no published Medicare provider profile for this entity");
    }
    const meta = await deps.getCareDatasetMeta().catch(() => null);
    const version = meta?.version ?? DEFAULT_CARE_VERSION;
    return finish({
      kind,
      engine,
      entityKey: canonical,
      entityLabel: profile.identity?.displayName ?? profile.stub?.displayName ?? canonical,
      sourceDataset: CARE_DATASET,
      sourceDatasetVersion: version,
      ruleCode: null,
      snapshot: envelope({
        dataset: CARE_DATASET,
        datasetVersion: version,
        grainKey: canonical,
        sourceVintages: [{ source: CARE_DATASET, version }],
        caveats: [],
        data: { profile, signals },
      }),
    });
  }
  if (engine === "grants") {
    const profile = await deps.getGrantRecipientProfile(bare);
    if (!profile) {
      throw new LeadCaptureError("lead_not_found", "no published grant recipient profile for this entity");
    }
    const meta = await deps.getGrantsDatasetMeta().catch(() => null);
    const version = meta?.version ?? DEFAULT_GRANTS_VERSION;
    return finish({
      kind,
      engine,
      entityKey: canonical,
      entityLabel: profile.identity?.recipientName ?? profile.stub?.recipientName ?? canonical,
      sourceDataset: GRANTS_DATASET,
      sourceDatasetVersion: version,
      ruleCode: null,
      snapshot: envelope({
        dataset: GRANTS_DATASET,
        datasetVersion: version,
        grainKey: canonical,
        sourceVintages: [
          { source: GRANTS_DATASET, version },
          { source: "sam-entities", version: SAM_ENTITIES_EXTRACT_VERSION, extractDate: SAM_ENTITIES_EXTRACT_VERSION },
          { source: "sam-exclusions", version: SAM_EXCLUSIONS_EXTRACT_VERSION, extractDate: "2026-10-28" },
        ],
        caveats: ["CUMULATIVE_AMOUNTS", "EXTRACT_DATED"],
        data: { profile, signals },
      }),
    });
  }
  // engine === "cross": the entity lead is its signals record set.
  if (!signals) {
    throw new LeadCaptureError(
      "dataset_not_published",
      "the research signals dataset is not published for this entity in this deployment",
    );
  }
  const meta = await deps.getSignalsDatasetMeta().catch(() => null);
  const version = meta?.version ?? DEFAULT_SIGNALS_VERSION;
  return finish({
    kind,
    engine,
    entityKey: canonical,
    entityLabel: canonical,
    sourceDataset: SIGNALS_DATASET,
    sourceDatasetVersion: version,
    ruleCode: null,
    snapshot: envelope({
      dataset: SIGNALS_DATASET,
      datasetVersion: version,
      grainKey: canonical,
      sourceVintages: [{ source: SIGNALS_DATASET, version }],
      caveats: [],
      data: { profile: null, signals },
    }),
  });
}

// ---------------------------------------------------------------------------
// Capture — the admin queue path (S-06 candidates, rule 4)
// ---------------------------------------------------------------------------

export async function captureCandidateLead(
  input: { engine: string; entityKey: string },
  deps: LeadCaptureDeps = defaultCaptureDeps,
): Promise<CapturedLead> {
  const queue = await deps.getAdminCandidateQueue();
  if (!queue) {
    throw new LeadCaptureError(
      "dataset_not_published",
      "the candidate review queue is not published in this deployment",
    );
  }
  const { bare, canonical } = splitEntityKey(input.engine || "cross", input.entityKey);
  const record = queue.records.find(
    (r) => r.entityKey.toUpperCase() === bare && r.code === "S-06",
  );
  if (!record) {
    throw new LeadCaptureError("lead_not_found", "no candidate pair for this entity in the review queue");
  }
  const version = queue.version ?? DEFAULT_SIGNALS_VERSION;
  return finish({
    kind: "candidate",
    engine: input.engine || "cross",
    entityKey: canonical,
    entityLabel: canonical,
    sourceDataset: SIGNALS_DATASET,
    sourceDatasetVersion: version,
    ruleCode: "S-06",
    snapshot: envelope({
      dataset: SIGNALS_DATASET,
      datasetVersion: version,
      grainKey: canonical,
      sourceVintages: [{ source: SIGNALS_DATASET, version }],
      caveats: record.caveatCodes,
      // The status travels verbatim — pinning never upgrades a
      // candidate into a lead (§1.3 rule 4).
      data: { record, statusConstant: queue.statusConstant ?? CANDIDATE_STATUS },
    }),
  });
}

// ---------------------------------------------------------------------------
// Pinning — capture + coalesce + store + event
// ---------------------------------------------------------------------------

async function storeCaptured(
  store: CaseStore,
  args: { caseId: string; pinnedById: string; annotation?: string | null },
  captured: CapturedLead,
): Promise<{ lead: LeadRecord; created: boolean }> {
  // Coalescing (§1.3): re-pinning the identical snapshot into the
  // same case is a no-op — a double-click never forks the trail.
  // A refreshed dataset hashes differently and lands as a second,
  // distinct vintage row; the first is never edited.
  const existing = await store.findLeadByCoalesceKey(
    args.caseId,
    captured.entityKey,
    captured.ruleCode,
    captured.snapshotSha256,
  );
  if (existing) return { lead: existing, created: false };
  const lead = await store.createLead({
    caseId: args.caseId,
    kind: captured.kind,
    engine: captured.engine,
    entityKey: captured.entityKey,
    entityLabel: captured.entityLabel,
    snapshot: captured.snapshot,
    snapshotSha256: captured.snapshotSha256,
    sourceDataset: captured.sourceDataset,
    sourceDatasetVersion: captured.sourceDatasetVersion,
    ruleCode: captured.ruleCode,
    pinnedById: args.pinnedById,
    annotation: args.annotation ?? null,
  });
  await store.createEvent({
    caseId: args.caseId,
    kind: "lead_pinned",
    actorId: args.pinnedById,
    detail: {
      leadId: lead.id,
      kind: lead.kind,
      engine: lead.engine,
      entityKey: lead.entityKey,
      ruleCode: lead.ruleCode,
      sourceDataset: lead.sourceDataset,
      sourceDatasetVersion: lead.sourceDatasetVersion,
      snapshotSha256: lead.snapshotSha256,
    },
  });
  return { lead, created: true };
}

export async function pinLead(
  store: CaseStore,
  args: {
    caseId: string;
    pinnedById: string;
    input: PinInput;
    annotation?: string | null;
  },
  deps: LeadCaptureDeps = defaultCaptureDeps,
): Promise<{ lead: LeadRecord; created: boolean }> {
  const captured = await captureLead(args.input, deps);
  return storeCaptured(store, args, captured);
}

/** The admin review-queue pin path — the ONLY path that can pin
 *  an S-06 candidate pair. Callers must prove admin status; this
 *  function refuses without it, and the public route never calls
 *  it. The candidate's status is stored verbatim. */
export async function pinCandidateLeadAsAdmin(
  store: CaseStore,
  args: {
    caseId: string;
    pinnedById: string;
    isAdmin: boolean;
    engine: string;
    entityKey: string;
    annotation?: string | null;
  },
  deps: LeadCaptureDeps = defaultCaptureDeps,
): Promise<{ lead: LeadRecord; created: boolean }> {
  if (!args.isAdmin) {
    throw new LeadCaptureError(
      "candidate_admin_only",
      "candidate pairs can only be pinned from the admin review queue",
    );
  }
  const captured = await captureCandidateLead(
    { engine: args.engine, entityKey: args.entityKey },
    deps,
  );
  return storeCaptured(store, args, captured);
}

// ---------------------------------------------------------------------------
// Pinning — investigator findings (rule 5)
// ---------------------------------------------------------------------------

export interface InvestigatorPinDeps {
  getConversation: (
    userId: string,
    id: string,
  ) => Promise<{ id: string; title: string } | null>;
  getMessage: (id: string) => Promise<{
    id: string;
    conversationId: string;
    role: string;
    content: string;
    toolCalls: unknown;
    model: string | null;
    promptVersion: string | null;
    validatorVerdict: string | null;
  } | null>;
}

export function defaultInvestigatorPinDeps(): InvestigatorPinDeps {
  const store = getInvestigatorStore();
  return {
    getConversation: (userId, id) => store.getConversation(userId, id),
    getMessage: (id) => store.getMessage(id),
  };
}

/**
 * Pin one persisted investigator assistant message into a case.
 * The message is read server-side by id and the conversation
 * must belong to the pinning user — a foreign or nonexistent
 * conversation/message reads as lead_not_found (the route maps
 * it to 404; existence is not leaked). Pasted answer text is
 * never accepted.
 */
export async function pinInvestigatorLead(
  store: CaseStore,
  args: {
    caseId: string;
    pinnedById: string;
    conversationId: string;
    messageId: string;
    annotation?: string | null;
  },
  deps: InvestigatorPinDeps = defaultInvestigatorPinDeps(),
): Promise<{ lead: LeadRecord; created: boolean }> {
  const conversation = await deps.getConversation(args.pinnedById, args.conversationId);
  if (!conversation) {
    throw new LeadCaptureError("lead_not_found", "investigator conversation not found");
  }
  const message = await deps.getMessage(args.messageId);
  if (!message || message.conversationId !== args.conversationId || message.role !== "assistant") {
    throw new LeadCaptureError("lead_not_found", "investigator message not found");
  }
  const version = message.promptVersion ?? "unknown";
  const snapshot = envelope({
    dataset: "fraud-radar-investigator",
    datasetVersion: version,
    grainKey: `message:${message.id}`,
    sourceVintages: [{ source: "fraud-radar-investigator", version }],
    caveats: [],
    data: {
      content: message.content,
      toolCalls: message.toolCalls,
      model: message.model,
      promptVersion: message.promptVersion,
      validatorVerdict: message.validatorVerdict,
      conversationId: args.conversationId,
      messageId: message.id,
    },
  });
  return storeCaptured(store, args, {
    kind: "investigator",
    engine: "cross",
    entityKey: `MSG:${message.id}`,
    entityLabel: conversation.title,
    snapshot,
    snapshotSha256: snapshotSha256(snapshot),
    sourceDataset: "fraud-radar-investigator",
    sourceDatasetVersion: version,
    ruleCode: null,
  });
}
