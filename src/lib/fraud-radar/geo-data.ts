/**
 * Fraud Radar Phase 10 — geo explorer app data layer (PHASE10 §5/§6.6).
 * Reads ONLY the published geo artifacts; no geocoding, no point
 * data, no case data (§7.1 firewall — pinned by the firewall test).
 *
 * Artifact contract (publisher: pipeline G3, app-publish/out/geo):
 *   dataset.json        provenance + per-engine coverage statements
 *   states/<engine>.json {engine, coverageStatement, layers: {layer:
 *                        {geographyField, semantics, sourceDataset,
 *                         sourceVersion, reconciliation, states[]}}}
 *   counties/<ST>.json  {stateCode, stateName, note, layers: {layer:
 *                        {cells: [{countyName, ...measures}]}}}
 *   geo-neon.json       Neon loader input (states + nationals)
 *
 * Honesty rules (§5.3): recipient ≠ performance ≠ practice — layers
 * are separate keys end-to-end and never blended by this layer;
 * withheld small cells keep their withheld state + reason and never
 * surface a value; a state with no published records is labelled
 * as such, never zero; every read carries its engine's coverage
 * statement verbatim from the artifact.
 */

export const GEO_DATASET = "geo-aggregates";
export const DEFAULT_GEO_VERSION = "2026-10-06+2026-02-09+2022-2024+2026-10-refresh";

export const GEO_ENGINES = ["grants", "contracts", "medicare", "medicaid", "care"] as const;
export type GeoEngine = (typeof GEO_ENGINES)[number];

export interface GeoConfig {
  root: string;
  version: string;
  isHttp: boolean;
}

export function geoConfig(
  env: Record<string, string | undefined> = process.env,
): GeoConfig | null {
  const root = env.FRAUD_RADAR_GEO_ARTIFACT_ROOT?.trim().replace(/\/+$/, "");
  if (!root) return null;
  return {
    root,
    version: env.FRAUD_RADAR_GEO_VERSION?.trim() || DEFAULT_GEO_VERSION,
    isHttp: /^https?:\/\//i.test(root),
  };
}

export type GeoLoader = (relPath: string) => Promise<unknown | null>;

export function createGeoLoader(config: GeoConfig): GeoLoader {
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

let defaultLoader: GeoLoader | null = null;
export function getGeoLoader(): GeoLoader | null {
  const config = geoConfig();
  if (!config) return null;
  if (!defaultLoader) defaultLoader = createGeoLoader(config);
  return defaultLoader;
}

// ---------------------------------------------------------------------------

export interface GeoStateCell {
  stateCode: string;
  stateName: string;
  territory: boolean;
  attribution: string; // attributed | no_published_records | withheld_small_cell
  hasPublishedRecords: boolean;
  withheld?: boolean;
  withheldReason?: string;
  /** Measure values as published (keys vary by layer); a withheld
   *  cell carries NO numeric values — the publisher replaces them
   *  with banded strings, which this layer never converts back. */
  values: Record<string, number | string>;
}

export interface GeoLayer {
  layer: string;
  engine: GeoEngine;
  geographyField: string;
  semantics: string;
  sourceDataset: string;
  sourceVersion: string;
  measures: string[];
  coverageStatement: string;
  reconciliation: unknown;
  states: GeoStateCell[];
}

interface RawStateFile {
  engine?: string;
  coverageStatement?: string;
  layers?: Record<string, Record<string, unknown>>;
}

export function decodeGeoLayer(
  engine: GeoEngine,
  layerName: string,
  raw: RawStateFile,
): GeoLayer | null {
  const l = raw.layers?.[layerName];
  if (!l) return null;
  const states = ((l.states as Record<string, unknown>[]) ?? []).map((s) => {
    const { stateCode, stateName, territory, attribution, hasPublishedRecords, withheld, withheldReason, ...rest } =
      s as Record<string, unknown>;
    const values: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (typeof v === "number" || typeof v === "string") values[k] = v;
    }
    return {
      stateCode: String(stateCode),
      stateName: String(stateName),
      territory: territory === true,
      attribution: String(attribution ?? "attributed"),
      hasPublishedRecords: hasPublishedRecords === true,
      ...(withheld === true ? { withheld: true } : {}),
      ...(typeof withheldReason === "string" ? { withheldReason } : {}),
      values,
    };
  });
  return {
    layer: layerName,
    engine,
    geographyField: String(l.geographyField ?? ""),
    semantics: String(l.semantics ?? ""),
    sourceDataset: String(l.sourceDataset ?? ""),
    sourceVersion: String(l.sourceVersion ?? ""),
    measures: (l.measures as string[]) ?? [],
    coverageStatement: raw.coverageStatement ?? "",
    reconciliation: l.reconciliation ?? null,
    states,
  };
}

export async function getGeoLayer(
  engine: string,
  layer: string,
  loader: GeoLoader | null = getGeoLoader(),
): Promise<GeoLayer | null> {
  if (!loader || !(GEO_ENGINES as readonly string[]).includes(engine)) return null;
  const raw = (await loader(`states/${engine}.json`)) as RawStateFile | null;
  if (!raw) return null;
  return decodeGeoLayer(engine as GeoEngine, layer, raw);
}

export async function listGeoLayers(
  engine: string,
  loader: GeoLoader | null = getGeoLoader(),
): Promise<{ layers: string[]; coverageStatement: string } | null> {
  if (!loader || !(GEO_ENGINES as readonly string[]).includes(engine)) return null;
  const raw = (await loader(`states/${engine}.json`)) as RawStateFile | null;
  if (!raw?.layers) return null;
  return {
    layers: Object.keys(raw.layers),
    coverageStatement: raw.coverageStatement ?? "",
  };
}

export interface GeoCountyLayer {
  layer: string;
  cells: { countyName: string; values: Record<string, number | string> }[];
  countyNotReported: Record<string, number | string> | null;
}

export async function getGeoCounties(
  stateCode: string,
  loader: GeoLoader | null = getGeoLoader(),
): Promise<{ stateCode: string; stateName: string; note: string; layers: GeoCountyLayer[] } | null> {
  if (!loader) return null;
  const st = stateCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(st)) return null;
  const raw = (await loader(`counties/${st}.json`)) as {
    stateName?: string;
    note?: string;
    layers?: Record<string, { cells?: Record<string, unknown>[]; countyNotReported?: Record<string, unknown> | null }>;
  } | null;
  if (!raw?.layers) return null;
  const layers: GeoCountyLayer[] = Object.entries(raw.layers).map(([name, l]) => ({
    layer: name,
    cells: (l.cells ?? []).map((c) => {
      const { countyName, ...rest } = c as Record<string, unknown>;
      const values: Record<string, number | string> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (typeof v === "number" || typeof v === "string") values[k] = v;
      }
      return { countyName: String(countyName ?? ""), values };
    }),
    countyNotReported: (l.countyNotReported as Record<string, number | string>) ?? null,
  }));
  return { stateCode: st, stateName: String(raw.stateName ?? st), note: String(raw.note ?? ""), layers };
}

export async function getGeoDatasetMeta(
  loader: GeoLoader | null = getGeoLoader(),
): Promise<{ version: string; coverageStatements: Record<string, string> } | null> {
  if (!loader) return null;
  const raw = (await loader("dataset.json")) as {
    coverageStatements?: Record<string, string>;
  } | null;
  if (!raw) return null;
  return {
    version: geoConfig()?.version ?? DEFAULT_GEO_VERSION,
    coverageStatements: raw.coverageStatements ?? {},
  };
}
