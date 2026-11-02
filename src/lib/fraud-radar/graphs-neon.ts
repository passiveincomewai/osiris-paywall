/**
 * Fraud Radar Phase 10 — graph Neon grain reads (PHASE10 §6.6).
 * Neon holds ONE summary row per composite graph vintage (entity /
 * node / edge totals + the candidate count and measured linkage
 * rates). No per-entity or per-edge rows live in Neon, ever (§3.2).
 * Fail-soft like grants-neon.ts: absent table/rows ⇒ null (an
 * honest "not loaded yet" state), never a 500.
 */
import { db } from "@/lib/db";
import { DEFAULT_GRAPHS_VERSION } from "./graphs-data";

export interface GraphSummaryRow {
  datasetVersion: string;
  graphCatalogVersion: string;
  entitiesTotal: number;
  entitiesUei: number;
  entitiesEin: number;
  entitiesNpi: number;
  nodesTotal: number;
  edgesExcludingCandidates: number;
  candidateEdges: number;
  annotations: number;
  truncations: number;
  candidateMatchRatePct: number | null;
  candidateAsDesignedRatePct: number | null;
}

export async function getGraphSummary(
  version: string = DEFAULT_GRAPHS_VERSION,
): Promise<GraphSummaryRow | null> {
  try {
    const r = await db.frGraphYearlySummary.findUnique({
      where: { datasetVersion: version },
    });
    if (!r) return null;
    return {
      datasetVersion: r.datasetVersion,
      graphCatalogVersion: r.graphCatalogVersion,
      entitiesTotal: Number(r.entitiesTotal),
      entitiesUei: r.entitiesUei,
      entitiesEin: r.entitiesEin,
      entitiesNpi: r.entitiesNpi,
      nodesTotal: Number(r.nodesTotal),
      edgesExcludingCandidates: Number(r.edgesExcludingCandidates),
      candidateEdges: Number(r.candidateEdges),
      annotations: Number(r.annotations),
      truncations: Number(r.truncations),
      candidateMatchRatePct:
        r.candidateMatchRatePct == null ? null : Number(r.candidateMatchRatePct),
      candidateAsDesignedRatePct:
        r.candidateAsDesignedRatePct == null
          ? null
          : Number(r.candidateAsDesignedRatePct),
    };
  } catch {
    return null;
  }
}
