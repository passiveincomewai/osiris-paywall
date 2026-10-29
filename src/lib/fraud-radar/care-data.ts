/**
 * Fraud Radar Phase 3 — care programs app data layer.
 *
 * Covers the Medicare fee-for-service slice (CMS Physician & Other
 * Practitioners, by Provider and Service, CY2022–CY2024) published by
 * the batch pipeline as care-program-aggregates, plus the registry of
 * what the Neon directory grain holds (hospice / home health —
 * care-neon.ts). The app reads ONLY these versioned artifacts + the
 * Neon grain; it never touches the source CSVs or Parquet.
 *
 * Artifact contract (publisher: app-publish/publish_care.py in the
 * Fraud Radar workspace — field order is a shared contract):
 *   dataset.json     provenance + totals (derived amounts labelled)
 *   idx/<b3>.json    provider stubs by NPI prefix
 *   nam/<b3>.json    provider stubs by name-key prefix
 *   pro/<b4>.json    per-provider detail (identity, yearly, HCPCS, LEIE)
 *   top/<code>.json  top-50 providers per HCPCS code (latest year)
 *   medicare-hcpcs.json / medicare-national.json  Neon loader inputs
 *   directories.json   hospice + home-health rows (Neon loader input)
 *
 * Honesty rules enforced by this layer:
 *  - The source publishes AVERAGE amounts only. Every payment figure
 *    here is DERIVED (services × average) and is named/labelled
 *    derived end-to-end; it is never presented as a claim-level total.
 *  - Absence is never zero: CMS suppresses small cells before
 *    publication, so a provider/year/service missing from the
 *    artifacts is missing data and decodes to null.
 *  - benesReported is a reported volume summed over published rows —
 *    never a unique-beneficiary count.
 *  - Medicare fee-for-service (Part B) only; Medicare Advantage is a
 *    different program and is never merged into these figures.
 *  - Exclusion listings are research leads, never findings.
 */

export const CARE_DATASET = "care-program-aggregates";
export const DEFAULT_CARE_VERSION = "2022-2024";
export const CARE_YEARS = [2022, 2023, 2024] as const;

export const DERIVED_NOTE =
  "The source publishes average amounts only. Every payment figure is derived as services × average and labelled derived; derived totals can differ slightly from claim-level totals. CMS suppresses small cells before publication — absence is missing data, never zero. Beneficiary figures are reported volumes summed over published rows, not unique-beneficiary counts. Medicare fee-for-service (Part B) only.";

// ---------------------------------------------------------------------------
// Artifact loading — same pattern as healthcare-data.ts. Root:
//   FRAUD_RADAR_CARE_ARTIFACT_ROOT  full prefix of the versioned care
//   artifact tree, e.g. https://<store>.public.blob.vercel-storage.com/
//   fraud-radar/care/2022-2024 or an absolute local path to that dir.
// Unconfigured => surfaces render an honest "not published yet" state.
// ---------------------------------------------------------------------------

export interface CareConfig {
  root: string;
  version: string;
  isHttp: boolean;
}

export function careConfig(
  env: Record<string, string | undefined> = process.env,
): CareConfig | null {
  const root = env.FRAUD_RADAR_CARE_ARTIFACT_ROOT?.trim().replace(/\/+$/, "");
  if (!root) return null;
  return {
    root,
    version: env.FRAUD_RADAR_CARE_VERSION?.trim() || DEFAULT_CARE_VERSION,
    isHttp: /^https?:\/\//i.test(root),
  };
}

export type CareLoader = (relPath: string) => Promise<unknown | null>;

export function createCareLoader(config: CareConfig): CareLoader {
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

let defaultLoader: CareLoader | null = null;
export function getCareLoader(): CareLoader | null {
  const config = careConfig();
  if (!config) return null;
  if (!defaultLoader) defaultLoader = createCareLoader(config);
  return defaultLoader;
}

// ---------------------------------------------------------------------------
// Decoders (contract with the publisher). Nulls preserved exactly.
// Bucket files carry two parallel positional lists {"s": [...], "n": [...]}.
// ---------------------------------------------------------------------------

export interface CareStub {
  npi: string;
  displayName: string | null;
  entityCode: string | null; // "I" individual | "O" organization
  state: string | null;
  providerType: string | null;
  pymtDerivedTotalUsd: number;
  servicesTotal: number | null;
  leieListed: boolean;
  yearsPresent: number[];
  nameKey?: string;
}

interface ParallelRec {
  s: unknown[][];
  n: unknown[][];
}

export function decodeCareStubs(raw: ParallelRec | null): CareStub[] {
  if (!raw) return [];
  return raw.s.map((s, i) => {
    const n = raw.n[i] ?? [];
    const mask = (n[3] as number) ?? 0;
    return {
      npi: String(s[0]),
      displayName: (s[1] as string) ?? null,
      entityCode: (s[2] as string) ?? null,
      state: (s[3] as string) ?? null,
      providerType: (s[4] as string) ?? null,
      pymtDerivedTotalUsd: (n[0] as number) ?? 0,
      servicesTotal: (n[1] as number) ?? null,
      leieListed: n[2] === 1,
      yearsPresent: CARE_YEARS.filter((_, bit) => (mask & (1 << bit)) !== 0),
    };
  });
}

export function decodeCareNameStubs(raw: ParallelRec | null): CareStub[] {
  if (!raw) return [];
  return raw.s.map((s, i) => {
    const n = raw.n[i] ?? [];
    return {
      nameKey: String(s[0]),
      npi: String(s[1]),
      displayName: (s[2] as string) ?? null,
      entityCode: null,
      state: (s[3] as string) ?? null,
      providerType: (s[4] as string) ?? null,
      pymtDerivedTotalUsd: (n[0] as number) ?? 0,
      servicesTotal: null,
      leieListed: n[1] === 1,
      yearsPresent: [],
    };
  });
}

export interface CareYearRow {
  year: number;
  services: number | null;
  benesReported: number | null;
  pymtDerivedUsd: number | null;
  allowedDerivedUsd: number | null;
  stdzdDerivedUsd: number | null;
  submittedDerivedUsd: number | null;
  hcpcsCount: number | null;
  sourceRows: number | null;
}

export interface CareHcpcsRow {
  code: string;
  description: string | null;
  services: number | null;
  benesReported: number | null;
  pymtDerivedUsd: number | null;
}

export interface CareLeieBlock {
  excltypes: string | null;
  earliestExcldate: string | null;
  listedNames: string | null;
  recordCount: number;
  /** Derived Medicare payments in calendar years strictly after the
   *  exclusion year (annual grain — see profile page caveats). */
  pymtDerivedAfterExclYearUsd: number | null;
}

export interface CareIdentity {
  displayName: string | null;
  lastOrgName: string | null;
  firstName: string | null;
  credentials: string | null;
  entityCode: string | null;
  city: string | null;
  state: string | null;
  zip5: string | null;
  providerType: string | null;
  medicareParticipating: string | null;
}

export interface CareProfile {
  npi: string;
  stub: CareStub | null;
  identity: CareIdentity;
  years: CareYearRow[];
  hcpcs: CareHcpcsRow[];
  leie: CareLeieBlock | null;
}

interface ProRec {
  id: { s: unknown[] };
  years: unknown[][];
  hcpcs: ParallelRec;
  leie: { s: unknown[]; n: unknown[] } | null;
}

export function decodeCareProfile(
  npi: string,
  rec: ProRec,
  stub: CareStub | null,
): CareProfile {
  const s = rec.id.s;
  return {
    npi,
    stub,
    identity: {
      displayName: (s[0] as string) ?? null,
      lastOrgName: (s[1] as string) ?? null,
      firstName: (s[2] as string) ?? null,
      credentials: (s[3] as string) ?? null,
      entityCode: (s[4] as string) ?? null,
      city: (s[5] as string) ?? null,
      state: (s[6] as string) ?? null,
      zip5: (s[7] as string) ?? null,
      providerType: (s[8] as string) ?? null,
      medicareParticipating: (s[9] as string) ?? null,
    },
    years: (rec.years ?? []).map((y) => ({
      year: y[0] as number,
      services: (y[1] as number) ?? null,
      benesReported: (y[2] as number) ?? null,
      pymtDerivedUsd: (y[3] as number) ?? null,
      allowedDerivedUsd: (y[4] as number) ?? null,
      stdzdDerivedUsd: (y[5] as number) ?? null,
      submittedDerivedUsd: (y[6] as number) ?? null,
      hcpcsCount: (y[7] as number) ?? null,
      sourceRows: (y[8] as number) ?? null,
    })),
    hcpcs: (rec.hcpcs?.s ?? []).map((hs, i) => {
      const hn = rec.hcpcs.n[i] ?? [];
      return {
        code: String(hs[0]),
        description: (hs[1] as string) ?? null,
        services: (hn[0] as number) ?? null,
        benesReported: (hn[1] as number) ?? null,
        pymtDerivedUsd: (hn[2] as number) ?? null,
      };
    }),
    leie: rec.leie
      ? {
          excltypes: (rec.leie.s[0] as string) ?? null,
          earliestExcldate: (rec.leie.s[1] as string) ?? null,
          listedNames: (rec.leie.s[2] as string) ?? null,
          recordCount: (rec.leie.n[1] as number) ?? 0,
          pymtDerivedAfterExclYearUsd: (rec.leie.n[2] as number) ?? null,
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

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface CareDatasetMeta {
  dataset: string;
  version: string;
  program: string;
  yearsPresent: number[];
  providers: number;
  totalsByYear: Record<
    string,
    {
      providers: number;
      hcpcsCodes: number;
      services: number | null;
      benesReported: number;
      pymtDerivedUsd: number | null;
      allowedDerivedUsd: number | null;
      stdzdDerivedUsd: number | null;
      submittedDerivedUsd: number | null;
      sourceRows: number;
    }
  >;
  directories: {
    hospiceProviders: number;
    homeHealthAgencies: number;
    careCompareVersion: string;
  };
  provenance: Record<string, string>;
  statements: Record<string, string>;
}

export async function getCareDatasetMeta(
  loader: CareLoader | null = getCareLoader(),
): Promise<CareDatasetMeta | null> {
  if (!loader) return null;
  const raw = (await loader("dataset.json")) as CareDatasetMeta | null;
  return raw ?? null;
}

export interface CareSearchResult {
  mode: "npi" | "name";
  results: CareStub[];
  total: number;
  page: number;
  pageSize: number;
  error?: "too_short" | "unavailable";
}

const MAX_PAGE_SIZE = 100;

export async function searchCareProviders(
  query: string,
  opts: { page?: number; pageSize?: number } = {},
  loader: CareLoader | null = getCareLoader(),
): Promise<CareSearchResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.pageSize ?? 25));
  const q = query.trim().toUpperCase();
  const base = { page, pageSize };
  if (!loader) return { ...base, mode: "npi", results: [], total: 0, error: "unavailable" };
  if (q.replace(/[^A-Z0-9]/g, "").length < 3) {
    return { ...base, mode: "npi", results: [], total: 0, error: "too_short" };
  }

  const looksLikeKey = /^[0-9]/.test(q) || /^[A-Z][0-9]/.test(q);
  if (!looksLikeKey) {
    const key = normalizeNameKey(q);
    const tokens = key.split(/\s+/).filter((t) => t.length >= 2);
    if (tokens.length === 0) {
      return { ...base, mode: "name", results: [], total: 0, error: "too_short" };
    }
    const raw = (await loader(`nam/${nameBucket(tokens[0])}.json`)) as ParallelRec | null;
    if (!raw) return { ...base, mode: "name", results: [], total: 0 };
    const stubs = decodeCareNameStubs(raw).filter((s) => {
      const nameTokens = (s.nameKey ?? "").split(/\s+/);
      return tokens.every((t) => nameTokens.some((nt) => nt.startsWith(t)));
    });
    stubs.sort((x, y) => y.pymtDerivedTotalUsd - x.pymtDerivedTotalUsd);
    return {
      ...base,
      mode: "name",
      results: stubs.slice((page - 1) * pageSize, page * pageSize),
      total: stubs.length,
    };
  }

  const raw = (await loader(`idx/${bucket3(q)}.json`)) as ParallelRec | null;
  if (!raw) return { ...base, mode: "npi", results: [], total: 0 };
  const stubs = decodeCareStubs(raw).filter((s) => s.npi.startsWith(q));
  stubs.sort((x, y) => y.pymtDerivedTotalUsd - x.pymtDerivedTotalUsd);
  return {
    ...base,
    mode: "npi",
    results: stubs.slice((page - 1) * pageSize, page * pageSize),
    total: stubs.length,
  };
}

export async function getCareProviderProfile(
  npiRaw: string,
  loader: CareLoader | null = getCareLoader(),
): Promise<CareProfile | null> {
  if (!loader) return null;
  const npi = npiRaw.trim().toUpperCase();
  if (!/^[0-9]{10}$/.test(npi)) return null;
  const [idxRaw, proRaw] = await Promise.all([
    loader(`idx/${bucket3(npi)}.json`),
    loader(`pro/${bucket4(npi)}.json`),
  ]);
  const pro = proRaw as { providers: Record<string, ProRec> } | null;
  const rec = pro?.providers?.[npi];
  if (!rec) return null;
  const stub =
    decodeCareStubs(idxRaw as ParallelRec | null).find((s) => s.npi === npi) ??
    null;
  return decodeCareProfile(npi, rec, stub);
}

export interface CareTopProvider {
  npi: string;
  displayName: string | null;
  pymtDerivedUsd: number | null;
  services: number | null;
  benesReported: number | null;
}

export async function getCareTopProviders(
  code: string,
  loader: CareLoader | null = getCareLoader(),
): Promise<CareTopProvider[] | null> {
  if (!loader) return null;
  const raw = (await loader(`top/${code.trim().toUpperCase()}.json`)) as
    | ParallelRec
    | null;
  if (!raw) return null;
  return raw.s.map((s, i) => {
    const n = raw.n[i] ?? [];
    return {
      npi: String(s[0]),
      displayName: (s[1] as string) ?? null,
      pymtDerivedUsd: (n[0] as number) ?? null,
      services: (n[1] as number) ?? null,
      benesReported: (n[2] as number) ?? null,
    };
  });
}
