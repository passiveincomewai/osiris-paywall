/**
 * Fraud Radar Phase 5 — contracts app data layer.
 *
 * Covers the federal contracts slice published by the batch
 * pipeline as contracts-aggregates (USAspending Award Data
 * Archive generation 2026-10-06, procurement files FY2018–FY2025,
 * globally deduped to one row per contract award, with the full
 * published transaction/modification chain per award). The small
 * Neon grains (yearly / NAICS / PSC / agency) are read through
 * contracts-neon.ts. The app reads ONLY these versioned artifacts
 * + the Neon grain; it never touches the source bulk files or
 * Parquet.
 *
 * Artifact contract (publisher: app-publish/publish_contracts.py
 * in the Fraud Radar workspace — the contract of record):
 *   dataset.json        provenance + totals + measure statements
 *   idx/<bb>.json       vendor stubs by UEI (100-bucket md5 scheme)
 *   nam/<bb>.json       vendor stubs by normalized name (same)
 *   ven/<bb>.json       per-vendor detail buckets (identity,
 *                       totals, NAICS/PSC mix, top awards, SAM
 *                       registration block, screening block,
 *                       subcontracts given/received — NO FAC block)
 *   awd/<bbb>.json.gz   per-award detail buckets (1,000-bucket md5
 *                       scheme): winning snapshot + parent link +
 *                       FULL modification timeline. GZIP JSON —
 *                       the loader gunzips before parsing (the
 *                       decompressed bytes are exactly the plain-
 *                       JSON bucket form; see dataset.json
 *                       artifactEncoding in the published tree).
 *   top/naics/<code>.json, top/psc/<code>.json
 *                       top vendors per code (≤ 50)
 *   contracts-neon.json Neon loader input (fraud-radar-load-contracts)
 *
 * Honesty rules enforced by this layer:
 *  - USAspending amounts keep their source names and AWARD-
 *    CUMULATIVE semantics end-to-end: snapshot totals from the
 *    award's winning (latest-modified) transaction row, never
 *    fiscal-year obligations, never re-summed across the
 *    modification timeline, never summed across FY parts.
 *  - Ceilings are not obligations: base_and_all_options_value
 *    and potential_total_value_of_award travel under names ending
 *    in "Ceiling" and are never added to obligated amounts.
 *  - federal_action_obligation is TRANSACTION grain only; its
 *    per-award sum is published under exactly the name
 *    federalActionObligationSumInWindow — a derived in-window
 *    flow figure, never merged with snapshot totals.
 *  - NAICS/PSC/agency rows attribute each award to exactly one
 *    fiscal year — attributedFiscalYear, the archive fiscal year
 *    of the award's winning snapshot. The attribution assigns
 *    the award to a year; it does not change what amounts mean.
 *  - FAC does NOT cover contracts. No vendor or award record in
 *    this tree carries an FAC block, and none is rendered here.
 *    A vendor that is also a grant recipient has its FAC block
 *    on its grants profile (Phase 4), linked by UEI only.
 *  - Absence is null, never zero: a vendor with no SAM entities
 *    extract row carries a null/absent registration fact, never
 *    a fabricated status. A zero appears only where a complete
 *    published file was counted and found none (SAM-exclusion
 *    listings in the named extract, reported subawards).
 *  - Screening is research leads: SAM-exclusion listings (exact
 *    UEI) and LEIE name candidates (human review) are leads with
 *    their caveats, never findings, determinations, or matches.
 *  - SAM registration/exclusion facts carry their EXTRACT DATES
 *    with the data (entities extract 2026-10-05; exclusions
 *    extract 2026-301, dated 2026-10-28) and are never presented
 *    as live status. No SAM.gov API is used anywhere.
 *  - Parent linkage is published as adjudicated: the as-designed
 *    candidate formula (CONT_AWD_<parent_piid>_<parent_agency>)
 *    resolves 0 of 36,728,959 candidates (IDV parents publish
 *    under CONT_IDV_ keys); the normalised CONT_IDV_ figure
 *    (81.3834%) is a labelled diagnostic, never a join.
 */

import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

export const CONTRACTS_DATASET = "contracts-aggregates";
export const DEFAULT_CONTRACTS_VERSION = "2026-10-06";
export const SAM_ENTITIES_EXTRACT_VERSION = "2026-10-05";
export const SAM_EXCLUSIONS_EXTRACT_VERSION = "2026-301";

export const MEASURE_NOTE =
  "USAspending amounts are award-cumulative snapshot totals for the overall award, taken from each award's winning (latest-modified) snapshot row — not fiscal-year obligations, outlays, or expenditures, and never re-summed across an award's modification history. NAICS, PSC and agency rows use the attributed fiscal year — the archive fiscal year of each award's winning snapshot — so every award lands in exactly one year while its amounts stay award-cumulative.";

export const CEILINGS_NOTE =
  "Ceiling / potential values (base and all options value, potential total value of award) are the maximum amounts the source reports for an award vehicle — they are not obligations, and no figure on this page adds them to, or substitutes them for, obligated amounts. IDV vehicles typically carry ceiling values with little or no obligation.";

export const NO_FAC_NOTE =
  "The Federal Audit Clearinghouse (FAC) does not cover contracts: it records single audits of federal assistance expended, so no contracts surface carries FAC data. A vendor that is also a grant recipient has its FAC record on its grants profile, linked by UEI only — no FAC data is copied or joined here.";

export const SCREENING_NOTE =
  "Exclusion listings and name candidates are research leads for human review, never findings or determinations. SAM exclusion listings join on exact UEI against the SAM exclusions extract 2026-301 (2026-10-28); LEIE name candidates are normalized-name overlaps for human review, not identity matches. SAM registration facts carry the SAM entities extract date (2026-10-05) wherever they appear. No SAM.gov API is used — extracts only.";

export const PARENT_LINKAGE_NOTE =
  "Parent linkage is published as adjudicated. The as-designed candidate key (CONT_AWD_<parent PIID>_<parent agency>) resolves 0 of 36,728,959 candidates, because IDV parent vehicles publish under CONT_IDV_ keys — the as-designed value is labelled as published on each award. Substituting the CONT_IDV_ prefix would resolve 29,891,287 of 36,728,959 (81.3834%); that normalised figure is a labelled diagnostic only and is never applied as a join.";

// ---------------------------------------------------------------------------
// Artifact loading — same pattern as grants-data.ts. Root:
//   FRAUD_RADAR_CONTRACTS_ARTIFACT_ROOT  full prefix of the
//   versioned contracts artifact tree, e.g. https://<store>.
//   public.blob.vercel-storage.com/fraud-radar/contracts/
//   2026-10-06 or an absolute local path to that dir.
// Unconfigured => surfaces render an honest "not published yet".
// Award buckets are gzip JSON (.json.gz): both loader branches
// gunzip before parsing, so callers always receive plain JSON.
// ---------------------------------------------------------------------------

export interface ContractsConfig {
  root: string;
  version: string;
  isHttp: boolean;
}

export function contractsConfig(
  env: Record<string, string | undefined> = process.env,
): ContractsConfig | null {
  const root = env.FRAUD_RADAR_CONTRACTS_ARTIFACT_ROOT?.trim().replace(/\/+$/, "");
  if (!root) return null;
  return {
    root,
    version: env.FRAUD_RADAR_CONTRACTS_VERSION?.trim() || DEFAULT_CONTRACTS_VERSION,
    isHttp: /^https?:\/\//i.test(root),
  };
}

export type ContractsLoader = (relPath: string) => Promise<unknown | null>;

function parseArtifact(bytes: Buffer, relPath: string): unknown | null {
  try {
    const raw = relPath.endsWith(".gz") ? gunzipSync(bytes) : bytes;
    return JSON.parse(raw.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

export function createContractsLoader(config: ContractsConfig): ContractsLoader {
  if (config.isHttp) {
    return async (relPath) => {
      try {
        const res = await fetch(`${config.root}/${relPath}`, {
          cache: "force-cache",
        });
        if (!res.ok) return null;
        return parseArtifact(Buffer.from(await res.arrayBuffer()), relPath);
      } catch {
        return null;
      }
    };
  }
  return async (relPath) => {
    try {
      const { readFile } = await import("node:fs/promises");
      const path = await import("node:path");
      return parseArtifact(await readFile(path.join(config.root, relPath)), relPath);
    } catch {
      return null;
    }
  };
}

let defaultLoader: ContractsLoader | null = null;
export function getContractsLoader(): ContractsLoader | null {
  const config = contractsConfig();
  if (!config) return null;
  if (!defaultLoader) defaultLoader = createContractsLoader(config);
  return defaultLoader;
}

// ---------------------------------------------------------------------------
// Bucket keys (must match the publisher): md5 scheme —
//   bucket(key, m) = int(md5(key utf-8) hexdigest[:8], 16) % m,
// rendered zero-padded. Vendor families use % 100; awards % 1000.
// ---------------------------------------------------------------------------

export function contractsBucket(key: string, modulus: 100 | 1000): string {
  const hex = createHash("md5").update(key, "utf8").digest("hex");
  const n = parseInt(hex.slice(0, 8), 16) % modulus;
  return String(n).padStart(modulus === 1000 ? 3 : 2, "0");
}

export function normalizeNameKey(q: string): string {
  return q.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
}

// ---------------------------------------------------------------------------
// Vendor stubs (idx/ + nam/ wire: { v, stubs: [...] } — object
// records, nulls preserved).
// ---------------------------------------------------------------------------

export interface ContractsStub {
  uei: string;
  name: string | null;
  state: string | null;
  awards: number;
  /** Award-cumulative snapshot total across the vendor's awards. */
  totalDollarsObligated: number | null;
  nameKey?: string;
}

interface StubFile {
  v?: string;
  stubs?: ContractsStub[];
}

function decodeStubs(raw: StubFile | null): ContractsStub[] {
  if (!raw?.stubs) return [];
  return raw.stubs.map((s) => ({
    uei: String(s.uei),
    name: (s.name as string) ?? null,
    state: (s.state as string) ?? null,
    awards: (s.awards as number) ?? 0,
    totalDollarsObligated: (s.totalDollarsObligated as number) ?? null,
    ...(s.nameKey ? { nameKey: String(s.nameKey) } : {}),
  }));
}

/** Rank only — a null amount contributes nothing to the RANK; the
 *  displayed figure stays null regardless (grants precedent). */
export function contractsStubRank(s: ContractsStub): number {
  return s.totalDollarsObligated ?? 0;
}

// ---------------------------------------------------------------------------
// Vendor detail wire (ven/<bb>.json -> { v, vendors: { uei: rec } }).
// Records are published as named objects by the publisher; this
// layer types the blocks the surfaces render and passes nulls
// through exactly. There is NO FAC block in this wire — asserted
// by the publisher (0 fac keys) and never synthesised here.
// ---------------------------------------------------------------------------

export interface ContractsVendorIdentity {
  usaspendingName: string | null;
  usaspendingDbaName: string | null;
  samLegalBusinessName: string | null;
  samDbaName: string | null;
  city: string | null;
  state: string | null;
  cageCode: string | null;
  parentUei: string | null;
  parentName: string | null;
}

export interface ContractsVendorTotals {
  awards: number;
  idvCount: number | null;
  definitiveAndOrderCount: number | null;
  orderUnderIdvCount: number | null;
  distinctAwardingAgencies: number | null;
  distinctNaicsCodes: number | null;
  distinctPscCodes: number | null;
  totalDollarsObligated: number | null;
  totalOutlayedAmountForOverallAward: number | null;
  currentTotalValueOfAwardSum: number | null;
}

export interface ContractsCodeMixRow {
  awards: number | null;
  totalDollarsObligated: number | null;
  naics?: string;
  naicsDescription?: string | null;
  psc?: string;
  pscDescription?: string | null;
}

export interface ContractsTopAward {
  awardKey: string;
  piid: string | null;
  flag: string | null;
  awardingAgencyName: string | null;
  naics: string | null;
  psc: string | null;
  attributedFiscalYear: number | null;
  totalDollarsObligated: number | null;
  totalOutlayedAmountForOverallAward: number | null;
  transactionsInWindow: number | null;
}

export interface ContractsSamRegistration {
  registered: boolean;
  legalBusinessName: string | null;
  dbaName: string | null;
  extractVersion: string | null;
  extractDate: string | null;
  initialRegistrationDate: string | null;
  registrationExpirationDate: string | null;
  registrationActiveAsOfExtract: boolean | null;
  note: string | null;
}

export interface ContractsScreening {
  samExclusions: {
    listed: boolean;
    listingCount: number;
    earliestActiveDate: string | null;
    exclusionTypes: string | null;
    extractVersion: string | null;
    extractDate: string | null;
    caveat: string | null;
  } | null;
  leieNameCandidates: {
    candidateCount: number;
    candidateStatus: string | null;
    extractVersion: string | null;
    caveat: string | null;
  } | null;
}

export interface ContractsVendorProfile {
  uei: string;
  stub: ContractsStub | null;
  identity: ContractsVendorIdentity;
  totals: ContractsVendorTotals;
  fiscalYearSpan: {
    firstArchiveFiscalYear: number | null;
    lastArchiveFiscalYear: number | null;
  };
  modifications: {
    transactionsInWindow: number | null;
    modificationsInWindow: number | null;
    federalActionObligationSumInWindow: number | null;
  };
  naicsMix: ContractsCodeMixRow[];
  pscMix: ContractsCodeMixRow[];
  topAwards: ContractsTopAward[];
  samRegistration: ContractsSamRegistration | null;
  screening: ContractsScreening | null;
  subcontracts: {
    givenAsPrime: { count: number | null; amount: number | null } | null;
    receivedAsSubcontractor: { count: number | null; amount: number | null } | null;
    note: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Award detail wire (awd/<bbb>.json.gz -> { v, awards: { key: rec } }).
// The timeline is the FULL published modification chain, as
// reported, chronological — history rows are never re-summed.
// ---------------------------------------------------------------------------

export interface ContractsTimelineEntry {
  txnKey: string | null;
  modificationNumber: string | null;
  transactionNumber: string | null;
  actionDate: string | null;
  actionType: string | null;
  actionTypeCode: string | null;
  archiveFiscalYear: number | null;
  federalActionObligation: number | null;
  totalDollarsObligated: number | null;
  totalOutlayedAmountForOverallAward: number | null;
  currentTotalValueOfAward: number | null;
  baseAndExercisedOptionsValue: number | null;
  /** Ceiling — never an obligation. */
  baseAndAllOptionsValueCeiling: number | null;
  /** Ceiling — never an obligation. */
  potentialTotalValueOfAwardCeiling: number | null;
  lastModifiedDate: string | null;
}

export interface ContractsAward {
  awardKey: string;
  piid: string | null;
  flag: string | null;
  awardType: string | null;
  attributedFiscalYear: number | null;
  vendor: {
    uei: string | null;
    name: string | null;
    cageCode: string | null;
    city: string | null;
    state: string | null;
    parentUei: string | null;
    parentName: string | null;
  } | null;
  vendorUeiMissing?: boolean;
  awarding: Record<string, string | null>;
  classification: Record<string, string | number | null>;
  snapshotMoney: Record<string, number | null>;
  parent: {
    piid: string | null;
    agencyId: string | null;
    candidateKey: string | null;
    /** As-designed published value — labelled as published. */
    candidateResolvesAsDesigned: boolean | null;
    linkStateAsDesigned: string | null;
    /** Labelled diagnostic only — never a join. */
    normalisedCandidateKeyDiagnostic: string | null;
    candidateResolvesNormalisedDiagnostic: boolean | null;
  } | null;
  modificationBlock: {
    transactionsInWindow: number | null;
    modificationsInWindow: number | null;
    federalActionObligationSumInWindow: number | null;
    hasBaseActionInWindow: boolean | null;
    firstActionDateInWindow: string | null;
    latestActionDateInWindow: string | null;
  } | null;
  timeline: ContractsTimelineEntry[];
  permalink: string | null;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface ContractsDatasetMeta {
  dataset: string;
  version: string;
  generatedAt: string | null;
  fiscalYears: number[];
  vendors: number;
  awards: number;
  totals: {
    totalDollarsObligated: number | null;
    totalOutlayedAmountForOverallAward: number | null;
    transactionsInWindow: number | null;
    modificationsInWindow: number | null;
    subawardRows: number | null;
  };
  provenance: Record<string, unknown>;
  measureDefinitions: Record<string, string>;
  parentLinkage: Record<string, unknown> | null;
}

export async function getContractsDatasetMeta(
  loader: ContractsLoader | null = getContractsLoader(),
): Promise<ContractsDatasetMeta | null> {
  if (!loader) return null;
  const raw = (await loader("dataset.json")) as ContractsDatasetMeta | null;
  if (!raw) return null;
  return { ...raw, parentLinkage: raw.parentLinkage ?? null };
}

export interface ContractsSearchResult {
  mode: "uei" | "name";
  results: ContractsStub[];
  total: number;
  page: number;
  pageSize: number;
  error?: "too_short" | "unavailable";
}

const MAX_PAGE_SIZE = 100;

/** The publisher buckets stubs by md5 of the FULL key, so search
 *  scans the 100 bucket files of the relevant family and filters
 *  in-process (grants search semantics, contracts bucket scheme). */
async function scanStubs(
  family: "idx" | "nam",
  loader: ContractsLoader,
): Promise<ContractsStub[]> {
  const files = await Promise.all(
    Array.from({ length: 100 }, (_, i) =>
      loader(`${family}/${String(i).padStart(2, "0")}.json`),
    ),
  );
  const out: ContractsStub[] = [];
  for (const f of files) out.push(...decodeStubs(f as StubFile | null));
  return out;
}

export async function searchContractVendors(
  query: string,
  opts: { page?: number; pageSize?: number } = {},
  loader: ContractsLoader | null = getContractsLoader(),
): Promise<ContractsSearchResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.pageSize ?? 25));
  const q = query.trim().toUpperCase();
  const base = { page, pageSize };
  if (!loader) return { ...base, mode: "uei", results: [], total: 0, error: "unavailable" };
  const compact = q.replace(/[^A-Z0-9]/g, "");
  if (compact.length < 3) {
    return { ...base, mode: "uei", results: [], total: 0, error: "too_short" };
  }

  const looksLikeUei = !/\s/.test(q) && /[0-9]/.test(compact);
  if (!looksLikeUei) {
    const key = normalizeNameKey(q);
    const tokens = key.split(/\s+/).filter((t) => t.length >= 2);
    if (tokens.length === 0) {
      return { ...base, mode: "name", results: [], total: 0, error: "too_short" };
    }
    const stubs = (await scanStubs("nam", loader)).filter((s) => {
      const nameTokens = (s.nameKey ?? "").split(/\s+/);
      return tokens.every((t) => nameTokens.some((nt) => nt.startsWith(t)));
    });
    stubs.sort((x, y) => contractsStubRank(y) - contractsStubRank(x));
    return {
      ...base,
      mode: "name",
      results: stubs.slice((page - 1) * pageSize, page * pageSize),
      total: stubs.length,
    };
  }

  const stubs = (await scanStubs("idx", loader)).filter((s) =>
    s.uei.startsWith(compact),
  );
  stubs.sort((x, y) => contractsStubRank(y) - contractsStubRank(x));
  return {
    ...base,
    mode: "uei",
    results: stubs.slice((page - 1) * pageSize, page * pageSize),
    total: stubs.length,
  };
}

export async function getContractVendorProfile(
  ueiRaw: string,
  loader: ContractsLoader | null = getContractsLoader(),
): Promise<ContractsVendorProfile | null> {
  if (!loader) return null;
  const uei = ueiRaw.trim().toUpperCase();
  if (!/^[A-Z0-9]{12}$/.test(uei)) return null;
  const [idxRaw, venRaw] = await Promise.all([
    loader(`idx/${contractsBucket(uei, 100)}.json`),
    loader(`ven/${contractsBucket(uei, 100)}.json`),
  ]);
  const bucket = venRaw as { vendors?: Record<string, ContractsVendorProfile> } | null;
  const rec = bucket?.vendors?.[uei];
  if (!rec) return null;
  const stub =
    decodeStubs(idxRaw as StubFile | null).find((s) => s.uei === uei) ?? null;
  return { ...rec, uei, stub };
}

export async function getContractAward(
  awardKeyRaw: string,
  loader: ContractsLoader | null = getContractsLoader(),
): Promise<ContractsAward | null> {
  if (!loader) return null;
  const awardKey = decodeURIComponent(awardKeyRaw).trim();
  if (!awardKey) return null;
  // Award buckets are gzip JSON — the loader gunzips (.json.gz).
  const raw = await loader(`awd/${contractsBucket(awardKey, 1000)}.json.gz`);
  const bucket = raw as { awards?: Record<string, ContractsAward> } | null;
  return bucket?.awards?.[awardKey] ?? null;
}

export interface ContractsTopVendor {
  uei: string;
  name: string | null;
  state: string | null;
  awards: number | null;
  totalDollarsObligated: number | null;
}

export async function getContractsTopVendors(
  kind: "naics" | "psc",
  code: string,
  loader: ContractsLoader | null = getContractsLoader(),
): Promise<ContractsTopVendor[] | null> {
  if (!loader) return null;
  const raw = (await loader(`top/${kind}/${code.trim()}.json`)) as {
    vendors?: ContractsTopVendor[];
  } | null;
  if (!raw?.vendors) return null;
  return raw.vendors;
}
