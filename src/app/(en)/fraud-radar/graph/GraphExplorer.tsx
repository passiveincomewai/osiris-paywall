'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  GRAPH_EMPTY_STATE,
  GRAPH_LEGEND,
  collapseFacets,
  edgeId,
  mergeExpansion,
  type MergeEdge,
  type MergeNode,
} from '@/lib/fraud-radar/graph-merge';

const CytoscapeGraph = dynamic(() => import('./CytoscapeGraph'), {
  ssr: false,
});

/**
 * Fraud Radar — ego-network explorer client (§6.2). Depth 1 from
 * the published ego artifact; Expand on an entity node performs
 * the depth-2 merge subject to the 150/300 caps with truncation
 * notices (never silent). Candidate edges render dashed and are
 * labelled CANDIDATE in the inspector and the text list, with the
 * measured linkage sentence from the dataset. The text neighbour
 * list carries the same data as the canvas (screen-reader
 * reachable, printable — §6.2 accessibility contract).
 */

interface EgoPayload {
  entityKey: string;
  entityType: string;
  label: string;
  facets: string[];
  nodes: MergeNode[];
  edges: MergeEdge[];
  annotations: unknown[];
  truncations: { edgeType: string; shown: number; total: number }[];
  sourceVersions: Record<string, string>;
}

interface EgoResponse {
  datasetVersion: string;
  candidateSentence: string | null;
  ego?: EgoPayload;
  error?: string;
}

const ENGINES = ['grants', 'contracts', 'healthcare', 'care', 'fac'];

export default function GraphExplorer({
  initialEngine,
  initialKey,
}: {
  initialEngine?: string;
  initialKey?: string;
}) {
  const [engine, setEngine] = useState(initialEngine ?? 'grants');
  const [keyInput, setKeyInput] = useState(initialKey ?? '');
  const [searchQ, setSearchQ] = useState('');
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [ego, setEgo] = useState<EgoPayload | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [candidateSentence, setCandidateSentence] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [showFacets, setShowFacets] = useState(false);

  const loadEgo = useCallback(
    async (eng: string, key: string): Promise<EgoPayload | null> => {
      const res = await fetch(
        `/api/fraud-radar/graph/ego?engine=${encodeURIComponent(eng)}&key=${encodeURIComponent(key)}`,
      );
      const body = (await res.json()) as EgoResponse;
      if (res.status === 503) {
        setStatus('dataset_not_published');
        return null;
      }
      if (!res.ok || !body.ego) {
        setStatus('empty');
        return null;
      }
      setCandidateSentence(body.candidateSentence);
      return body.ego;
    },
    [],
  );

  const openEntity = useCallback(
    async (eng: string, key: string) => {
      setStatus('loading');
      setNotice(null);
      setExpanded(new Set());
      setSelectedNode(null);
      setSelectedEdge(null);
      const found = await loadEgo(eng, key);
      if (found) {
        setEgo(found);
        setStatus(null);
      }
    },
    [loadEgo],
  );

  useEffect(() => {
    if (!initialEngine || !initialKey) return;
    let live = true;
    (async () => {
      const found = await loadEgo(initialEngine, initialKey);
      if (!live) return;
      if (found) {
        setEgo(found);
        setStatus(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [initialEngine, initialKey, loadEgo]);

  const expand = useCallback(
    async (nodeKey: string) => {
      if (!ego || expanded.has(nodeKey)) return;
      const idPart = nodeKey.split(':').slice(1).join(':');
      const found = await loadEgo(engine, idPart);
      if (!found) {
        setNotice('No published ego extract could be loaded for that entity.');
        return;
      }
      const merged = mergeExpansion(
        { entityKey: ego.entityKey, nodes: ego.nodes, edges: ego.edges },
        { entityKey: found.entityKey, nodes: found.nodes, edges: found.edges },
      );
      setEgo({
        ...ego,
        nodes: merged.nodes,
        edges: merged.edges,
        truncations: [...ego.truncations, ...found.truncations],
      });
      setExpanded((prev) => new Set(prev).add(nodeKey));
      if (merged.truncationNotice) setNotice(merged.truncationNotice);
    },
    [ego, engine, expanded, loadEgo],
  );

  const doSearch = useCallback(async () => {
    setSearchNote(null);
    try {
      const res = await fetch(
        `/api/fraud-radar/graph/search?q=${encodeURIComponent(searchQ)}`,
      );
      const body = (await res.json()) as {
        error?: string;
        results?: { key: string; label: string }[];
      };
      if (body.error === 'index_not_published') {
        setSearchNote(
          'Name/identifier search index is not published yet for this vintage — open an entity by its identifier (UEI, NPI, or EIN) below, or from its profile’s Network section.',
        );
        return;
      }
      if (body.error === 'dataset_not_published') {
        setSearchNote('The graph dataset is not published on this deployment yet.');
        return;
      }
      if (body.results && body.results.length > 0) {
        const first = body.results[0];
        const idPart = first.key.split(':').slice(1).join(':');
        setKeyInput(idPart);
        void openEntity(engine, idPart);
      } else {
        setSearchNote('No published stubs match that search.');
      }
    } catch {
      setSearchNote('Search could not be completed.');
    }
  }, [searchQ, engine, openEntity]);

  const display = useMemo(() => {
    if (!ego) return null;
    if (showFacets) return { nodes: ego.nodes, edges: ego.edges };
    return collapseFacets({ entityKey: ego.entityKey, nodes: ego.nodes, edges: ego.edges });
  }, [ego, showFacets]);

  const edgesByType = useMemo(() => {
    const map = new Map<string, MergeEdge[]>();
    for (const e of ego?.edges ?? []) {
      const arr = map.get(e.type) ?? [];
      arr.push(e);
      map.set(e.type, arr);
    }
    return map;
  }, [ego]);

  const nodeByKey = useMemo(
    () => new Map((ego?.nodes ?? []).map((n) => [n.key, n])),
    [ego],
  );
  const selectedEdgeObj = useMemo(() => {
    if (!ego || selectedEdge == null) return null;
    const idx = Number(selectedEdge.replace(/^e/, ''));
    return display?.edges[idx] ?? null;
  }, [ego, display, selectedEdge]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Search published entities{' '}
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Identifier prefix"
            className="ml-1 rounded bg-white/10 px-2 py-1"
          />
        </label>
        <button
          onClick={() => void doSearch()}
          className="rounded bg-sky-700 px-3 py-1 text-sm hover:bg-sky-600"
        >
          Search
        </button>
        <label className="text-sm">
          Engine{' '}
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            className="ml-1 rounded bg-white/10 px-2 py-1"
          >
            {ENGINES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Identifier (UEI / NPI / EIN){' '}
          <input
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="ml-1 rounded bg-white/10 px-2 py-1"
          />
        </label>
        <button
          onClick={() => void openEntity(engine, keyInput)}
          className="rounded bg-sky-700 px-3 py-1 text-sm hover:bg-sky-600"
        >
          Open published-record network
        </button>
      </div>
      {searchNote && <p className="mt-2 text-sm text-slate-300">{searchNote}</p>}

      <p className="mt-4 text-sm text-slate-300">{GRAPH_LEGEND}</p>

      {status === 'dataset_not_published' && (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
          The graph dataset is not published on this deployment yet —
          no network is shown rather than placeholder data.
        </p>
      )}
      {status === 'empty' && (
        <p className="mt-4 text-sm text-slate-300">{GRAPH_EMPTY_STATE}</p>
      )}
      {status === 'loading' && (
        <p className="mt-4 text-sm text-slate-400">Loading the published extract…</p>
      )}
      {notice && <p className="mt-3 text-sm text-amber-200">{notice}</p>}

      {ego && display && (
        <>
          <h2 className="mt-6 text-xl font-semibold">
            {ego.label} — published-record network
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {ego.entityKey} · facets: {ego.facets.join(', ') || '—'} ·{' '}
            {ego.edges.filter((e) => e.status !== 'candidate').length} published
            edges shown; candidate edges are excluded from every count.
          </p>
          {ego.truncations.length > 0 && (
            <p className="mt-1 text-sm text-slate-400">
              Truncations in the published extract:{' '}
              {ego.truncations
                .map((t) => `${t.edgeType} shows ${t.shown} of ${t.total}`)
                .join('; ')}
              . Full lists are on the entity profile.
            </p>
          )}
          <label className="mt-2 block text-sm">
            <input
              type="checkbox"
              checked={showFacets}
              onChange={(e) => setShowFacets(e.target.checked)}
              className="mr-2"
            />
            Show classification &amp; locality nodes (collapsed by default)
          </label>
          <div className="mt-3">
            <CytoscapeGraph
              nodes={display.nodes}
              edges={display.edges}
              centreKey={ego.entityKey}
              onSelectNode={setSelectedNode}
              onSelectEdge={setSelectedEdge}
            />
          </div>

          {selectedNode && nodeByKey.get(selectedNode) && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p>
                <strong>{nodeByKey.get(selectedNode)!.label}</strong> (
                {nodeByKey.get(selectedNode)!.type}) — {selectedNode}
              </p>
              {(selectedNode.startsWith('UEI:') ||
                selectedNode.startsWith('NPI:') ||
                selectedNode.startsWith('EIN:')) &&
                selectedNode !== ego.entityKey &&
                !expanded.has(selectedNode) && (
                  <button
                    onClick={() => void expand(selectedNode)}
                    className="mt-2 rounded bg-sky-700 px-3 py-1 hover:bg-sky-600"
                  >
                    Expand this entity (depth 2)
                  </button>
                )}
              {selectedNode === ego.entityKey && ego.annotations.length > 0 && (
                <p className="mt-2 text-slate-300">
                  This entity carries {ego.annotations.length} published
                  research-lead/screening annotation(s) — see its profile’s
                  research-signals section for the full provenance blocks.
                  Annotations are never drawn as lines.
                </p>
              )}
            </div>
          )}

          {selectedEdgeObj && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p>
                <strong>{selectedEdgeObj.type}</strong> —{' '}
                {selectedEdgeObj.status === 'candidate' ? (
                  <span className="text-amber-300">
                    CANDIDATE. {candidateSentence ?? selectedEdgeObj.sentence}
                  </span>
                ) : (
                  selectedEdgeObj.sentence
                )}
              </p>
              <p className="mt-1 text-slate-400">
                Dataset: {selectedEdgeObj.dataset} ({selectedEdgeObj.datasetVersion})
                {selectedEdgeObj.weight &&
                  ` · ${selectedEdgeObj.weight.field}: ${selectedEdgeObj.weight.value.toLocaleString('en-US')} (${selectedEdgeObj.weight.semantics})`}
              </p>
            </div>
          )}

          <section className="mt-8" aria-label="Text neighbour list">
            <h3 className="text-lg font-semibold">
              Neighbours (text form — the same published records)
            </h3>
            {[...edgesByType.entries()].map(([type, edges]) => (
              <div key={type} className="mt-3">
                <h4 className="text-sm font-semibold text-slate-300">{type}</h4>
                <ul className="mt-1 space-y-1 text-sm text-slate-300">
                  {edges.map((e) => {
                    const other =
                      e.from === ego.entityKey ? e.to : e.from;
                    const n = nodeByKey.get(other);
                    return (
                      <li key={edgeId(e)}>
                        {n?.label ?? other}{' '}
                        <span className="text-slate-500">
                          [{e.dataset} {e.datasetVersion}]
                        </span>
                        {e.status === 'candidate' && (
                          <span className="text-amber-300">
                            {' '}
                            CANDIDATE — constructed linkage, not verified.
                          </span>
                        )}
                        {e.status === 'reported' && (
                          <span className="text-slate-400"> (as reported)</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
