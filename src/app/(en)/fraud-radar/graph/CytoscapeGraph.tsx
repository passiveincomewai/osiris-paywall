'use client';

import { useEffect, useRef } from 'react';

/**
 * Cytoscape renderer for the published-record explorer (§6.1/§6.2).
 * Cytoscape.js (MIT — licence re-verified at pin time, recorded in
 * RECORD-P10.md) loads lazily inside the effect; the page pays for
 * the library only when the explorer mounts. Layout is
 * deterministic: breadthfirst rooted at the centre entity, so the
 * same published extract renders the same picture on every visit.
 *
 * Visual discipline (§2.5): nodes sized by TYPE, never by degree
 * or dollars; edges solid for published, DASHED for candidate,
 * dotted for reported; neutral slate/blue palette — no heat
 * ramps, no warning iconography.
 */
import type { MergeEdge, MergeNode } from '@/lib/fraud-radar/graph-merge';

const SHAPES: Record<string, string> = {
  entity_uei: 'ellipse',
  entity_ein: 'ellipse',
  entity_npi: 'ellipse',
  entity_name: 'round-rectangle',
  award_assistance: 'rectangle',
  award_contract: 'rectangle',
  aln: 'diamond',
  agency: 'hexagon',
  naics: 'diamond',
  psc: 'diamond',
  locality: 'round-triangle',
  address: 'round-triangle',
  stack: 'round-rectangle',
};

export default function CytoscapeGraph({
  nodes,
  edges,
  centreKey,
  onSelectNode,
  onSelectEdge,
}: {
  nodes: MergeNode[];
  edges: MergeEdge[];
  centreKey: string;
  onSelectNode?: (key: string) => void;
  onSelectEdge?: (id: string) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const cbRef = useRef({ onSelectNode, onSelectEdge });
  useEffect(() => {
    cbRef.current = { onSelectNode, onSelectEdge };
  });

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    let cancelled = false;
    let cy: { destroy: () => void } | null = null;
    import('cytoscape')
      .then((mod) => {
        if (cancelled || !holderRef.current) return;
        const cytoscape = mod.default;
        const elements = [
          ...nodes.map((n) => ({
            data: {
              id: n.key,
              label: n.label,
              type: n.type,
              centre: n.key === centreKey ? 'yes' : 'no',
            },
          })),
          ...edges.map((e, i) => ({
            data: {
              id: `e${i}`,
              source: e.from,
              target: e.to,
              status: e.status,
              etype: e.type,
            },
          })),
        ];
        const instance = cytoscape({
          container: holder,
          elements,
          layout: {
            name: 'breadthfirst',
            roots: [centreKey],
            directed: false,
            padding: 24,
            spacingFactor: 1.1,
          } as never,
          style: [
            {
              selector: 'node',
              style: {
                label: 'data(label)',
                'font-size': 9,
                color: '#cbd5e1',
                'background-color': '#475569',
                shape: 'ellipse',
                width: 26,
                height: 26,
                'text-max-width': '110px',
                'text-wrap': 'ellipsis',
              } as never,
            },
            {
              selector: 'node[centre = "yes"]',
              style: { 'background-color': '#0284c7', width: 36, height: 36 } as never,
            },
            {
              selector: 'edge',
              style: {
                width: 1.4,
                'line-color': '#64748b',
                'target-arrow-shape': 'none',
                'curve-style': 'bezier',
              } as never,
            },
            {
              selector: 'edge[status = "candidate"]',
              style: { 'line-style': 'dashed', 'line-color': '#f59e0b' } as never,
            },
            {
              selector: 'edge[status = "reported"]',
              style: { 'line-style': 'dotted' } as never,
            },
          ],
        });
        // Per-type shapes (data-driven map is not expressible in
        // the static stylesheet for every type, so apply after add).
        instance.nodes().forEach((n) => {
          const t = n.data('type') as string;
          n.style('shape', SHAPES[t] ?? 'ellipse');
        });
        instance.on('tap', 'node', (evt) => {
          cbRef.current.onSelectNode?.(String(evt.target.id()));
        });
        instance.on('tap', 'edge', (evt) => {
          cbRef.current.onSelectEdge?.(String(evt.target.id()));
        });
        cy = instance as unknown as { destroy: () => void };
      })
      .catch(() => {
        /* The text neighbour list below the canvas carries the
           same data — a failed canvas never hides the records. */
      });
    return () => {
      cancelled = true;
      cy?.destroy();
    };
  }, [nodes, edges, centreKey]);

  return (
    <div
      ref={holderRef}
      className="h-[520px] w-full rounded-2xl border border-white/10 bg-white/[0.02]"
      aria-label="Published-record network canvas"
    />
  );
}
