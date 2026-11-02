/**
 * Fraud Radar Phase 10 — geo Neon grain reads (PHASE10 §6.6).
 * Neon holds state cells + per-layer national summaries only;
 * artifacts hold the full layer/county trees. Fail-soft like
 * grants-neon.ts: absent table/rows ⇒ null, never a 500.
 * Withheld small cells arrive with attributionState
 * "withheld_small_cell" and NULL value/entity counts — preserved
 * as null here, never converted to zero (§5.3).
 */
import { db } from "@/lib/db";
import { DEFAULT_GEO_VERSION } from "./geo-data";

export interface GeoStateRow {
  engine: string;
  layer: string;
  geographyField: string;
  stateCode: string;
  stateName: string;
  attributionState: string;
  entityCount: number | null;
  awardCount: number | null;
  value: number | null;
  values: Record<string, number | string>;
}

export async function listGeoStates(
  engine: string,
  layer: string,
  version: string = DEFAULT_GEO_VERSION,
): Promise<GeoStateRow[] | null> {
  try {
    const rows = await db.frGeoStateSummary.findMany({
      where: { datasetVersion: version, engine, layer },
      orderBy: { stateCode: "asc" },
    });
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      engine: r.engine,
      layer: r.layer,
      geographyField: r.geographyField,
      stateCode: r.stateCode,
      stateName: r.stateName,
      attributionState: r.attributionState,
      entityCount: r.entityCount,
      awardCount: r.awardCount == null ? null : Number(r.awardCount),
      value: r.value == null ? null : Number(r.value),
      values: (r.values as Record<string, number | string>) ?? {},
    }));
  } catch {
    return null;
  }
}

export interface GeoYearlyRow {
  engine: string;
  layer: string;
  geographyField: string;
  national: Record<string, number>;
  unknown: Record<string, number>;
  coverageStatement: string;
}

export async function getGeoYearly(
  engine: string,
  layer: string,
  version: string = DEFAULT_GEO_VERSION,
): Promise<GeoYearlyRow | null> {
  try {
    const r = await db.frGeoYearlySummary.findUnique({
      where: {
        datasetVersion_engine_layer: { datasetVersion: version, engine, layer },
      },
    });
    if (!r) return null;
    return {
      engine: r.engine,
      layer: r.layer,
      geographyField: r.geographyField,
      national: (r.national as Record<string, number>) ?? {},
      unknown: (r.unknown as Record<string, number>) ?? {},
      coverageStatement: r.coverageStatement,
    };
  } catch {
    return null;
  }
}
