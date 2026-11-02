/**
 * Fraud Radar Phase 10 — relationship-graph app data layer (PHASE10
 * §6.6). The app reads ONLY the published ego-network artifacts +
 * dataset.json; it computes no graph, joins nothing at request time,
 * and reads NO case data ever (§7.1 firewall — pinned by
 * graphs-firewall.test.ts).
 *
 * Artifact contract (publisher: pipeline G1/G4, app-publish/out/graphs):
 *   dataset.json   provenance, caps, legend, parent-linkage rates,
 *                  measured totals for the composite vintage
 *   ego/<b2>.json  {"v": version, "egos": {entityKey: ego}} bucketed
 *                  by md5(entityKey) % 100 (pipeline graphs.py _bucket)
 *   idx/<b3>.json  search stubs — DESIGNED (§4.3) but NOT published
 *                  by G4; search reports index_not_published honestly
 *                  until the publisher emits them (never faked).
 *
 * Hosting (B-3 disposition): FRAUD_RADAR_GRAPHS_ARTIFACT_ROOT unset
 * ⇒ every surface renders dataset_not_published; nothing errors and
 * no demo data is substituted. The G4 full-corpus publish measured
 * 23.35 GB, so a root, if ever set, must point at a thinned tree
 * (§3.3 fallback) — this layer reads whatever tree the root names.
 *
 * Honesty rules: an edge is a published record, never a finding;
 * candidate (E-7) edges stay labelled CANDIDATE with the measured
 * linkage sentence and are excluded from every count this layer
 * returns; signals/screening appear only as node annotations with
 * their provenance blocks; address nodes render locality-only
 * (city/state/ZIP3 labels as published — the decoder whitelists
 * node fields so no street text can pass through this layer);
 * absence is null / an explicit empty state, never zero.
 */
import { createHash } from "node:crypto";

export const GRAPHS_DATASET = "graphs";
export const DEFAULT_GRAPHS_VERSION =
  "2026-10-06+2026-10-31_ay2026+2026-02-09+2022-2024";
export const GRAPH_CATALOG_VERSION = "1.0.0";

/** §2.5 legend sentence — verbatim, pinned by tests. */
export const GRAPH_LEGEND =
  "Lines show relationships recorded in published federal datasets (named on each line). A line is a record, not a finding about anyone. Dashed lines are candidates — constructed linkages that have not been verified.";

export const GRAPH_EMPTY_STATE =
  "No published-record relationships for this entity in the current vintage — this means the published datasets record no awards, subawards, bridges, or shared published addresses for it, not that none exist.";

export interface GraphsConfig {
  root: string;
  version: string;
  isHttp: boolean;
}

export function graphsConfig(
  env: Record<string, string | undefined> = process.env,
): GraphsConfig | null {
  const root = env.FRAUD_RADAR_GRAPHS_ARTIFACT_ROOT?.trim().replace(/\/+$/, "");
  if (!root) return null;
  return {
    root,
    version: env.FRAUD_RADAR_GRAPHS_VERSION?.trim() || DEFAULT_GRAPHS_VERSION,
    isHttp: /^https?:\/\//i.test(root),
  };
}

export type GraphsLoader = (relPath: string) => Promise<unknown | null>;

export function createGraphsLoader(config: GraphsConfig): GraphsLoader {
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
      return JSON.parse(
        await readFile(path.join(config.root, relPath), "utf8"),
      ) as unknown;
    } catch {
      return null;
    }
  };
}

let defaultLoader: GraphsLoader | null = null;
export function getGraphsLoader(): GraphsLoader | null {
  const config = graphsConfig();
  if (!config) return null;
  if (!defaultLoader) defaultLoader = createGraphsLoader(config);
  return defaultLoader;
}

/** Bucket scheme — must match pipeline graphs.py `_bucket`. */
export function egoBucket(entityKey: string): string {
  const h = createHash("md5").update(entityKey, "utf8").digest("hex");
  return String(parseInt(h.slice(0, 8), 16) % 100).padStart(2, "0");
}

// ---------------------------------------------------------------------------
// Ego types (decoder whitelists fields — §7.2: no street address can
// pass through; address nodes keep their published locality label).
// ---------------------------------------------------------------------------

export interface GraphNode {
  key: string;
  type: string;
  label: string;
  groupSize?: number;
}

export interface GraphEdge {
  type: string;
  from: string;
  to: string;
  dataset: string;
  datasetVersion: string;
  status: "published" | "reported" | "candidate";
  sentence: string | null;
  weight: { field: string; semantics: string; value: number } | null;
}

export interface GraphTruncation {
  edgeType: string;
  direction?: string;
  shown: number;
  total: number;
}

export interface EgoNetwork {
  entityKey: string;
  entityType: string;
  label: string;
  labelSource: string | null;
  facets: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Candidate edges are returned separately-labelled, never merged
   *  into counts: `edges` above already excludes nothing — callers
   *  must use edgesExcludingCandidates for any count (§2.3). */
  annotations: unknown[];
  truncations: GraphTruncation[];
  edgeCountExcludingCandidates: number;
  candidateEdgesExcludedFromMetrics: number;
  sourceVersions: Record<string, string>;
  legend: string;
}

interface RawEgo {
  entity?: { key?: string; type?: string; label?: string; labelSource?: string; facets?: string[] };
  nodes?: Record<string, unknown>[];
  edges?: Record<string, unknown>[];
  annotations?: unknown[];
  truncations?: Record<string, unknown>[];
  metrics?: { edgeCountExcludingCandidates?: number; candidateEdgesExcludedFromMetrics?: number };
  sourceVersions?: Record<string, string>;
  legend?: string;
}

export function decodeEgo(entityKey: string, raw: RawEgo): EgoNetwork {
  const nodes: GraphNode[] = (raw.nodes ?? []).map((n) => ({
    key: String(n.key),
    type: String(n.type),
    label: String(n.label ?? n.key),
    ...(typeof n.groupSize === "number" ? { groupSize: n.groupSize } : {}),
  }));
  const edges: GraphEdge[] = (raw.edges ?? []).map((e) => {
    const w = e.weight as { field?: string; semantics?: string; value?: number } | null;
    return {
      type: String(e.type),
      from: String(e.from),
      to: String(e.to),
      dataset: String(e.dataset ?? ""),
      datasetVersion: String(e.datasetVersion ?? ""),
      status: (e.status as GraphEdge["status"]) ?? "published",
      sentence: (e.sentence as string) ?? null,
      weight: w
        ? {
            field: String(w.field ?? ""),
            semantics: String(w.semantics ?? ""),
            value: typeof w.value === "number" ? w.value : 0,
          }
        : null,
    };
  });
  return {
    entityKey,
    entityType: String(raw.entity?.type ?? ""),
    label: String(raw.entity?.label ?? entityKey),
    labelSource: (raw.entity?.labelSource as string) ?? null,
    facets: raw.entity?.facets ?? [],
    nodes,
    edges,
    annotations: raw.annotations ?? [],
    truncations: (raw.truncations ?? []).map((t) => ({
      edgeType: String(t.edgeType ?? t.edge_type ?? ""),
      ...(t.direction ? { direction: String(t.direction) } : {}),
      shown: typeof t.shown === "number" ? t.shown : 0,
      total: typeof t.total === "number" ? t.total : 0,
    })),
    edgeCountExcludingCandidates: raw.metrics?.edgeCountExcludingCandidates ?? 0,
    candidateEdgesExcludedFromMetrics:
      raw.metrics?.candidateEdgesExcludedFromMetrics ?? 0,
    sourceVersions: raw.sourceVersions ?? {},
    legend: raw.legend ?? GRAPH_LEGEND,
  };
}

/** Normalise an (engine, key) pair to the published entity key.
 *  Returns null for anything that is not a well-formed identifier —
 *  identifiers first (§0.2); names are never graph keys here. */
export function entityKeyFor(engine: string, key: string): string | null {
  const k = key.trim().toUpperCase();
  if (k.startsWith("UEI:") || k.startsWith("NPI:") || k.startsWith("EIN:"))
    return k;
  if (engine === "grants" || engine === "contracts")
    return /^[A-Z0-9]{12}$/.test(k) ? `UEI:${k}` : null;
  if (engine === "healthcare" || engine === "care")
    return /^[0-9]{10}$/.test(k) ? `NPI:${k}` : null;
  if (engine === "fac") {
    if (/^[0-9]{9}$/.test(k)) return `EIN:${k}`;
    if (/^[A-Z0-9]{12}$/.test(k)) return `UEI:${k}`;
    return null;
  }
  return null;
}

export async function getEgoNetwork(
  engine: string,
  key: string,
  loader: GraphsLoader | null = getGraphsLoader(),
): Promise<EgoNetwork | null> {
  if (!loader) return null;
  const entityKey = entityKeyFor(engine, key);
  if (!entityKey) return null;
  const raw = (await loader(`ego/${egoBucket(entityKey)}.json`)) as {
    egos?: Record<string, RawEgo>;
  } | null;
  const ego = raw?.egos?.[entityKey];
  if (!ego) return null;
  return decodeEgo(entityKey, ego);
}

// ---------------------------------------------------------------------------
// Dataset meta + search stubs
// ---------------------------------------------------------------------------

export interface GraphsDatasetMeta {
  dataset: string;
  version: string;
  graphCatalogVersion: string;
  legend: string;
  generatedAt: string | null;
  totals: Record<string, number>;
  candidateSentence: string | null;
  sourceVersions: Record<string, string>;
}

export async function getGraphsDatasetMeta(
  loader: GraphsLoader | null = getGraphsLoader(),
): Promise<GraphsDatasetMeta | null> {
  if (!loader) return null;
  const raw = (await loader("dataset.json")) as Record<string, unknown> | null;
  if (!raw) return null;
  const pl = raw.parentLinkage as { candidateSentence?: string } | undefined;
  return {
    dataset: String(raw.dataset ?? GRAPHS_DATASET),
    version: graphsConfig()?.version ?? DEFAULT_GRAPHS_VERSION,
    graphCatalogVersion: String(raw.graphCatalogVersion ?? GRAPH_CATALOG_VERSION),
    legend: String(raw.legend ?? GRAPH_LEGEND),
    generatedAt: (raw.generatedAt as string) ?? null,
    totals: (raw.totals as Record<string, number>) ?? {},
    candidateSentence: pl?.candidateSentence ?? null,
    sourceVersions: (raw.sourceVersions as Record<string, string>) ?? {},
  };
}

export interface GraphStub {
  key: string;
  label: string;
  type: string;
  edgeCount: number;
}

/**
 * Graph search over the designed idx/ stubs. G4 did not publish an
 * idx/ tree, so until the publisher emits one this returns
 * index_not_published — an honest state, never a fabricated result
 * set and never a scan of the 23 GB ego tree at request time.
 */
export async function searchGraphEntities(
  query: string,
  opts: { page?: number; pageSize?: number } = {},
  loader: GraphsLoader | null = getGraphsLoader(),
): Promise<{
  results: GraphStub[];
  total: number;
  page: number;
  pageSize: number;
  error?: "too_short" | "unavailable" | "index_not_published";
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const base = { page, pageSize };
  if (!loader) return { ...base, results: [], total: 0, error: "unavailable" };
  const q = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (q.length < 3) return { ...base, results: [], total: 0, error: "too_short" };
  const raw = (await loader(`idx/${q.slice(0, 3)}.json`)) as {
    s?: unknown[][];
    n?: unknown[][];
  } | null;
  if (!raw?.s) return { ...base, results: [], total: 0, error: "index_not_published" };
  const stubs: GraphStub[] = raw.s
    .map((s, i) => ({
      key: String(s[0]),
      label: String(s[1] ?? s[0]),
      type: String(s[2] ?? ""),
      edgeCount: (raw.n?.[i]?.[0] as number) ?? 0,
    }))
    .filter((s) => s.key.replace(/[^A-Z0-9]/g, "").startsWith(q));
  stubs.sort((a, b) => b.edgeCount - a.edgeCount);
  return {
    ...base,
    results: stubs.slice((page - 1) * pageSize, page * pageSize),
    total: stubs.length,
  };
}

// ---------------------------------------------------------------------------
// Profile Network summary (§6.3) — derived from the ego extract's OWN
// published metrics + truncation records (the designed net/ counts
// tree was not published by G4; the ego's metrics block is the
// publisher's own count record, so nothing is re-derived by parsing
// edges here). Candidate edges never contribute (§2.3).
// ---------------------------------------------------------------------------

export interface NetworkSummary {
  entityKey: string;
  label: string;
  /** edgeType → published count excluding candidates (shown + the
   *  truncated remainder where a truncation record exists). */
  countsByType: Record<string, number>;
  truncations: GraphTruncation[];
  neighbours: { key: string; type: string; label: string; edgeType: string }[];
  annotationCount: number;
}

export function summariseEgo(ego: EgoNetwork): NetworkSummary {
  const counts: Record<string, number> = {};
  for (const e of ego.edges) {
    if (e.status === "candidate") continue;
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  for (const t of ego.truncations) {
    if (t.edgeType && t.total > (counts[t.edgeType] ?? 0))
      counts[t.edgeType] = t.total;
  }
  const nodeByKey = new Map(ego.nodes.map((n) => [n.key, n]));
  const neighbours: NetworkSummary["neighbours"] = [];
  const seen = new Set<string>();
  for (const e of ego.edges) {
    const otherKey = e.from === ego.entityKey ? e.to : e.to === ego.entityKey ? e.from : null;
    if (!otherKey || seen.has(`${e.type}:${otherKey}`)) continue;
    const node = nodeByKey.get(otherKey);
    if (!node) continue;
    seen.add(`${e.type}:${otherKey}`);
    neighbours.push({ key: node.key, type: node.type, label: node.label, edgeType: e.type });
    if (neighbours.length >= 40) break;
  }
  return {
    entityKey: ego.entityKey,
    label: ego.label,
    countsByType: counts,
    truncations: ego.truncations,
    neighbours,
    annotationCount: ego.annotations.length,
  };
}

export async function getNetworkSummary(
  engine: string,
  key: string,
  loader: GraphsLoader | null = getGraphsLoader(),
): Promise<NetworkSummary | null> {
  const ego = await getEgoNetwork(engine, key, loader);
  return ego ? summariseEgo(ego) : null;
}
