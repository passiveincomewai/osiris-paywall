/**
 * Fraud Radar Phase 7 — AI Investigator tool layer (PHASE7 §2).
 *
 * A fixed inventory of read-only tools. Each tool is a thin
 * adapter over an EXISTING data-layer function — the investigator
 * creates no new read path to artifacts, Parquet, or Neon. Every
 * argument is validated server-side before the adapter runs
 * (allowlisted args, identifier shapes per §2.1); an invalid
 * argument is a tool error, never a coerced guess. Every result
 * is wrapped in the §2.3 citation envelope (citations.ts).
 *
 * Gated tools (§2.5): the contracts tools depend on Phase 5
 * Payload A's contracts-data.ts, which has not landed — there is
 * no contracts data layer in the app tree to wrap, so those
 * tools are registered with an `availableWhen` predicate that is
 * false in every environment, are never offered to the model,
 * and carry their reason in the predicate report. The signals
 * tool's predicate is the signals artifact config check (Phase 6
 * Payloads P+A have landed, so the adapter is real); while the
 * artifact root is unconfigured the tool is likewise not
 * offered. Enabling a gated tool later is a registry change +
 * prompt-version bump, not an engine change.
 *
 * S-06 candidate pairs are structurally excluded: the signals
 * adapter reads only through signals-data's getEntitySignals,
 * which confines candidate pairs to the admin queue artifact,
 * and the adapter re-filters defensively before wrapping.
 */

import {
  HEALTHCARE_DATASET,
  DEFAULT_HEALTHCARE_VERSION,
  healthcareConfig,
  createArtifactLoader,
  getDatasetMeta,
  searchProviders,
  getProviderProfile,
  type ArtifactLoader,
} from "../healthcare-data";
import {
  CARE_DATASET,
  DEFAULT_CARE_VERSION,
  careConfig,
  createCareLoader,
  getCareDatasetMeta,
  searchCareProviders,
  getCareProviderProfile,
  type CareLoader,
} from "../care-data";
import {
  GRANTS_DATASET,
  DEFAULT_GRANTS_VERSION,
  DEFAULT_FAC_VERSION,
  SAM_ENTITIES_EXTRACT_VERSION,
  SAM_EXCLUSIONS_EXTRACT_VERSION,
  grantsConfig,
  createGrantsLoader,
  getGrantsDatasetMeta,
  searchGrantRecipients,
  getGrantRecipientProfile,
  type GrantsLoader,
} from "../grants-data";
import {
  SIGNALS_DATASET,
  DEFAULT_SIGNALS_VERSION,
  DEFAULT_RULE_LIBRARY_VERSION,
  signalsConfig,
  createSignalsLoader,
  getSignalsDatasetMeta,
  getEntitySignals,
  signalLeadProvenanceComplete,
  type SignalsLoader,
  type SignalsEngine,
  type EntitySignals,
} from "../signals-data";
import {
  listHcpcsSummaries,
  getHcpcsSummary,
  listMonthlyNational,
} from "../healthcare-neon";
import {
  CARE_COMPARE_VERSION,
  listMedicareHcpcs,
  listMedicareYearly,
  listHospiceProviders,
  listHomeHealthAgencies,
} from "../care-neon";
import {
  listGrantsAln,
  getGrantsAlnSummary,
  listGrantsAgency,
  listGrantsYearly,
  listFacYearly,
} from "../grants-neon";
import { FRAUD_RADAR_SOURCES } from "../sources";
import { getRegistryHealth, type RegistryHealth } from "../registry-admin";
import type {
  CitationEnvelope,
  SourceVintage,
  ToolResult,
} from "./citations";

export type { ToolResult } from "./citations";

// ---------------------------------------------------------------------------
// Errors, deps, shared validation (§2.1).
// ---------------------------------------------------------------------------

export class ToolError extends Error {
  code: "unknown_tool" | "tool_unavailable" | "invalid_args";
  constructor(
    code: "unknown_tool" | "tool_unavailable" | "invalid_args",
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

export interface ToolDeps {
  env?: Record<string, string | undefined>;
  loaders?: {
    healthcare?: ArtifactLoader | null;
    care?: CareLoader | null;
    grants?: GrantsLoader | null;
    signals?: SignalsLoader | null;
  };
  registryHealth?: () => Promise<RegistryHealth>;
}

type Env = Record<string, string | undefined>;

function invalid(message: string): never {
  throw new ToolError("invalid_args", message);
}

function reqRecord(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    invalid("tool arguments must be an object");
  }
  return args as Record<string, unknown>;
}

function rejectUnknownKeys(
  args: Record<string, unknown>,
  allowed: readonly string[],
): void {
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key)) invalid(`unexpected argument: ${key}`);
  }
}

function reqString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    invalid(`argument ${key} must be a non-empty string`);
  }
  return value.trim();
}

function optString(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") invalid(`argument ${key} must be a string`);
  return value.trim() === "" ? null : value.trim();
}

/** NPI = 10 digits (§2.1). */
export function isValidNpi(value: string): boolean {
  return /^\d{10}$/.test(value);
}

/** UEI = 12 chars; placeholder values (GSA_MIGRATION) and
 *  repeated-character UEIs are rejected as keys (Phase 4
 *  evidence, §2.1). The character class excludes the underscore
 *  the placeholder carries; O and I are excluded per the UEI
 *  standard the extracts follow. */
export function isValidUei(value: string): boolean {
  if (!/^[A-HJ-NPR-TV-Z0-9]{12}$/.test(value)) return false;
  if (/^([A-Z0-9])\1{11}$/.test(value)) return false;
  return true;
}

/** EIN = 9 digits (§2.1). */
export function isValidEin(value: string): boolean {
  return /^\d{9}$/.test(value);
}

/** HCPCS = 5-char code shape (§2.1). */
export function isValidHcpcs(value: string): boolean {
  return /^[A-Z0-9]{5}$/i.test(value);
}

/** ALN = NN.NNN shape (§2.1). */
export function isValidAln(value: string): boolean {
  return /^\d{2}\.\d{3}$/.test(value);
}

function reqNpi(args: Record<string, unknown>): string {
  const npi = reqString(args, "npi");
  if (!isValidNpi(npi)) invalid("npi must be exactly 10 digits");
  return npi;
}

function reqUei(args: Record<string, unknown>, key = "uei"): string {
  const uei = reqString(args, key).toUpperCase();
  if (!isValidUei(uei)) {
    invalid("uei must be a valid 12-character UEI (placeholder and repeated-character values are not keys)");
  }
  return uei;
}

function reqQuery(args: Record<string, unknown>): string {
  const query = reqString(args, "query");
  if (query.length > 120) invalid("query is too long");
  if (query.replace(/[^A-Za-z0-9]/g, "").length < 3) {
    invalid("query must carry at least 3 alphanumeric characters");
  }
  return query;
}

// ---------------------------------------------------------------------------
// Envelope helpers. SAM extract dates travel with the data
// (grants-data.ts header + the registry seed's lastPublishedAt):
// entities extract 2026-10-05; exclusions extract 2026-301 dated
// 2026-10-28.
// ---------------------------------------------------------------------------

export const SAM_ENTITIES_EXTRACT_DATE = "2026-10-05";
export const SAM_EXCLUSIONS_EXTRACT_DATE = "2026-10-28";

function seedVersion(slug: string): string | null {
  return FRAUD_RADAR_SOURCES.find((s) => s.slug === slug)?.sourceVersion ?? null;
}

function envelope(partial: Omit<CitationEnvelope, "tool">, tool: string): CitationEnvelope {
  return { ...partial, tool };
}

const SEARCH_CAP = 10; // §2.1: the model gets the top 10 stubs
const PROFILE_LIST_CAP = 25; // §2.1: profile list fields top-N + totals

function capList<T>(rows: T[]): { items: T[]; total: number; truncated: boolean } {
  return {
    items: rows.slice(0, PROFILE_LIST_CAP),
    total: rows.length,
    truncated: rows.length > PROFILE_LIST_CAP,
  };
}

// Loader resolution: an injected loader wins; otherwise the
// data layer's own config check builds one from the env.
function hcLoader(deps: ToolDeps): ArtifactLoader | null {
  if (deps.loaders && "healthcare" in deps.loaders) return deps.loaders.healthcare ?? null;
  const cfg = healthcareConfig(deps.env);
  return cfg ? createArtifactLoader(cfg) : null;
}
function careLoader(deps: ToolDeps): CareLoader | null {
  if (deps.loaders && "care" in deps.loaders) return deps.loaders.care ?? null;
  const cfg = careConfig(deps.env);
  return cfg ? createCareLoader(cfg) : null;
}
function grantsLoader(deps: ToolDeps): GrantsLoader | null {
  if (deps.loaders && "grants" in deps.loaders) return deps.loaders.grants ?? null;
  const cfg = grantsConfig(deps.env);
  return cfg ? createGrantsLoader(cfg) : null;
}
function signalsLoader(deps: ToolDeps): SignalsLoader | null {
  if (deps.loaders && "signals" in deps.loaders) return deps.loaders.signals ?? null;
  const cfg = signalsConfig(deps.env);
  return cfg ? createSignalsLoader(cfg) : null;
}

// ---------------------------------------------------------------------------
// Tool definition shape + registry.
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON-schema parameters (additionalProperties: false). */
  parameters: Record<string, unknown>;
  availableWhen: (env: Env) => boolean;
  /** Why the tool is off, when it is off in every environment
   *  or in the common unconfigured one (predicate report). */
  unavailableReason: string | null;
  execute: (
    args: Record<string, unknown>,
    deps: ToolDeps,
  ) => Promise<ToolResult>;
}

const QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["query"],
  properties: {
    query: { type: "string", minLength: 3, maxLength: 120 },
  },
} as const;

const NPI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["npi"],
  properties: { npi: { type: "string", pattern: "^[0-9]{10}$" } },
} as const;

const UEI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["uei"],
  properties: { uei: { type: "string", pattern: "^[A-Za-z0-9]{12}$" } },
} as const;

// ---------------------------------------------------------------------------
// Healthcare (Medicaid) — tools 1 + 5.
// ---------------------------------------------------------------------------

async function healthcareVintages(
  loader: ArtifactLoader | null,
  fallbackVersion: string,
): Promise<{ version: string; vintages: SourceVintage[] }> {
  const meta = await getDatasetMeta(loader);
  const version = meta?.version ?? fallbackVersion;
  const vintages: SourceVintage[] = [
    { source: "medicaid-hcpcs", version: meta?.sources.medicaid.version ?? version },
    { source: "leie", version: meta?.sources.leie.version ?? seedVersion("leie") ?? "unknown" },
    {
      source: "sam-exclusions",
      version: meta?.sources.samExclusions.version ?? SAM_EXCLUSIONS_EXTRACT_VERSION,
      extractDate: meta?.sources.samExclusions.extractDate ?? SAM_EXCLUSIONS_EXTRACT_DATE,
    },
  ];
  return { version, vintages };
}

const searchMedicaidProviders: ToolDefinition = {
  name: "search_medicaid_providers",
  description:
    "Search Medicaid (HHS provider spending) providers by NPI prefix (at least 3 digits) or by name. Returns up to 10 provider stubs in the data layer's own ranking, with the total count. Amounts are the published excl-outliers treatment; a role a provider does not appear in stays null, never zero.",
  parameters: QUERY_SCHEMA,
  availableWhen: (env) => healthcareConfig(env) !== null,
  unavailableReason: "medicaid artifact root not configured (FRAUD_RADAR_ARTIFACT_ROOT)",
  async execute(rawArgs, deps) {
    const args = reqRecord(rawArgs);
    rejectUnknownKeys(args, ["query"]);
    const query = reqQuery(args);
    const loader = hcLoader(deps);
    const cfg = healthcareConfig(deps.env);
    const { version, vintages } = await healthcareVintages(
      loader,
      cfg?.version ?? DEFAULT_HEALTHCARE_VERSION,
    );
    if (!loader) {
      return {
        envelope: envelope(
          {
            dataset: HEALTHCARE_DATASET, datasetVersion: version,
            grainKey: `query:${query}`, sourceVintages: vintages,
            caveats: ["SUPPRESSED_ROWS_ABSENT"], truncated: false,
          },
          "search_medicaid_providers",
        ),
        data: { state: "dataset_not_published", mode: null, results: [], total: 0 },
      };
    }
    const result = await searchProviders(query, { page: 1, pageSize: SEARCH_CAP }, loader);
    return {
      envelope: envelope(
        {
          dataset: HEALTHCARE_DATASET, datasetVersion: version,
          grainKey: `query:${query}`, sourceVintages: vintages,
          caveats: ["SUPPRESSED_ROWS_ABSENT", "PATIENTS_REPORTED_NOT_UNIQUE", "EXTRACT_DATED"],
          truncated: result.total > result.results.length,
        },
        "search_medicaid_providers",
      ),
      data: {
        state: result.error ?? "ok",
        mode: result.mode,
        results: result.results,
        total: result.total,
        returned: result.results.length,
      },
    };
  },
};

const getMedicaidProviderProfile: ToolDefinition = {
  name: "get_medicaid_provider_profile",
  description:
    "Read one Medicaid provider's full published profile by NPI: NPPES identity (NBER-mirror vintage), billing and servicing role blocks in both monetary treatments, monthly series, HCPCS breakdown (top 25 with total), and the LEIE screening rows. Absent measures stay null.",
  parameters: NPI_SCHEMA,
  availableWhen: (env) => healthcareConfig(env) !== null,
  unavailableReason: "medicaid artifact root not configured (FRAUD_RADAR_ARTIFACT_ROOT)",
  async execute(rawArgs, deps) {
    const args = reqRecord(rawArgs);
    rejectUnknownKeys(args, ["npi"]);
    const npi = reqNpi(args);
    const loader = hcLoader(deps);
    const cfg = healthcareConfig(deps.env);
    const { version, vintages } = await healthcareVintages(
      loader,
      cfg?.version ?? DEFAULT_HEALTHCARE_VERSION,
    );
    const grainKey = `NPI:${npi}`;
    const caveats = [
      "SUPPRESSED_ROWS_ABSENT",
      "PATIENTS_REPORTED_NOT_UNIQUE",
      "EXTRACT_DATED",
      "NPPES_NBER_MIRROR",
    ];
    if (!loader) {
      return {
        envelope: envelope(
          { dataset: HEALTHCARE_DATASET, datasetVersion: version, grainKey, sourceVintages: vintages, caveats, truncated: false },
          "get_medicaid_provider_profile",
        ),
        data: { state: "dataset_not_published", found: false, npi },
      };
    }
    const profile = await getProviderProfile(npi, loader);
    if (!profile) {
      return {
        envelope: envelope(
          { dataset: HEALTHCARE_DATASET, datasetVersion: version, grainKey, sourceVintages: vintages, caveats, truncated: false },
          "get_medicaid_provider_profile",
        ),
        data: { state: "not_in_published_data", found: false, npi },
      };
    }
    const hcpcs = capList(profile.hcpcs);
    const leie = capList(profile.leie);
    return {
      envelope: envelope(
        {
          dataset: HEALTHCARE_DATASET, datasetVersion: version, grainKey,
          sourceVintages: vintages, caveats,
          truncated: hcpcs.truncated || leie.truncated,
        },
        "get_medicaid_provider_profile",
      ),
      data: {
        state: "ok",
        found: true,
        npi: profile.npi,
        stub: profile.stub,
        summary: profile.summary,
        identity: profile.identity,
        hcpcs: hcpcs.items,
        hcpcsTotal: hcpcs.total,
        leie: leie.items,
        leieTotal: leie.total,
        monthly: profile.monthly,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Care (Medicare) — tools 2 + 6.
// ---------------------------------------------------------------------------

async function careVintages(
  loader: CareLoader | null,
  fallbackVersion: string,
): Promise<{ version: string; vintages: SourceVintage[] }> {
  const meta = await getCareDatasetMeta(loader);
  const version = meta?.version ?? fallbackVersion;
  return {
    version,
    vintages: [
      { source: "cms-medicare", version },
      { source: "leie", version: seedVersion("leie") ?? "unknown" },
    ],
  };
}

const CARE_CAVEATS = [
  "DERIVED_DOLLARS",
  "SUPPRESSED_ROWS_ABSENT",
  "PATIENTS_REPORTED_NOT_UNIQUE",
  "EXTRACT_DATED",
];

const searchMedicareProviders: ToolDefinition = {
  name: "search_medicare_providers",
  description:
    "Search Medicare fee-for-service (Part B) providers by NPI prefix (at least 3 digits) or by name. Returns up to 10 provider stubs in the data layer's own ranking, with the total count. Every payment figure is derived (services × published average) and labelled derived.",
  parameters: QUERY_SCHEMA,
  availableWhen: (env) => careConfig(env) !== null,
  unavailableReason: "care artifact root not configured (FRAUD_RADAR_CARE_ARTIFACT_ROOT)",
  async execute(rawArgs, deps) {
    const args = reqRecord(rawArgs);
    rejectUnknownKeys(args, ["query"]);
    const query = reqQuery(args);
    const loader = careLoader(deps);
    const cfg = careConfig(deps.env);
    const { version, vintages } = await careVintages(loader, cfg?.version ?? DEFAULT_CARE_VERSION);
    if (!loader) {
      return {
        envelope: envelope(
          { dataset: CARE_DATASET, datasetVersion: version, grainKey: `query:${query}`, sourceVintages: vintages, caveats: CARE_CAVEATS, truncated: false },
          "search_medicare_providers",
        ),
        data: { state: "dataset_not_published", mode: null, results: [], total: 0 },
      };
    }
    const result = await searchCareProviders(query, { page: 1, pageSize: SEARCH_CAP }, loader);
    return {
      envelope: envelope(
        {
          dataset: CARE_DATASET, datasetVersion: version, grainKey: `query:${query}`,
          sourceVintages: vintages, caveats: CARE_CAVEATS,
          truncated: result.total > result.results.length,
        },
        "search_medicare_providers",
      ),
      data: {
        state: result.error ?? "ok",
        mode: result.mode,
        results: result.results,
        total: result.total,
        returned: result.results.length,
      },
    };
  },
};

const getMedicareProviderProfile: ToolDefinition = {
  name: "get_medicare_provider_profile",
  description:
    "Read one Medicare provider's published profile by NPI: per-year blocks CY2022–2024 with derived amounts labelled derived, HCPCS rows (top 25 with total), identity, and the LEIE screening block with its timing caveat. Absent measures stay null.",
  parameters: NPI_SCHEMA,
  availableWhen: (env) => careConfig(env) !== null,
  unavailableReason: "care artifact root not configured (FRAUD_RADAR_CARE_ARTIFACT_ROOT)",
  async execute(rawArgs, deps) {
    const args = reqRecord(rawArgs);
    rejectUnknownKeys(args, ["npi"]);
    const npi = reqNpi(args);
    const loader = careLoader(deps);
    const cfg = careConfig(deps.env);
    const { version, vintages } = await careVintages(loader, cfg?.version ?? DEFAULT_CARE_VERSION);
    const grainKey = `NPI:${npi}`;
    if (!loader) {
      return {
        envelope: envelope(
          { dataset: CARE_DATASET, datasetVersion: version, grainKey, sourceVintages: vintages, caveats: CARE_CAVEATS, truncated: false },
          "get_medicare_provider_profile",
        ),
        data: { state: "dataset_not_published", found: false, npi },
      };
    }
    const profile = await getCareProviderProfile(npi, loader);
    if (!profile) {
      return {
        envelope: envelope(
          { dataset: CARE_DATASET, datasetVersion: version, grainKey, sourceVintages: vintages, caveats: CARE_CAVEATS, truncated: false },
          "get_medicare_provider_profile",
        ),
        data: { state: "not_in_published_data", found: false, npi },
      };
    }
    const hcpcs = capList(profile.hcpcs);
    return {
      envelope: envelope(
        {
          dataset: CARE_DATASET, datasetVersion: version, grainKey,
          sourceVintages: vintages, caveats: CARE_CAVEATS, truncated: hcpcs.truncated,
        },
        "get_medicare_provider_profile",
      ),
      data: {
        state: "ok",
        found: true,
        npi: profile.npi,
        stub: profile.stub,
        identity: profile.identity,
        years: profile.years,
        hcpcs: hcpcs.items,
        hcpcsTotal: hcpcs.total,
        leie: profile.leie,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Grants — tools 3 + 7.
// ---------------------------------------------------------------------------

async function grantsVintages(
  loader: GrantsLoader | null,
  fallbackVersion: string,
  fallbackFacVersion: string,
): Promise<{ version: string; facVersion: string; vintages: SourceVintage[] }> {
  const meta = await getGrantsDatasetMeta(loader);
  const version = meta?.version ?? fallbackVersion;
  const facVersion = meta?.facVersion ?? fallbackFacVersion;
  return {
    version,
    facVersion,
    vintages: [
      { source: "usaspending", version },
      {
        source: "sam-entities",
        version: SAM_ENTITIES_EXTRACT_VERSION,
        extractDate: SAM_ENTITIES_EXTRACT_DATE,
      },
      {
        source: "sam-exclusions",
        version: SAM_EXCLUSIONS_EXTRACT_VERSION,
        extractDate: SAM_EXCLUSIONS_EXTRACT_DATE,
      },
      { source: "fac", version: facVersion },
      { source: "leie", version: seedVersion("leie") ?? "unknown" },
    ],
  };
}

const GRANTS_CAVEATS = [
  "CUMULATIVE_AMOUNTS",
  "EXTRACT_DATED",
  "SUBAWARD_REPORTING_INCOMPLETE",
];

const searchGrantRecipientsTool: ToolDefinition = {
  name: "search_grant_recipients",
  description:
    "Search federal grant recipients by UEI, EIN-shaped key, or name. Returns up to 10 recipient stubs in the data layer's own ranking, with the total count. Amounts are award-cumulative snapshot totals, never fiscal-year obligations or outlays.",
  parameters: QUERY_SCHEMA,
  availableWhen: (env) => grantsConfig(env) !== null,
  unavailableReason: "grants artifact root not configured (FRAUD_RADAR_GRANTS_ARTIFACT_ROOT)",
  async execute(rawArgs, deps) {
    const args = reqRecord(rawArgs);
    rejectUnknownKeys(args, ["query"]);
    const query = reqQuery(args);
    const loader = grantsLoader(deps);
    const cfg = grantsConfig(deps.env);
    const { version, vintages } = await grantsVintages(
      loader,
      cfg?.version ?? DEFAULT_GRANTS_VERSION,
      cfg?.facVersion ?? DEFAULT_FAC_VERSION,
    );
    if (!loader) {
      return {
        envelope: envelope(
          { dataset: GRANTS_DATASET, datasetVersion: version, grainKey: `query:${query}`, sourceVintages: vintages, caveats: GRANTS_CAVEATS, truncated: false },
          "search_grant_recipients",
        ),
        data: { state: "dataset_not_published", mode: null, results: [], total: 0 },
      };
    }
    const result = await searchGrantRecipients(query, { page: 1, pageSize: SEARCH_CAP }, loader);
    return {
      envelope: envelope(
        {
          dataset: GRANTS_DATASET, datasetVersion: version, grainKey: `query:${query}`,
          sourceVintages: vintages, caveats: GRANTS_CAVEATS,
          truncated: result.total > result.results.length,
        },
        "search_grant_recipients",
      ),
      data: {
        state: result.error ?? "ok",
        mode: result.mode,
        results: result.results,
        total: result.total,
        returned: result.results.length,
      },
    };
  },
};

const getGrantRecipientProfileTool: ToolDefinition = {
  name: "get_grant_recipient_profile",
  description:
    "Read one grant recipient's published profile by UEI: identity (SAM registration facts carry their extract dates), award-cumulative totals, ALN mix (top 25 with total), top awards, the FAC single-audit block (null coverage preserved — no block means no public record in the vintage, never zero findings), SAM exclusion and LEIE candidate screening blocks, and subawards given and received.",
  parameters: UEI_SCHEMA,
  availableWhen: (env) => grantsConfig(env) !== null,
  unavailableReason: "grants artifact root not configured (FRAUD_RADAR_GRANTS_ARTIFACT_ROOT)",
  async execute(rawArgs, deps) {
    const args = reqRecord(rawArgs);
    rejectUnknownKeys(args, ["uei"]);
    const uei = reqUei(args);
    const loader = grantsLoader(deps);
    const cfg = grantsConfig(deps.env);
    const { version, vintages } = await grantsVintages(
      loader,
      cfg?.version ?? DEFAULT_GRANTS_VERSION,
      cfg?.facVersion ?? DEFAULT_FAC_VERSION,
    );
    const grainKey = `UEI:${uei}`;
    if (!loader) {
      return {
        envelope: envelope(
          { dataset: GRANTS_DATASET, datasetVersion: version, grainKey, sourceVintages: vintages, caveats: GRANTS_CAVEATS, truncated: false },
          "get_grant_recipient_profile",
        ),
        data: { state: "dataset_not_published", found: false, uei },
      };
    }
    const profile = await getGrantRecipientProfile(uei, loader);
    if (!profile) {
      return {
        envelope: envelope(
          { dataset: GRANTS_DATASET, datasetVersion: version, grainKey, sourceVintages: vintages, caveats: GRANTS_CAVEATS, truncated: false },
          "get_grant_recipient_profile",
        ),
        data: { state: "not_in_published_data", found: false, uei },
      };
    }
    const alnMix = capList(profile.alnMix);
    const topAwards = capList(profile.topAwards);
    return {
      envelope: envelope(
        {
          dataset: GRANTS_DATASET, datasetVersion: version, grainKey,
          sourceVintages: vintages, caveats: GRANTS_CAVEATS,
          truncated: alnMix.truncated || topAwards.truncated,
        },
        "get_grant_recipient_profile",
      ),
      data: {
        state: "ok",
        found: true,
        uei: profile.uei,
        stub: profile.stub,
        identity: profile.identity,
        totals: profile.totals,
        alnMix: alnMix.items,
        alnMixTotal: alnMix.total,
        topAwards: topAwards.items,
        topAwardsTotal: topAwards.total,
        fac: profile.fac,
        screening: profile.screening,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Signals — tool 10. Adapter over Phase 6 Payload A's entity read.
// The predicate is the signals artifact config check (§2.5).
// ---------------------------------------------------------------------------

const CANDIDATE_RECORD_CODE = "S-06";

function stripCandidatePairs(signals: EntitySignals): EntitySignals {
  // Defense in depth: getEntitySignals already confines S-06 to
  // the admin queue artifact; the adapter re-filters so a
  // candidate pair cannot reach an investigator answer through
  // this tool even if the layer beneath ever changed.
  const keep = (rows: EntitySignals["leads"]) =>
    rows.filter((row) => row.code !== CANDIDATE_RECORD_CODE);
  return {
    ...signals,
    leads: keep(signals.leads),
    screeningRecords: keep(signals.screeningRecords),
  };
}

const getEntitySignalsTool: ToolDefinition = {
  name: "get_entity_signals",
  description:
    "Read an entity's published Phase 6 research signals by NPI or UEI: rule leads each with the complete provenance block (rule code, rule-library version, peer definition and n, measure, peer median, caveats, input versions), and class-S screening records in their own sub-block, never merged with leads. Candidate pairs (S-06) are structurally excluded — they are an admin-review queue, not a tool result. Leads are research leads only: a reason to look closer, never a finding about the entity.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["entityKey"],
    properties: { entityKey: { type: "string", minLength: 9, maxLength: 12 } },
  },
  availableWhen: (env) => signalsConfig(env) !== null,
  unavailableReason: "signals artifact root not configured (FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT)",
  async execute(rawArgs, deps) {
    const args = reqRecord(rawArgs);
    rejectUnknownKeys(args, ["entityKey"]);
    const rawKey = reqString(args, "entityKey").toUpperCase();
    let keyType: "NPI" | "UEI";
    let engines: SignalsEngine[];
    if (isValidNpi(rawKey)) {
      keyType = "NPI";
      engines = ["healthcare", "care"];
    } else if (isValidUei(rawKey)) {
      keyType = "UEI";
      engines = ["grants", "cross"];
    } else {
      invalid("entityKey must be a valid NPI (10 digits) or UEI (12 characters)");
    }
    const loader = signalsLoader(deps);
    const cfg = signalsConfig(deps.env);
    const meta = await getSignalsDatasetMeta(loader);
    const version = meta?.version ?? cfg?.version ?? DEFAULT_SIGNALS_VERSION;
    const grainKey = `${keyType}:${rawKey}`;
    const vintages: SourceVintage[] = [
      { source: "research-signals", version },
      {
        source: "rule-library",
        version: meta?.ruleLibraryVersion ?? DEFAULT_RULE_LIBRARY_VERSION,
      },
    ];
    if (!loader) {
      return {
        envelope: envelope(
          { dataset: SIGNALS_DATASET, datasetVersion: version, grainKey, sourceVintages: vintages, caveats: [], truncated: false },
          "get_entity_signals",
        ),
        data: { state: "dataset_not_published", entityKey: rawKey, keyType, engines: {} },
      };
    }
    const byEngine: Record<string, unknown> = {};
    const caveatSet = new Set<string>();
    let provenanceComplete = true;
    for (const engine of engines) {
      const signals = await getEntitySignals(engine, rawKey, loader);
      if (!signals) {
        byEngine[engine] = { state: "not_in_published_signals", entityKey: rawKey };
        continue;
      }
      const clean = stripCandidatePairs(signals);
      for (const row of [...clean.leads, ...clean.screeningRecords]) {
        for (const code of row.caveatCodes) caveatSet.add(code);
        if (!signalLeadProvenanceComplete(row)) provenanceComplete = false;
      }
      byEngine[engine] = clean;
    }
    return {
      envelope: envelope(
        {
          dataset: SIGNALS_DATASET, datasetVersion: version, grainKey,
          sourceVintages: vintages, caveats: [...caveatSet], truncated: false,
        },
        "get_entity_signals",
      ),
      data: {
        state: "ok",
        entityKey: rawKey,
        keyType,
        engines: byEngine,
        provenanceComplete,
        candidatePairsExcluded: true,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Aggregates — tool 11. One tool, server-side grain dispatch over
// the Neon summary grains via the fail-soft *-neon.ts modules.
// Contracts grains are NOT in the enum (gated on Phase 5 A).
// ---------------------------------------------------------------------------

export const AGGREGATE_GRAINS = [
  "hcpcs",
  "monthly-national",
  "medicare-hcpcs",
  "medicare-yearly",
  "hospice-directory",
  "home-health-directory",
  "grants-aln",
  "grants-agency",
  "grants-yearly",
  "fac-yearly",
] as const;
export type AggregateGrain = (typeof AGGREGATE_GRAINS)[number];

const GRAIN_SORTS: Record<AggregateGrain, readonly string[] | null> = {
  hcpcs: ["paid", "lines", "providers", "code"],
  "monthly-national": null,
  "medicare-hcpcs": ["pymt", "services", "providers", "code"],
  "medicare-yearly": null,
  "hospice-directory": null,
  "home-health-directory": null,
  "grants-aln": ["obligated", "awards", "recipients", "aln"],
  "grants-agency": ["obligated", "awards", "recipients", "agency"],
  "grants-yearly": null,
  "fac-yearly": null,
};

const lookupAggregates: ToolDefinition = {
  name: "lookup_aggregates",
  description:
    "Look up published aggregate rows from the Neon summary grains: Medicaid HCPCS summaries and monthly national totals, Medicare HCPCS and yearly totals, hospice and home-health directory listings, grants ALN / agency / yearly rows, and FAC yearly rows. One grain per call; rows carry their dataset version in the citation envelope. Directory rows are keyed by CCN. Returns an honest not-available state when the grain is not loaded.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["grain"],
    properties: {
      grain: { type: "string", enum: [...AGGREGATE_GRAINS] },
      key: { type: "string", maxLength: 120 },
      year: { type: "integer", minimum: 1900, maximum: 2100 },
      sort: { type: "string", maxLength: 20 },
      limit: { type: "integer", minimum: 1, maximum: 25 },
    },
  },
  // The Neon readers are fail-soft (a null state, never a throw)
  // and need no artifact root, so the tool is always registered;
  // unavailable grains answer with their not-available state.
  availableWhen: () => true,
  unavailableReason: null,
  async execute(rawArgs, deps) {
    void deps;
    const args = reqRecord(rawArgs);
    rejectUnknownKeys(args, ["grain", "key", "year", "sort", "limit"]);
    const grainRaw = reqString(args, "grain");
    if (!(AGGREGATE_GRAINS as readonly string[]).includes(grainRaw)) {
      invalid(`grain must be one of: ${AGGREGATE_GRAINS.join(", ")}`);
    }
    const grain = grainRaw as AggregateGrain;
    const key = optString(args, "key");
    let year: number | null = null;
    if (args.year !== undefined && args.year !== null) {
      if (typeof args.year !== "number" || !Number.isInteger(args.year) || args.year < 1900 || args.year > 2100) {
        invalid("year must be an integer between 1900 and 2100");
      }
      year = args.year;
    }
    let limit = 10;
    if (args.limit !== undefined && args.limit !== null) {
      if (typeof args.limit !== "number" || !Number.isInteger(args.limit)) {
        invalid("limit must be an integer");
      }
      limit = Math.min(25, Math.max(1, args.limit));
    }
    const allowedSorts = GRAIN_SORTS[grain];
    let sort: string | undefined;
    if (args.sort !== undefined && args.sort !== null) {
      if (typeof args.sort !== "string" || !allowedSorts?.includes(args.sort)) {
        invalid(`sort is not valid for grain ${grain}`);
      }
      sort = args.sort;
    }
    if (grain === "hcpcs" && key !== null && !isValidHcpcs(key)) {
      invalid("key for grain hcpcs must be a 5-character HCPCS code");
    }
    if (grain === "grants-aln" && key !== null && !isValidAln(key)) {
      invalid("key for grain grants-aln must be an ALN (NN.NNN)");
    }

    let dataset = GRANTS_DATASET;
    let datasetVersion: string = DEFAULT_GRANTS_VERSION;
    let caveats: string[] = [...GRANTS_CAVEATS];
    let grainKey = `grain:${grain}`;
    let data: Record<string, unknown>;

    const listState = (rows: unknown, total?: number) =>
      rows === null
        ? { grain, state: "not_available", rows: null, total: null }
        : {
            grain,
            state: "ok",
            rows,
            total: total ?? (Array.isArray(rows) ? rows.length : null),
          };

    switch (grain) {
      case "hcpcs": {
        dataset = HEALTHCARE_DATASET;
        datasetVersion = DEFAULT_HEALTHCARE_VERSION;
        caveats = ["SUPPRESSED_ROWS_ABSENT", "PATIENTS_REPORTED_NOT_UNIQUE"];
        if (key) {
          grainKey = `code:${key.toUpperCase()}`;
          const row = await getHcpcsSummary(key);
          data = row === null
            ? { grain, state: "not_available", row: null }
            : { grain, state: "ok", row };
        } else {
          const res = await listHcpcsSummaries({
            sort: sort as "paid" | "lines" | "providers" | "code" | undefined,
            page: 1,
            pageSize: limit,
          });
          data = res === null ? listState(null) : listState(res.rows, res.total);
        }
        break;
      }
      case "monthly-national": {
        dataset = HEALTHCARE_DATASET;
        datasetVersion = DEFAULT_HEALTHCARE_VERSION;
        caveats = ["SUPPRESSED_ROWS_ABSENT", "PATIENTS_REPORTED_NOT_UNIQUE"];
        data = listState(await listMonthlyNational());
        break;
      }
      case "medicare-hcpcs": {
        dataset = CARE_DATASET;
        datasetVersion = DEFAULT_CARE_VERSION;
        caveats = ["DERIVED_DOLLARS", "SUPPRESSED_ROWS_ABSENT", "PATIENTS_REPORTED_NOT_UNIQUE"];
        const res = await listMedicareHcpcs({
          q: key ?? undefined,
          year: year ?? undefined,
          sort: sort as "pymt" | "services" | "providers" | "code" | undefined,
          page: 1,
          pageSize: limit,
        });
        if (key) grainKey = `code:${key.toUpperCase()}`;
        data = res === null ? listState(null) : listState(res.rows, res.total);
        break;
      }
      case "medicare-yearly": {
        dataset = CARE_DATASET;
        datasetVersion = DEFAULT_CARE_VERSION;
        caveats = ["DERIVED_DOLLARS", "SUPPRESSED_ROWS_ABSENT", "PATIENTS_REPORTED_NOT_UNIQUE"];
        data = listState(await listMedicareYearly());
        break;
      }
      case "hospice-directory": {
        dataset = CARE_DATASET;
        datasetVersion = CARE_COMPARE_VERSION;
        caveats = [];
        const res = await listHospiceProviders({ q: key ?? undefined, page: 1, pageSize: limit });
        data = res === null ? listState(null) : listState(res.rows, res.total);
        break;
      }
      case "home-health-directory": {
        dataset = CARE_DATASET;
        datasetVersion = CARE_COMPARE_VERSION;
        caveats = [];
        const res = await listHomeHealthAgencies({ q: key ?? undefined, page: 1, pageSize: limit });
        data = res === null ? listState(null) : listState(res.rows, res.total);
        break;
      }
      case "grants-aln": {
        if (key && year !== null) {
          grainKey = `ALN:${key}`;
          const row = await getGrantsAlnSummary(key, year);
          data = row === null
            ? { grain, state: "not_available", row: null }
            : { grain, state: "ok", row };
        } else {
          const res = await listGrantsAln({
            q: key ?? undefined,
            fiscalYear: year ?? undefined,
            sort: sort as "obligated" | "awards" | "recipients" | "aln" | undefined,
            page: 1,
            pageSize: limit,
          });
          data = res === null ? listState(null) : listState(res.rows, res.total);
        }
        break;
      }
      case "grants-agency": {
        const res = await listGrantsAgency({
          q: key ?? undefined,
          fiscalYear: year ?? undefined,
          sort: sort as "obligated" | "awards" | "recipients" | "agency" | undefined,
          page: 1,
          pageSize: limit,
        });
        if (key) grainKey = `agency:${key}`;
        data = res === null ? listState(null) : listState(res.rows, res.total);
        break;
      }
      case "grants-yearly": {
        data = listState(await listGrantsYearly());
        break;
      }
      case "fac-yearly": {
        dataset = "fac";
        datasetVersion = DEFAULT_FAC_VERSION;
        caveats = ["PERIODS_MAY_DIFFER"];
        data = listState(await listFacYearly());
        break;
      }
    }

    const truncated =
      data.state === "ok" &&
      typeof data.total === "number" &&
      Array.isArray(data.rows) &&
      data.total > data.rows.length;
    return {
      envelope: envelope(
        {
          dataset, datasetVersion, grainKey,
          sourceVintages: [{ source: dataset, version: datasetVersion }],
          caveats, truncated,
        },
        "lookup_aggregates",
      ),
      data,
    };
  },
};

// ---------------------------------------------------------------------------
// FAC auditee — tool 12. Flags only: FAC carries no questioned-
// cost dollar column (Phase 4 D1 evidence), so the returned
// shape has no questioned-cost amount field at all — the marker
// below is a string state, never a number, so no amount can be
// cited from this tool.
// ---------------------------------------------------------------------------

const getFacAuditee: ToolDefinition = {
  name: "get_fac_auditee",
  description:
    "Read the FAC single-audit record for an auditee by UEI or EIN: audit count, findings count, repeat-finding and questioned-cost FLAG counts, and audit years, as published. Questioned costs are flags only — the source publishes no questioned-cost amounts and none are inferred. No FAC block means no public single-audit record in the published vintage (usually below the expenditure threshold or not yet submitted): a labelled absence, never zero findings.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["ueiOrEin"],
    properties: { ueiOrEin: { type: "string", minLength: 9, maxLength: 12 } },
  },
  availableWhen: (env) => grantsConfig(env) !== null,
  unavailableReason: "grants artifact root not configured (FRAUD_RADAR_GRANTS_ARTIFACT_ROOT)",
  async execute(rawArgs, deps) {
    const args = reqRecord(rawArgs);
    rejectUnknownKeys(args, ["ueiOrEin"]);
    const raw = reqString(args, "ueiOrEin").toUpperCase().replace(/[-\s]/g, "");
    if (!isValidUei(raw) && !isValidEin(raw)) {
      invalid("ueiOrEin must be a valid UEI (12 characters) or EIN (9 digits)");
    }
    const cfg = grantsConfig(deps.env);
    const facVersion = cfg?.facVersion ?? DEFAULT_FAC_VERSION;
    const yearly = await listFacYearly(facVersion);
    const base = {
      questionedCostAmounts: "not_published_by_source",
      flagsOnly: true,
      yearlyContext: yearly,
    };
    if (isValidUei(raw)) {
      const loader = grantsLoader(deps);
      const profile = loader ? await getGrantRecipientProfile(raw, loader) : null;
      return {
        envelope: envelope(
          {
            dataset: "fac", datasetVersion: facVersion, grainKey: `UEI:${raw}`,
            sourceVintages: [
              { source: "fac", version: facVersion },
              { source: "usaspending", version: cfg?.version ?? DEFAULT_GRANTS_VERSION },
            ],
            caveats: ["PERIODS_MAY_DIFFER"], truncated: false,
          },
          "get_fac_auditee",
        ),
        data: {
          state: "ok",
          keyType: "UEI",
          uei: raw,
          fac: profile?.fac ?? null,
          coverage:
            profile === null
              ? "recipient_not_in_published_data"
              : profile.fac === null
                ? "no_public_fac_record_in_published_vintage"
                : "published",
          ...base,
        },
      };
    }
    if (isValidEin(raw)) {
      // The app layer publishes auditee detail at the recipient
      // (UEI) grain via the grants profile FAC block; no EIN-grain
      // auditee reader exists in the data layer, so the EIN path
      // returns the yearly context plus the labelled state —
      // never an inferred bridge between the two keys.
      return {
        envelope: envelope(
          {
            dataset: "fac", datasetVersion: facVersion, grainKey: `EIN:${raw}`,
            sourceVintages: [{ source: "fac", version: facVersion }],
            caveats: ["PERIODS_MAY_DIFFER"], truncated: false,
          },
          "get_fac_auditee",
        ),
        data: {
          state: "auditee_grain_detail_not_in_app_layer",
          keyType: "EIN",
          ein: raw,
          fac: null,
          coverage: "auditee_grain_detail_not_in_app_layer",
          ...base,
        },
      };
    }
    // Unreachable: the shape check above already rejected
    // anything that is neither a UEI nor an EIN.
    return invalid("ueiOrEin must be a valid UEI (12 characters) or EIN (9 digits)");
  },
};

// ---------------------------------------------------------------------------
// Source registry — tool 13. The registry of record (sources.ts
// seed) plus live status from the admin read model.
// ---------------------------------------------------------------------------

const getSourceRegistry: ToolDefinition = {
  name: "get_source_registry",
  description:
    "Read the Fraud Radar source registry: per source, its slug, name, status, source version, coverage, cadence, limitations, and last verified date — and for SAM/LEIE, the extract version and date. Omit the slug for all sources. This is the registry and source-vintage fetch behind every freshness or provenance answer.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: { slug: { type: "string", maxLength: 60 } },
  },
  availableWhen: () => true,
  unavailableReason: null,
  async execute(rawArgs, deps) {
    const args = reqRecord(rawArgs);
    rejectUnknownKeys(args, ["slug"]);
    const slug = optString(args, "slug");
    if (slug !== null && !FRAUD_RADAR_SOURCES.some((s) => s.slug === slug)) {
      invalid(`unknown source slug: ${slug}`);
    }
    const health = await (deps.registryHealth ?? getRegistryHealth)();
    const liveBySlug = new Map(health.sources.map((s) => [s.slug, s]));
    const seeds = slug
      ? FRAUD_RADAR_SOURCES.filter((s) => s.slug === slug)
      : FRAUD_RADAR_SOURCES;
    const rows = seeds.map((seed) => {
      const live = liveBySlug.get(seed.slug);
      const extract =
        seed.slug === "sam-entities"
          ? { version: SAM_ENTITIES_EXTRACT_VERSION, extractDate: SAM_ENTITIES_EXTRACT_DATE }
          : seed.slug === "sam-exclusions"
            ? { version: SAM_EXCLUSIONS_EXTRACT_VERSION, extractDate: SAM_EXCLUSIONS_EXTRACT_DATE }
            : seed.slug === "leie"
              ? { version: seedVersion("leie") ?? "unknown", extractDate: null }
              : null;
      return {
        slug: seed.slug,
        name: seed.name,
        engine: seed.engine,
        status: live?.status ?? seed.status,
        sourceVersion: live?.sourceVersion ?? seed.sourceVersion ?? null,
        coverage:
          seed.coverageStart === null && seed.coverageEnd === null
            ? null
            : `${seed.coverageStart ?? "…"} to ${seed.coverageEnd ?? "current"}`,
        cadence: seed.cadence,
        limitations: seed.limitations,
        lastVerified:
          live?.lastVerifiedAt?.toISOString().slice(0, 10) ?? seed.lastVerifiedAt ?? null,
        extract,
      };
    });
    const verifiedDates = rows
      .map((r) => r.lastVerified)
      .filter((d): d is string => d !== null)
      .sort();
    const datasetVersion = verifiedDates[verifiedDates.length - 1] ?? "seed";
    return {
      envelope: envelope(
        {
          dataset: "source-registry",
          datasetVersion,
          grainKey: slug ? `slug:${slug}` : "slug:all",
          sourceVintages: rows
            .filter((r) => r.sourceVersion !== null)
            .map((r) => ({ source: r.slug, version: r.sourceVersion as string })),
          caveats: ["EXTRACT_DATED"],
          truncated: false,
        },
        "get_source_registry",
      ),
      data: {
        state: "ok",
        registryAvailable: health.available,
        recentRunCount: health.recentRuns.length,
        sources: rows,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Contracts — tools 4, 8, 9: GATED (§2.5). Phase 5 Payload A's
// contracts-data.ts has not landed, so no adapter can exist;
// the predicates are false in every environment and the tools
// are never offered. Registered (with their schemas and
// reasons) so the registry is the complete §2.2 inventory and
// the predicate report can name the gate.
// ---------------------------------------------------------------------------

const CONTRACTS_GATE_REASON =
  "phase5_payload_a_not_landed: contracts-data.ts does not exist in the app tree, so no adapter can wrap it (§2.1: if a function doesn't exist, the tool doesn't exist)";

function gatedContractsTool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
): ToolDefinition {
  return {
    name,
    description,
    parameters,
    availableWhen: () => false,
    unavailableReason: CONTRACTS_GATE_REASON,
    async execute() {
      throw new ToolError(
        "tool_unavailable",
        `${name} is not available: ${CONTRACTS_GATE_REASON}`,
      );
    },
  };
}

const searchContractVendors = gatedContractsTool(
  "search_contract_vendors",
  "Search federal contract vendors by UEI or name. GATED: not offered until the Phase 5 contracts data layer lands.",
  QUERY_SCHEMA,
);

const getContractVendorProfile = gatedContractsTool(
  "get_contract_vendor_profile",
  "Read one contract vendor's published profile by UEI. GATED: not offered until the Phase 5 contracts data layer lands.",
  UEI_SCHEMA,
);

const getContractAwardHistory = gatedContractsTool(
  "get_contract_award_history",
  "Read one contract award's snapshot and full modification timeline by award key. GATED: not offered until the Phase 5 contracts data layer lands.",
  {
    type: "object",
    additionalProperties: false,
    required: ["awardKey"],
    properties: { awardKey: { type: "string", minLength: 3, maxLength: 120 } },
  },
);

// ---------------------------------------------------------------------------
// The registry — the complete §2.2 inventory, in design order.
// ---------------------------------------------------------------------------

export const TOOL_REGISTRY: ToolDefinition[] = [
  searchMedicaidProviders,
  searchMedicareProviders,
  searchGrantRecipientsTool,
  searchContractVendors,
  getMedicaidProviderProfile,
  getMedicareProviderProfile,
  getGrantRecipientProfileTool,
  getContractVendorProfile,
  getContractAwardHistory,
  getEntitySignalsTool,
  lookupAggregates,
  getFacAuditee,
  getSourceRegistry,
];

export interface ToolPredicate {
  name: string;
  available: boolean;
  /** Set when unavailable: the predicate's reason. */
  reason: string | null;
}

/** The predicate report (tests + engine scope sentences): which
 *  tools are offered in this environment, and why the rest are
 *  not. */
export function toolPredicateReport(env: Env = process.env): ToolPredicate[] {
  return TOOL_REGISTRY.map((tool) => {
    const available = tool.availableWhen(env);
    return {
      name: tool.name,
      available,
      reason: available ? null : tool.unavailableReason,
    };
  });
}

/** The tools offered to the model in this environment. Gated
 *  tools are absent here — not offered at all (§2.5). */
export function availableTools(env: Env = process.env): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.availableWhen(env));
}

export function getToolDefinition(name: string): ToolDefinition | null {
  return TOOL_REGISTRY.find((tool) => tool.name === name) ?? null;
}

/**
 * Execute one tool call: resolve the definition, check its
 * predicate in this environment, validate its arguments
 * (inside the adapter, before any data read), and return the
 * enveloped result. Throws ToolError — unknown_tool,
 * tool_unavailable, or invalid_args — never a coerced guess.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  deps: ToolDeps = {},
): Promise<ToolResult> {
  const def = getToolDefinition(name);
  if (!def) throw new ToolError("unknown_tool", `unknown tool: ${name}`);
  const env = deps.env ?? process.env;
  if (!def.availableWhen(env)) {
    throw new ToolError(
      "tool_unavailable",
      `${name} is not available in this deployment: ${def.unavailableReason ?? "predicate not met"}`,
    );
  }
  return def.execute(args ?? {}, { ...deps, env });
}
