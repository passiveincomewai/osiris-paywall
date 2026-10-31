/**
 * Fraud Radar Phase 4 — grants app data layer.
 *
 * Covers the federal assistance slice published by the batch
 * pipeline as grants-aggregates (USAspending Award Data Archive
 * generation 2026-10-06, globally deduped to one row per award),
 * plus the Federal Audit Clearinghouse (FAC) single-audit bridge.
 * The small Neon grains (yearly / ALN / agency / FAC-yearly) are
 * read through grants-neon.ts. The app reads ONLY these versioned
 * artifacts + the Neon grain; it never touches the source bulk
 * files or Parquet.
 *
 * Artifact contract (publisher: app-publish/publish_grants.py in
 * the Fraud Radar workspace — field order is a shared contract):
 *   dataset.json     provenance + totals + measure statements
 *   idx/<b3>.json    recipient stubs by UEI prefix
 *   nam/<b3>.json    recipient stubs by name-key prefix
 *   rec/<b4>.json    per-recipient detail buckets (identity,
 *                    totals, ALN mix, top awards, FAC block,
 *                    screening block, subaward counts)
 *   top/<aln>.json   top recipients per ALN (assistance listing)
 *   grants-neon.json Neon loader input (see fraud-radar-load-grants)
 *
 * Honesty rules enforced by this layer:
 *  - USAspending amounts keep their source names and AWARD-
 *    CUMULATIVE semantics end-to-end: they are the snapshot totals
 *    for the overall award, never fiscal-year obligations, outlays,
 *    or expenditures, and never summed across fiscal-year parts.
 *  - ALN/agency rows attribute each award to exactly one fiscal
 *    year — attributedFiscalYear, the archive fiscal year of the
 *    award's winning (latest) snapshot. The attribution assigns the
 *    award to a year; it does not change what the amounts mean.
 *  - FAC total expended is AUDITEE-REPORTED federal expenditures
 *    from single audits. Questioned costs are FLAGS ONLY: the FAC
 *    source publishes no questioned-cost dollar column, and no
 *    amount is ever inferred from one. Records with
 *    is_public=false are withheld — only their count is published,
 *    never their contents.
 *  - Absence is null, never zero: a recipient with no public FAC
 *    record in the published vintage carries a null FAC block
 *    (usually below the single-audit expenditure threshold or not
 *    yet submitted) — never zero findings. A zero appears only
 *    where a complete published file was counted and found none
 *    (e.g. SAM-exclusion listings in the named extract, reported
 *    subawards in the published files).
 *  - Screening is research leads: SAM-exclusion listings (exact
 *    UEI) and LEIE name candidates (human review) are leads with
 *    their caveats, never findings, determinations, or matches.
 *  - SAM registration/exclusion facts carry their EXTRACT DATES
 *    with the data (entities extract 2026-10-05; exclusions
 *    extract 2026-301, dated 2026-10-28) and are never presented
 *    as live status.
 */

export const GRANTS_DATASET = "grants-aggregates";
export const DEFAULT_GRANTS_VERSION = "2026-10-06";
export const DEFAULT_FAC_VERSION = "2026-10-31_ay2026";
export const SAM_ENTITIES_EXTRACT_VERSION = "2026-10-05";
export const SAM_EXCLUSIONS_EXTRACT_VERSION = "2026-301";

export const MEASURE_NOTE =
  "USAspending amounts are award-cumulative snapshot totals for the overall award (source-named total obligated / total outlayed), not fiscal-year obligations, outlays, or expenditures. ALN and agency rows use the attributed fiscal year — the archive fiscal year of each award's most recent snapshot — so every award lands in exactly one year while its amounts stay award-cumulative.";

export const FAC_NOTE =
  "FAC total expended is auditee-reported federal expenditures from single audits. Questioned costs are flags only — the source publishes no questioned-cost dollar amounts and none are inferred. Records with is_public=false are withheld: only their count is published, never their contents. No FAC block means no public single-audit record in the published vintage — usually below the single-audit expenditure threshold or not yet submitted — which is absence (null), never zero findings.";

export const SCREENING_NOTE =
  "Exclusion listings and name candidates are research leads for human review, never findings or determinations. SAM exclusion listings join on exact UEI against the SAM exclusions extract 2026-301 (2026-10-28); LEIE name candidates are normalized-name overlaps for human review, not identity matches. SAM registration facts carry the SAM entities extract date (2026-10-05) wherever they appear.";

// ---------------------------------------------------------------------------
// Artifact loading — same pattern as care-data.ts. Root:
//   FRAUD_RADAR_GRANTS_ARTIFACT_ROOT  full prefix of the versioned
//   grants artifact tree, e.g. https://<store>.public.blob.vercel-
//   storage.com/fraud-radar/grants/2026-10-06 or an absolute local
//   path to that dir.
// Unconfigured => surfaces render an honest "not published yet" state.
// ---------------------------------------------------------------------------

export interface GrantsConfig {
  root: string;
  version: string;
  facVersion: string;
  isHttp: boolean;
}

export function grantsConfig(
  env: Record<string, string | undefined> = process.env,
): GrantsConfig | null {
  const root = env.FRAUD_RADAR_GRANTS_ARTIFACT_ROOT?.trim().replace(/\/+$/, "");
  if (!root) return null;
  return {
    root,
    version: env.FRAUD_RADAR_GRANTS_VERSION?.trim() || DEFAULT_GRANTS_VERSION,
    facVersion: env.FRAUD_RADAR_FAC_VERSION?.trim() || DEFAULT_FAC_VERSION,
    isHttp: /^https?:\/\//i.test(root),
  };
}

export type GrantsLoader = (relPath: string) => Promise<unknown | null>;

export function createGrantsLoader(config: GrantsConfig): GrantsLoader {
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

let defaultLoader: GrantsLoader | null = null;
export function getGrantsLoader(): GrantsLoader | null {
  const config = grantsConfig();
  if (!config) return null;
  if (!defaultLoader) defaultLoader = createGrantsLoader(config);
  return defaultLoader;
}

// ---------------------------------------------------------------------------
// Decoders (contract with the publisher). Nulls preserved exactly.
// Bucket files carry two parallel positional lists {"s": [...], "n": [...]}.
//
// idx stub wire:
//   s: [uei, recipientName, city, state]
//   n: [awardCount, obligatedAwardCumulativeUsd,
//       outlayAwardCumulativeUsd, distinctAlns, distinctAgencies,
//       samExclusionListed (0/1), facHasPublicRecord (0/1/null)]
// nam stub wire:
//   s: [nameKey, uei, recipientName, city, state]
//   n: [awardCount, obligatedAwardCumulativeUsd, samExclusionListed (0/1)]
// ---------------------------------------------------------------------------

export interface GrantsStub {
  uei: string;
  recipientName: string | null;
  city: string | null;
  state: string | null;
  awardCount: number;
  /** Award-cumulative snapshot totals — see MEASURE_NOTE. */
  obligatedAwardCumulativeUsd: number | null;
  outlayAwardCumulativeUsd: number | null;
  distinctAlns: number | null;
  distinctAgencies: number | null;
  /** Exact-UEI listing in the named SAM exclusions extract. */
  samExclusionListed: boolean;
  /** True/false when the recipient grain carries the FAC coverage
   *  fact; null when not published for the row. */
  facHasPublicRecord: boolean | null;
  nameKey?: string;
}

interface ParallelRec {
  s: unknown[][];
  n: unknown[][];
}

export function decodeGrantsStubs(raw: ParallelRec | null): GrantsStub[] {
  if (!raw) return [];
  return raw.s.map((s, i) => {
    const n = raw.n[i] ?? [];
    const fac = (n[6] as number | null) ?? null;
    return {
      uei: String(s[0]),
      recipientName: (s[1] as string) ?? null,
      city: (s[2] as string) ?? null,
      state: (s[3] as string) ?? null,
      awardCount: (n[0] as number) ?? 0,
      obligatedAwardCumulativeUsd: (n[1] as number) ?? null,
      outlayAwardCumulativeUsd: (n[2] as number) ?? null,
      distinctAlns: (n[3] as number) ?? null,
      distinctAgencies: (n[4] as number) ?? null,
      samExclusionListed: n[5] === 1,
      facHasPublicRecord: fac === null ? null : fac === 1,
    };
  });
}

export function decodeGrantsNameStubs(raw: ParallelRec | null): GrantsStub[] {
  if (!raw) return [];
  return raw.s.map((s, i) => {
    const n = raw.n[i] ?? [];
    return {
      nameKey: String(s[0]),
      uei: String(s[1]),
      recipientName: (s[2] as string) ?? null,
      city: (s[3] as string) ?? null,
      state: (s[4] as string) ?? null,
      awardCount: (n[0] as number) ?? 0,
      obligatedAwardCumulativeUsd: (n[1] as number) ?? null,
      outlayAwardCumulativeUsd: null,
      distinctAlns: null,
      distinctAgencies: null,
      samExclusionListed: n[2] === 1,
      facHasPublicRecord: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Recipient detail wire (rec/<b4>.json -> { recipients: { uei: rec } }):
//   id.s: [recipientName, city, state, samLegalBusinessName,
//          samDbaName, samEntitiesExtractVersion,
//          samExclusionsExtractVersion]
//   totals (numbers, nulls preserved): [awardCount,
//          obligatedAwardCumulativeUsd, outlayAwardCumulativeUsd,
//          distinctAlns, distinctAgencies, firstAttributedFiscalYear,
//          lastAttributedFiscalYear, subawardsGivenCount,
//          subawardsGivenAmountUsd, subawardsReceivedCount,
//          subawardsReceivedAmountUsd]
//   aln:  s: [aln, alnTitle]        n: [awards, obligatedAwardCumulativeUsd]
//   topAwards: s: [awardKey, fain, aln, awardingAgency]
//              n: [obligatedAwardCumulativeUsd,
//                  outlayAwardCumulativeUsd, attributedFiscalYear]
//   fac:  s: [latestAuditType]      n: [auditCount, firstAuditYear,
//          lastAuditYear, latestYearTotalExpendedUsd, findingsCount,
//          repeatFindingsCount, questionedCostFlagCount]
//          — the whole block is null when the recipient has no
//          public FAC record (absence, never a zeroed block).
//   screening: s: [samExclusionEarliestActiveDate,
//          samExclusionTypes, samExclusionsExtractVersion]
//          n: [samExclusionListingCount, leieCandidateCount]
//          — listingCount 0 is a counted zero in the named extract;
//          candidates are a human-review queue, never matches.
// ---------------------------------------------------------------------------

export interface GrantsIdentity {
  recipientName: string | null;
  city: string | null;
  state: string | null;
  samLegalBusinessName: string | null;
  samDbaName: string | null;
  /** Extract-date labels travel with the data — never "live". */
  samEntitiesExtractVersion: string | null;
  samExclusionsExtractVersion: string | null;
}

export interface GrantsTotals {
  awardCount: number;
  obligatedAwardCumulativeUsd: number | null;
  outlayAwardCumulativeUsd: number | null;
  distinctAlns: number | null;
  distinctAgencies: number | null;
  firstAttributedFiscalYear: number | null;
  lastAttributedFiscalYear: number | null;
  /** Reported subawards in the published files only (FSRS reporting
   *  is incomplete by nature); 0 = counted and found none. */
  subawardsGivenCount: number | null;
  subawardsGivenAmountUsd: number | null;
  subawardsReceivedCount: number | null;
  subawardsReceivedAmountUsd: number | null;
}

export interface GrantsAlnRow {
  aln: string;
  alnTitle: string | null;
  awards: number | null;
  obligatedAwardCumulativeUsd: number | null;
}

export interface GrantsTopAward {
  awardKey: string;
  fain: string | null;
  aln: string | null;
  awardingAgency: string | null;
  obligatedAwardCumulativeUsd: number | null;
  outlayAwardCumulativeUsd: number | null;
  attributedFiscalYear: number | null;
}

export interface GrantsFacBlock {
  latestAuditType: string | null;
  auditCount: number | null;
  firstAuditYear: number | null;
  lastAuditYear: number | null;
  /** Auditee-reported federal expenditures, latest audit year. */
  latestYearTotalExpendedUsd: number | null;
  findingsCount: number | null;
  repeatFindingsCount: number | null;
  /** Flags only — the source has no questioned-cost amounts. */
  questionedCostFlagCount: number | null;
}

export interface GrantsScreeningBlock {
  samExclusionListingCount: number;
  samExclusionEarliestActiveDate: string | null;
  samExclusionTypes: string | null;
  samExclusionsExtractVersion: string | null;
  /** LEIE normalized-name candidates — human review, never matches. */
  leieCandidateCount: number;
}

export interface GrantsProfile {
  uei: string;
  stub: GrantsStub | null;
  identity: GrantsIdentity;
  totals: GrantsTotals;
  alnMix: GrantsAlnRow[];
  topAwards: GrantsTopAward[];
  fac: GrantsFacBlock | null;
  screening: GrantsScreeningBlock | null;
}

interface RecRec {
  id: { s: unknown[] };
  totals: unknown[];
  aln: ParallelRec;
  topAwards: ParallelRec;
  fac: { s: unknown[]; n: unknown[] } | null;
  screening: { s: unknown[]; n: unknown[] } | null;
}

export function decodeGrantsProfile(
  uei: string,
  rec: RecRec,
  stub: GrantsStub | null,
): GrantsProfile {
  const s = rec.id.s;
  const t = rec.totals ?? [];
  const num = (arr: unknown[], i: number) => (arr[i] as number) ?? null;
  return {
    uei,
    stub,
    identity: {
      recipientName: (s[0] as string) ?? null,
      city: (s[1] as string) ?? null,
      state: (s[2] as string) ?? null,
      samLegalBusinessName: (s[3] as string) ?? null,
      samDbaName: (s[4] as string) ?? null,
      samEntitiesExtractVersion: (s[5] as string) ?? null,
      samExclusionsExtractVersion: (s[6] as string) ?? null,
    },
    totals: {
      awardCount: (t[0] as number) ?? 0,
      obligatedAwardCumulativeUsd: num(t, 1),
      outlayAwardCumulativeUsd: num(t, 2),
      distinctAlns: num(t, 3),
      distinctAgencies: num(t, 4),
      firstAttributedFiscalYear: num(t, 5),
      lastAttributedFiscalYear: num(t, 6),
      subawardsGivenCount: num(t, 7),
      subawardsGivenAmountUsd: num(t, 8),
      subawardsReceivedCount: num(t, 9),
      subawardsReceivedAmountUsd: num(t, 10),
    },
    alnMix: (rec.aln?.s ?? []).map((as, i) => {
      const an = rec.aln.n[i] ?? [];
      return {
        aln: String(as[0]),
        alnTitle: (as[1] as string) ?? null,
        awards: (an[0] as number) ?? null,
        obligatedAwardCumulativeUsd: (an[1] as number) ?? null,
      };
    }),
    topAwards: (rec.topAwards?.s ?? []).map((ts, i) => {
      const tn = rec.topAwards.n[i] ?? [];
      return {
        awardKey: String(ts[0]),
        fain: (ts[1] as string) ?? null,
        aln: (ts[2] as string) ?? null,
        awardingAgency: (ts[3] as string) ?? null,
        obligatedAwardCumulativeUsd: (tn[0] as number) ?? null,
        outlayAwardCumulativeUsd: (tn[1] as number) ?? null,
        attributedFiscalYear: (tn[2] as number) ?? null,
      };
    }),
    fac: rec.fac
      ? {
          latestAuditType: (rec.fac.s[0] as string) ?? null,
          auditCount: num(rec.fac.n, 0),
          firstAuditYear: num(rec.fac.n, 1),
          lastAuditYear: num(rec.fac.n, 2),
          latestYearTotalExpendedUsd: num(rec.fac.n, 3),
          findingsCount: num(rec.fac.n, 4),
          repeatFindingsCount: num(rec.fac.n, 5),
          questionedCostFlagCount: num(rec.fac.n, 6),
        }
      : null,
    screening: rec.screening
      ? {
          samExclusionEarliestActiveDate: (rec.screening.s[0] as string) ?? null,
          samExclusionTypes: (rec.screening.s[1] as string) ?? null,
          samExclusionsExtractVersion: (rec.screening.s[2] as string) ?? null,
          samExclusionListingCount: (rec.screening.n[0] as number) ?? 0,
          leieCandidateCount: (rec.screening.n[1] as number) ?? 0,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Bucket keys + name normalization (must match the publisher).
// ---------------------------------------------------------------------------

export function bucket3(key: string): string {
  return key.toUpperCase().slice(0, 3);
}

export function bucket4(key: string): string {
  return key.toUpperCase().slice(0, 4);
}

export function normalizeNameKey(q: string): string {
  return q.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
}

export function nameBucket(key: string): string {
  const compact = key.replace(/[^A-Z0-9]/g, "").slice(0, 3);
  return compact.padEnd(3, "_");
}

/** Rank only — a null amount contributes nothing to the RANK; the
 *  displayed figure stays null regardless (healthcare precedent). */
export function grantsStubRank(s: GrantsStub): number {
  return s.obligatedAwardCumulativeUsd ?? 0;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface GrantsDatasetMeta {
  dataset: string;
  version: string;
  facVersion: string;
  generatedAt: string | null;
  fiscalYears: number[];
  recipients: number;
  awards: number;
  alns: number;
  agencies: number;
  totals: {
    obligatedAwardCumulativeUsd: number | null;
    outlayAwardCumulativeUsd: number | null;
    subawardsCount: number | null;
    subawardAmountUsd: number | null;
  };
  fac: {
    auditYears: number[];
    reports: number | null;
    /** is_public=false records withheld — count only, never contents. */
    withheldCount: number | null;
    auditees: number | null;
  } | null;
  provenance: Record<string, string>;
  statements: Record<string, string>;
}

export async function getGrantsDatasetMeta(
  loader: GrantsLoader | null = getGrantsLoader(),
): Promise<GrantsDatasetMeta | null> {
  if (!loader) return null;
  const raw = (await loader("dataset.json")) as GrantsDatasetMeta | null;
  if (!raw) return null;
  return {
    ...raw,
    facVersion: raw.facVersion ?? DEFAULT_FAC_VERSION,
    fac: raw.fac ?? null,
  };
}

export interface GrantsSearchResult {
  mode: "uei" | "name";
  results: GrantsStub[];
  total: number;
  page: number;
  pageSize: number;
  error?: "too_short" | "unavailable";
}

const MAX_PAGE_SIZE = 100;

export async function searchGrantRecipients(
  query: string,
  opts: { page?: number; pageSize?: number } = {},
  loader: GrantsLoader | null = getGrantsLoader(),
): Promise<GrantsSearchResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.pageSize ?? 25));
  const q = query.trim().toUpperCase();
  const base = { page, pageSize };
  if (!loader) return { ...base, mode: "uei", results: [], total: 0, error: "unavailable" };
  const compact = q.replace(/[^A-Z0-9]/g, "");
  if (compact.length < 3) {
    return { ...base, mode: "uei", results: [], total: 0, error: "too_short" };
  }

  // UEI-shaped: a single whitespace-free token carrying a digit
  // (UEIs are 12-char alphanumeric; names carry spaces or no digits).
  const looksLikeUei = !/\s/.test(q) && /[0-9]/.test(compact);
  if (!looksLikeUei) {
    const key = normalizeNameKey(q);
    const tokens = key.split(/\s+/).filter((t) => t.length >= 2);
    if (tokens.length === 0) {
      return { ...base, mode: "name", results: [], total: 0, error: "too_short" };
    }
    const raw = (await loader(`nam/${nameBucket(tokens[0])}.json`)) as ParallelRec | null;
    if (!raw) return { ...base, mode: "name", results: [], total: 0 };
    const stubs = decodeGrantsNameStubs(raw).filter((s) => {
      const nameTokens = (s.nameKey ?? "").split(/\s+/);
      return tokens.every((t) => nameTokens.some((nt) => nt.startsWith(t)));
    });
    stubs.sort((x, y) => grantsStubRank(y) - grantsStubRank(x));
    return {
      ...base,
      mode: "name",
      results: stubs.slice((page - 1) * pageSize, page * pageSize),
      total: stubs.length,
    };
  }

  const raw = (await loader(`idx/${bucket3(compact)}.json`)) as ParallelRec | null;
  if (!raw) return { ...base, mode: "uei", results: [], total: 0 };
  const stubs = decodeGrantsStubs(raw).filter((s) => s.uei.startsWith(compact));
  stubs.sort((x, y) => grantsStubRank(y) - grantsStubRank(x));
  return {
    ...base,
    mode: "uei",
    results: stubs.slice((page - 1) * pageSize, page * pageSize),
    total: stubs.length,
  };
}

export async function getGrantRecipientProfile(
  ueiRaw: string,
  loader: GrantsLoader | null = getGrantsLoader(),
): Promise<GrantsProfile | null> {
  if (!loader) return null;
  const uei = ueiRaw.trim().toUpperCase();
  if (!/^[A-Z0-9]{12}$/.test(uei)) return null;
  const [idxRaw, recRaw] = await Promise.all([
    loader(`idx/${bucket3(uei)}.json`),
    loader(`rec/${bucket4(uei)}.json`),
  ]);
  const bucket = recRaw as { recipients: Record<string, RecRec> } | null;
  const rec = bucket?.recipients?.[uei];
  if (!rec) return null;
  const stub =
    decodeGrantsStubs(idxRaw as ParallelRec | null).find((s) => s.uei === uei) ??
    null;
  return decodeGrantsProfile(uei, rec, stub);
}

export interface GrantsTopRecipient {
  uei: string;
  recipientName: string | null;
  awards: number | null;
  obligatedAwardCumulativeUsd: number | null;
}

export async function getGrantsTopRecipients(
  aln: string,
  loader: GrantsLoader | null = getGrantsLoader(),
): Promise<GrantsTopRecipient[] | null> {
  if (!loader) return null;
  const raw = (await loader(`top/${aln.trim()}.json`)) as ParallelRec | null;
  if (!raw) return null;
  return raw.s.map((s, i) => {
    const n = raw.n[i] ?? [];
    return {
      uei: String(s[0]),
      recipientName: (s[1] as string) ?? null,
      awards: (n[0] as number) ?? null,
      obligatedAwardCumulativeUsd: (n[1] as number) ?? null,
    };
  });
}
