/**
 * Fraud Radar Phase 2 — healthcare (Medicaid) app data layer.
 *
 * The app reads ONLY versioned artifacts published by the batch
 * pipeline (AUDIT §15a) plus the Neon summary grain (hcpcs/national,
 * healthcare-neon.ts). It never touches the 238M-row source or the
 * pipeline's Parquet directly.
 *
 * Artifact contract (publisher: app-publish/publish_healthcare.py in
 * the Fraud Radar workspace — field order is a shared contract):
 *   dataset.json     provenance + totals (both monetary treatments)
 *   idx/<b3>.json    provider search stubs   (b3 = first 3 key chars)
 *   nam/<b3>.json    name-search stubs (present only with NPPES identity)
 *   pro/<b4>.json    per-provider detail     (b4 = first 4 key chars)
 *   mon/<b4>.json    per-provider monthly series (billing role)
 *   top/<code>.json  top-50 billing providers per HCPCS code
 *
 * Honesty rules enforced by this layer:
 *  - A measure the source never reported for a provider's role stays
 *    `null` end-to-end. Absence (including HHS suppression of cells
 *    with <12 claim lines) is NEVER rendered as zero.
 *  - Every figure carries the dataset version + provenance from
 *    dataset.json; monetary values exist in two labelled treatments
 *    (all reported cells / excluding the 62 flagged >$1B outlier
 *    cells) and the headline treatment is always excl-outliers. The
 *    all-cells sum is a source-file artifact and is never presented
 *    as program spending anywhere in this layer or the UI above it.
 *  - Exclusion listings are research leads, never findings.
 */

export const HEALTHCARE_DATASET = "medicaid-provider-aggregates";
export const DEFAULT_HEALTHCARE_VERSION = "2026-02-09";

export const TREATMENT = {
  headline: "excl_outliers",
  exclLabel: "Excluding flagged outlier cells",
  allLabel: "All reported cells (incl. flagged outliers)",
  exclNote:
    "Headline figures exclude 62 source cells over $1B each that the source manifest flags as artifacts. They are sums over reported cells only — HHS suppresses cells with fewer than 12 claim lines, so absence is missing data, never zero.",
} as const;

// ---------------------------------------------------------------------------
// Artifact loading (HTTP(S) — e.g. Vercel Blob public URLs — or a local
// directory for development/tests). Root is configured, never hardcoded:
//   FRAUD_RADAR_ARTIFACT_ROOT  full prefix of the versioned artifact
//   tree, e.g. https://<store>.public.blob.vercel-storage.com/fraud-radar/healthcare/2026-02-09
//   or an absolute local path to the same directory.
// Unconfigured => null config => surfaces render an honest
// "not published yet" state instead of failing.
// ---------------------------------------------------------------------------

export interface HealthcareConfig {
  root: string;
  version: string;
  isHttp: boolean;
}

export function healthcareConfig(
  env: Record<string, string | undefined> = process.env,
): HealthcareConfig | null {
  const root = env.FRAUD_RADAR_ARTIFACT_ROOT?.trim().replace(/\/+$/, "");
  if (!root) return null;
  return {
    root,
    version: env.FRAUD_RADAR_HEALTHCARE_VERSION?.trim() || DEFAULT_HEALTHCARE_VERSION,
    isHttp: /^https?:\/\//i.test(root),
  };
}

/** Returns parsed JSON, or null when the artifact does not exist. */
export type ArtifactLoader = (relPath: string) => Promise<unknown | null>;

export function createArtifactLoader(config: HealthcareConfig): ArtifactLoader {
  if (config.isHttp) {
    return async (relPath) => {
      try {
        const res = await fetch(`${config.root}/${relPath}`, {
          // Artifacts are immutable per dataset version — cache hard.
          cache: "force-cache",
        });
        if (res.status === 404) return null;
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
      const raw = await readFile(path.join(config.root, relPath), "utf8");
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  };
}

let defaultLoader: ArtifactLoader | null = null;
export function getArtifactLoader(): ArtifactLoader | null {
  const config = healthcareConfig();
  if (!config) return null;
  if (!defaultLoader) defaultLoader = createArtifactLoader(config);
  return defaultLoader;
}

// ---------------------------------------------------------------------------
// Positional decoders (contract with the publisher). Every decoder
// preserves nulls exactly — a null in the artifact is a null here.
// ---------------------------------------------------------------------------

export interface ProviderStub {
  npi: string;
  displayName: string | null;
  entityType: string | null;
  practiceState: string | null;
  primaryTaxonomy: string | null;
  hasBilling: boolean;
  hasServicing: boolean;
  billingPaidExclUsd: number | null;
  servicingPaidExclUsd: number | null;
  billingClaimLines: number | null;
  servicingClaimLines: number | null;
  leieListed: boolean;
  /** Normalized "LAST FIRST …" / org name; name-search artifacts only. */
  nameKey?: string;
}

/** Wire record: two positional lists — strings and numbers — because
 *  the publisher's DuckDB lists are type-homogeneous. Nulls preserved. */
export interface WireRec {
  s: unknown[];
  n: unknown[];
}

export function decodeStub(rec: WireRec): ProviderStub {
  const { s, n } = rec;
  const mask = (n[0] as number) ?? 0;
  return {
    npi: String(s[0]),
    displayName: (s[1] as string) ?? null,
    entityType: (s[2] as string) ?? null,
    practiceState: (s[3] as string) ?? null,
    primaryTaxonomy: (s[4] as string) ?? null,
    hasBilling: (mask & 1) === 1,
    hasServicing: (mask & 2) === 2,
    billingPaidExclUsd: (n[1] as number) ?? null,
    servicingPaidExclUsd: (n[2] as number) ?? null,
    billingClaimLines: (n[3] as number) ?? null,
    servicingClaimLines: (n[4] as number) ?? null,
    leieListed: n[5] === 1,
    nameKey: (s[5] as string) ?? undefined,
  };
}

export interface RoleBlock {
  reportedCells: number | null;
  totalClaimLines: number | null;
  totalPatientsReported: number | null;
  paidAllCellsUsd: number | null;
  outlierCells: number | null;
  outlierPaidUsd: number | null;
  paidExclOutliersUsd: number | null;
  distinctCounterparties: number | null;
  distinctHcpcsCodes: number | null;
  firstMonth: string | null;
  lastMonth: string | null;
  activeMonths: number | null;
}

function decodeRole(
  n: unknown[],
  offset: number,
  firstMonth: string | null,
  lastMonth: string | null,
): RoleBlock {
  // The block is present iff the provider appeared in the role (the
  // role mask decides); an absent role's measures are never read.
  const v = (i: number) => (n[offset + i] as number) ?? null;
  return {
    reportedCells: v(0),
    totalClaimLines: v(1),
    totalPatientsReported: v(2),
    paidAllCellsUsd: v(3),
    outlierCells: v(4),
    outlierPaidUsd: v(5),
    paidExclOutliersUsd: v(6),
    distinctCounterparties: v(7),
    distinctHcpcsCodes: v(8),
    firstMonth,
    lastMonth,
    activeMonths: v(9),
  };
}

export interface ProviderSummary {
  hasBilling: boolean;
  hasServicing: boolean;
  billing: RoleBlock | null;
  servicing: RoleBlock | null;
  leieListed: boolean;
  leieRecordCount: number | null;
  leieExcltypes: string | null;
  leieEarliestExcldate: string | null;
  leieListedNames: string | null;
}

export function decodeSummary(rec: WireRec): ProviderSummary {
  const { s, n } = rec;
  const mask = (n[0] as number) ?? 0;
  const hasBilling = (mask & 1) === 1;
  const hasServicing = (mask & 2) === 2;
  const str = (i: number) => (s[i] as string) ?? null;
  return {
    hasBilling,
    hasServicing,
    billing: hasBilling ? decodeRole(n, 1, str(0), str(1)) : null,
    servicing: hasServicing ? decodeRole(n, 11, str(2), str(3)) : null,
    leieListed: n[21] === 1,
    leieRecordCount: (n[22] as number) ?? null,
    leieExcltypes: str(4),
    leieEarliestExcldate: str(5),
    leieListedNames: str(6),
  };
}

export interface ProviderIdentity {
  displayName: string | null;
  entityType: string | null;
  organizationName: string | null;
  lastName: string | null;
  firstName: string | null;
  practiceState: string | null;
  practiceZip5: string | null;
  primaryTaxonomy: string | null;
  taxonomyCodes: string | null;
  enumerationDate: string | null;
  lastUpdateDate: string | null;
  deactivationDate: string | null;
  matched: boolean;
}

export function decodeIdentity(rec: WireRec): ProviderIdentity {
  const { s, n } = rec;
  const str = (i: number) => (s[i] as string) ?? null;
  return {
    displayName: str(0),
    entityType: str(1),
    organizationName: str(2),
    lastName: str(3),
    firstName: str(4),
    practiceState: str(5),
    practiceZip5: str(6),
    primaryTaxonomy: str(7),
    taxonomyCodes: str(8),
    enumerationDate: str(9),
    lastUpdateDate: str(10),
    deactivationDate: str(11),
    matched: n[0] === 1,
  };
}

export interface ProviderHcpcsRow {
  hcpcsCode: string;
  paidExclOutliersUsd: number | null;
  paidAllCellsUsd: number | null;
  totalClaimLines: number | null;
  totalPatientsReported: number | null;
  reportedCells: number | null;
  distinctServicingNpis: number | null;
  firstClaimMonth: string | null;
  lastClaimMonth: string | null;
  activeMonths: number | null;
}

export function decodeProviderHcpcs(rec: WireRec): ProviderHcpcsRow {
  const { s, n } = rec;
  const num = (i: number) => (n[i] as number) ?? null;
  return {
    hcpcsCode: String(s[0]),
    paidExclOutliersUsd: num(0),
    paidAllCellsUsd: num(1),
    totalClaimLines: num(2),
    totalPatientsReported: num(3),
    reportedCells: num(4),
    distinctServicingNpis: num(5),
    firstClaimMonth: (s[1] as string) ?? null,
    lastClaimMonth: (s[2] as string) ?? null,
    activeMonths: num(6),
  };
}

export interface LeieScreeningRow {
  lastname: string | null;
  firstname: string | null;
  busname: string | null;
  general: string | null;
  specialty: string | null;
  city: string | null;
  state: string | null;
  excltype: string | null;
  excldate: string | null;
  matchedRoles: string | null;
  billingPaidExclUsd: number | null;
  servicingPaidExclUsd: number | null;
  billingPaidAfterExclUsd: number | null;
  servicingPaidAfterExclUsd: number | null;
  firstClaimMonth: string | null;
  lastClaimMonth: string | null;
}

export function decodeLeieScreening(rec: WireRec): LeieScreeningRow {
  const str = (i: number) => (rec.s[i] as string) ?? null;
  const num = (i: number) => (rec.n[i] as number) ?? null;
  return {
    lastname: str(0), firstname: str(1), busname: str(2), general: str(3),
    specialty: str(4), city: str(5), state: str(6), excltype: str(7),
    excldate: str(8), matchedRoles: str(9),
    billingPaidExclUsd: num(0), servicingPaidExclUsd: num(1),
    billingPaidAfterExclUsd: num(2), servicingPaidAfterExclUsd: num(3),
    firstClaimMonth: str(10), lastClaimMonth: str(11),
  };
}

export interface MonthlySeries {
  /** yyyymm ints, ascending. Billing-role grain (the source's chart grain). */
  months: number[];
  paidExclOutliersUsd: (number | null)[];
  paidAllCellsUsd: (number | null)[];
  totalClaimLines: (number | null)[];
  totalPatientsReported: (number | null)[];
}

export interface ProviderProfile {
  npi: string;
  stub: ProviderStub | null;
  summary: ProviderSummary;
  identity: ProviderIdentity | null;
  hcpcs: ProviderHcpcsRow[];
  leie: LeieScreeningRow[];
  monthly: MonthlySeries | null;
}

export interface TopProviderRow {
  npi: string;
  displayName: string | null;
  paidExclOutliersUsd: number | null;
  paidAllCellsUsd: number | null;
  totalClaimLines: number | null;
  totalPatientsReported: number | null;
  distinctServicingNpis: number | null;
}

export interface DatasetMeta {
  dataset: string;
  version: string;
  generatedAt: string;
  identity: { source: string | null; note: string };
  sources: {
    medicaid: { version: string; rows: number; coverage: unknown };
    leie: { version: string; rows: number; recordsWithNpi: number };
    samExclusions: { version: string; extractDate: string; hhsSubsetRows: number };
  };
  suppression: string;
  outlierTreatment: string;
  totals: {
    providers: number;
    billingProviders: number;
    servicingProviders: number;
    leieListedProviders: number;
    programPaidExclOutliersUsd: number | null;
    billingPaidExclOutliersUsd: number | null;
    servicingPaidExclOutliersUsd: number | null;
    billingPaidAllCellsUsd: number | null;
    servicingPaidAllCellsUsd: number | null;
    hcpcsCodes: number;
    claimMonths: string;
  };
  notes: string[];
}

// ---------------------------------------------------------------------------
// Bucket keys + formatters
// ---------------------------------------------------------------------------

export function bucket3(key: string): string {
  return key.toUpperCase().slice(0, 3);
}

export function bucket4(key: string): string {
  return key.toUpperCase().slice(0, 4);
}

/** "1,234,567" or the em-dash absence marker — never a fabricated 0. */
export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}

/** "$1,234.56" or "—" for absent. Zero is shown only when the source
 *  actually reported zero, which the aggregates distinguish from null. */
export function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ymLabel(ym: number): string {
  const y = Math.floor(ym / 100);
  const m = ym % 100;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[m - 1] ?? "?"} ${y}`;
}

/** Sort key for ranking search results: combined reported paid
 *  (excl. outliers). A role the provider never appears in contributes
 *  nothing to the RANK — its displayed figures stay null regardless. */
export function stubRank(s: ProviderStub): number {
  return (s.billingPaidExclUsd ?? 0) + (s.servicingPaidExclUsd ?? 0);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getDatasetMeta(
  loader: ArtifactLoader | null = getArtifactLoader(),
): Promise<DatasetMeta | null> {
  if (!loader) return null;
  const raw = (await loader("dataset.json")) as DatasetMeta | null;
  return raw ?? null;
}

export interface SearchResult {
  mode: "npi" | "name";
  results: ProviderStub[];
  total: number;
  page: number;
  pageSize: number;
  identityAvailable: boolean;
  /** Set when the query cannot be served as given (e.g. too short). */
  error?: "too_short" | "unavailable";
}

const MAX_PAGE_SIZE = 100;

export async function searchProviders(
  query: string,
  opts: { page?: number; pageSize?: number } = {},
  loader: ArtifactLoader | null = getArtifactLoader(),
): Promise<SearchResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.pageSize ?? 25));
  const q = query.trim().toUpperCase();
  const base: Omit<SearchResult, "results" | "total"> = {
    mode: "npi", page, pageSize, identityAvailable: false,
  };
  if (!loader) return { ...base, results: [], total: 0, error: "unavailable" };
  if (q.replace(/[^A-Z0-9]/g, "").length < 3) {
    return { ...base, results: [], total: 0, error: "too_short" };
  }

  // Name search: letters present and not a key-shaped query (keys are
  // digit-led or a letter followed by digits, e.g. A367477000).
  const looksLikeKey = /^[0-9]/.test(q) || /^[A-Z][0-9]/.test(q);
  if (!looksLikeKey) {
    const tokens = q.split(/[^A-Z0-9]+/).filter((t) => t.length >= 2);
    if (tokens.length === 0) return { ...base, results: [], total: 0, error: "too_short" };
    const raw = (await loader(`nam/${bucket3(tokens[0])}.json`)) as
      | { stubs: WireRec[] }
      | null;
    if (!raw) {
      // No identity dataset published yet — name search honestly
      // reports itself unavailable rather than returning fake empties.
      return { ...base, mode: "name", results: [], total: 0, identityAvailable: false, error: "unavailable" };
    }
    const stubs = raw.stubs.map(decodeStub).filter((s) => {
      const nameTokens = (s.nameKey ?? s.displayName ?? "").toUpperCase().split(/[^A-Z0-9]+/);
      return tokens.every((t) => nameTokens.some((nt) => nt.startsWith(t)));
    });
    stubs.sort((x, y) => stubRank(y) - stubRank(x));
    return {
      mode: "name",
      identityAvailable: true,
      results: stubs.slice((page - 1) * pageSize, page * pageSize),
      total: stubs.length,
      page,
      pageSize,
    };
  }

  const raw = (await loader(`idx/${bucket3(q)}.json`)) as
    | { stubs: WireRec[] }
    | null;
  if (!raw) return { ...base, results: [], total: 0 };
  const stubs = raw.stubs.map(decodeStub).filter((s) => s.npi.startsWith(q));
  stubs.sort((x, y) => stubRank(y) - stubRank(x));
  return {
    ...base,
    identityAvailable: stubs.some((s) => s.displayName !== null),
    results: stubs.slice((page - 1) * pageSize, page * pageSize),
    total: stubs.length,
  };
}

export async function getProviderProfile(
  npiRaw: string,
  loader: ArtifactLoader | null = getArtifactLoader(),
): Promise<ProviderProfile | null> {
  if (!loader) return null;
  const npi = npiRaw.trim().toUpperCase();
  if (!npi) return null;
  const [idxRaw, proRaw, monRaw] = await Promise.all([
    loader(`idx/${bucket3(npi)}.json`),
    loader(`pro/${bucket4(npi)}.json`),
    loader(`mon/${bucket4(npi)}.json`),
  ]);
  const pro = proRaw as { providers: Record<string, {
    sum: WireRec;
    id?: WireRec;
    hcpcs?: WireRec[];
    leie?: WireRec[];
  }> } | null;
  const rec = pro?.providers?.[npi];
  if (!rec) return null;
  const stub =
    ((idxRaw as { stubs: WireRec[] } | null)?.stubs ?? [])
      .map(decodeStub)
      .find((s) => s.npi === npi) ?? null;
  const mon = monRaw as { series: Record<string, {
    m: number[]; e: (number | null)[]; a: (number | null)[];
    l: (number | null)[]; p: (number | null)[];
  }> } | null;
  const series = mon?.series?.[npi];
  return {
    npi,
    stub,
    summary: decodeSummary(rec.sum),
    identity: rec.id ? decodeIdentity(rec.id) : null,
    hcpcs: (rec.hcpcs ?? []).map(decodeProviderHcpcs),
    leie: (rec.leie ?? []).map(decodeLeieScreening),
    monthly: series
      ? {
          months: series.m,
          paidExclOutliersUsd: series.e,
          paidAllCellsUsd: series.a,
          totalClaimLines: series.l,
          totalPatientsReported: series.p,
        }
      : null,
  };
}

export async function getTopProviders(
  hcpcsCode: string,
  loader: ArtifactLoader | null = getArtifactLoader(),
): Promise<TopProviderRow[] | null> {
  if (!loader) return null;
  const raw = (await loader(`top/${hcpcsCode.trim().toUpperCase()}.json`)) as
    | { rows: WireRec[] }
    | null;
  if (!raw) return null;
  return raw.rows.map((rec) => ({
    npi: String(rec.s[0]),
    displayName: (rec.s[1] as string) ?? null,
    paidExclOutliersUsd: (rec.n[0] as number) ?? null,
    paidAllCellsUsd: (rec.n[1] as number) ?? null,
    totalClaimLines: (rec.n[2] as number) ?? null,
    totalPatientsReported: (rec.n[3] as number) ?? null,
    distinctServicingNpis: (rec.n[4] as number) ?? null,
  }));
}

/** Code-level artifact rows (hcpcs.json) — the Neon loader's input and
 *  a fallback read path; the explorer UI reads Neon (healthcare-neon.ts). */
export interface HcpcsSummaryRow {
  hcpcsCode: string;
  reportedCells: number | null;
  totalClaimLines: number | null;
  totalPatientsReported: number | null;
  paidAllCellsUsd: number | null;
  outlierCells: number | null;
  outlierPaidUsd: number | null;
  paidExclOutliersUsd: number | null;
  distinctBillingNpis: number | null;
  distinctServicingNpis: number | null;
  firstClaimMonth: string | null;
  lastClaimMonth: string | null;
  activeMonths: number | null;
}

export function decodeHcpcsSummary(rec: WireRec): HcpcsSummaryRow {
  const n = (i: number) => (rec.n[i] as number) ?? null;
  const s = (i: number) => (rec.s[i] as string) ?? null;
  return {
    hcpcsCode: String(s(0)),
    reportedCells: n(0), totalClaimLines: n(1), totalPatientsReported: n(2),
    paidAllCellsUsd: n(3), outlierCells: n(4), outlierPaidUsd: n(5),
    paidExclOutliersUsd: n(6), distinctBillingNpis: n(7),
    distinctServicingNpis: n(8), firstClaimMonth: s(1),
    lastClaimMonth: s(2), activeMonths: n(9),
  };
}
