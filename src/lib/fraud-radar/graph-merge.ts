/**
 * Fraud Radar Phase 10 — graph explorer merge + caps logic
 * (§3.3/§7.3), pure and client-safe (no node imports — the
 * explorer bundle uses this module directly).
 *
 * Depth ≤ 2: the published ego is depth 1; expanding an entity
 * node merges that entity's own ego (depth 2). Rendered caps are
 * hard: ≤ 150 nodes / ≤ 300 edges. A merge that would exceed a
 * cap truncates the EXPANSION (never the centre's depth-1
 * network) and returns a truncation notice — truncation is
 * always announced, never silent (§8.3: never cut the truncation
 * records). Candidate edges stay labelled through every merge
 * and never count toward any total computed here.
 */

export const GRAPH_LEGEND =
  "Lines show relationships recorded in published federal datasets (named on each line). A line is a record, not a finding about anyone. Dashed lines are candidates — constructed linkages that have not been verified.";

export const GRAPH_EMPTY_STATE =
  "No published-record relationships for this entity in the current vintage — this means the published datasets record no awards, subawards, bridges, or shared published addresses for it, not that none exist.";

export const MAX_RENDER_NODES = 150;
export const MAX_RENDER_EDGES = 300;

export interface MergeNode {
  key: string;
  type: string;
  label: string;
  groupSize?: number;
}
export interface MergeEdge {
  type: string;
  from: string;
  to: string;
  dataset: string;
  datasetVersion: string;
  status: "published" | "reported" | "candidate";
  sentence: string | null;
  weight: { field: string; semantics: string; value: number } | null;
}
export interface MergeEgo {
  entityKey: string;
  nodes: MergeNode[];
  edges: MergeEdge[];
}

export function edgeId(e: MergeEdge): string {
  return `${e.type}|${e.from}|${e.to}|${e.dataset}`;
}

export interface MergeResult {
  nodes: MergeNode[];
  edges: MergeEdge[];
  /** Non-null when the expansion was truncated to the caps. */
  truncationNotice: string | null;
}

export function mergeExpansion(
  base: MergeEgo,
  expansion: MergeEgo,
): MergeResult {
  const nodeByKey = new Map<string, MergeNode>();
  for (const n of base.nodes) nodeByKey.set(n.key, n);
  const edgeById = new Map<string, MergeEdge>();
  for (const e of base.edges) edgeById.set(edgeId(e), e);

  let droppedNodes = 0;
  let droppedEdges = 0;
  for (const n of expansion.nodes) {
    if (nodeByKey.has(n.key)) continue;
    if (nodeByKey.size >= MAX_RENDER_NODES) {
      droppedNodes += 1;
      continue;
    }
    nodeByKey.set(n.key, n);
  }
  for (const e of expansion.edges) {
    const id = edgeId(e);
    if (edgeById.has(id)) continue;
    // An edge whose endpoints were truncated away cannot render.
    if (!nodeByKey.has(e.from) || !nodeByKey.has(e.to)) {
      droppedEdges += 1;
      continue;
    }
    if (edgeById.size >= MAX_RENDER_EDGES) {
      droppedEdges += 1;
      continue;
    }
    edgeById.set(id, e);
  }
  const truncationNotice =
    droppedNodes > 0 || droppedEdges > 0
      ? `Expansion truncated at the rendering caps (${MAX_RENDER_NODES} nodes / ${MAX_RENDER_EDGES} edges): ${droppedNodes} node(s) and ${droppedEdges} edge(s) from the expanded network are not shown. The centre network is complete as published.`
      : null;
  return {
    nodes: [...nodeByKey.values()],
    edges: [...edgeById.values()],
    truncationNotice,
  };
}

/** Classification + locality facet types start collapsed (§6.2). */
export const COLLAPSED_TYPES = new Set([
  "aln",
  "agency",
  "naics",
  "psc",
  "locality",
]);

export function collapseFacets(ego: MergeEgo): {
  nodes: MergeNode[];
  edges: MergeEdge[];
  stacks: { type: string; count: number; keys: string[] }[];
} {
  const stacks = new Map<string, string[]>();
  const keptNodes: MergeNode[] = [];
  for (const n of ego.nodes) {
    if (COLLAPSED_TYPES.has(n.type) && n.key !== ego.entityKey) {
      const arr = stacks.get(n.type) ?? [];
      arr.push(n.key);
      stacks.set(n.type, arr);
    } else {
      keptNodes.push(n);
    }
  }
  const collapsedKeys = new Set([...stacks.values()].flat());
  const stackNodes: MergeNode[] = [...stacks.entries()].map(([type, keys]) => ({
    key: `STACK:${type}`,
    type: "stack",
    label: `${type} (${keys.length})`,
  }));
  const edges = ego.edges.filter(
    (e) => !collapsedKeys.has(e.from) && !collapsedKeys.has(e.to),
  );
  return {
    nodes: [...keptNodes, ...stackNodes],
    edges,
    stacks: [...stacks.entries()].map(([type, keys]) => ({
      type,
      count: keys.length,
      keys,
    })),
  };
}
