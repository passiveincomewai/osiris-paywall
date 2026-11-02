import { describe, it, expect } from 'vitest';
import {
  collapseFacets,
  edgeId,
  mergeExpansion,
  MAX_RENDER_EDGES,
  MAX_RENDER_NODES,
  type MergeEgo,
} from './graph-merge';

/**
 * §3.3/§7.3 caps pins: merges never exceed 150/300, truncation is
 * always announced, the centre network is never truncated away,
 * and candidate edges survive merges still labelled.
 */
const node = (key: string, type = 'entity_uei') => ({ key, type, label: key });
const edge = (from: string, to: string, status: 'published' | 'candidate' = 'published') => ({
  type: 'recipient_of_award',
  from,
  to,
  dataset: 'grants-aggregates',
  datasetVersion: '2026-10-06',
  status,
  sentence: null,
  weight: null,
});

describe('mergeExpansion', () => {
  it('unions nodes/edges and dedupes by key/id', () => {
    const base: MergeEgo = {
      entityKey: 'UEI:A',
      nodes: [node('UEI:A'), node('AWD:1', 'award_assistance')],
      edges: [edge('UEI:A', 'AWD:1')],
    };
    const exp: MergeEgo = {
      entityKey: 'UEI:B',
      nodes: [node('UEI:B'), node('AWD:1', 'award_assistance')],
      edges: [edge('UEI:A', 'AWD:1'), edge('UEI:B', 'AWD:1', 'candidate')],
    };
    const r = mergeExpansion(base, exp);
    expect(r.nodes).toHaveLength(3);
    expect(r.edges).toHaveLength(2);
    expect(r.truncationNotice).toBeNull();
    expect(r.edges.find((e) => e.status === 'candidate')).toBeTruthy();
  });

  it('truncates the expansion at the caps and announces it', () => {
    const base: MergeEgo = {
      entityKey: 'UEI:A',
      nodes: [node('UEI:A')],
      edges: [],
    };
    const many: MergeEgo = {
      entityKey: 'UEI:B',
      nodes: Array.from({ length: 400 }, (_, i) => node(`UEI:N${i}`)),
      edges: Array.from({ length: 400 }, (_, i) => edge('UEI:A', `UEI:N${i}`)),
    };
    const r = mergeExpansion(base, many);
    expect(r.nodes.length).toBeLessThanOrEqual(MAX_RENDER_NODES);
    expect(r.edges.length).toBeLessThanOrEqual(MAX_RENDER_EDGES);
    expect(r.truncationNotice).toContain('truncated');
    expect(r.nodes[0].key).toBe('UEI:A');
  });

  it('edgeId distinguishes datasets for the same pair', () => {
    const a = edge('UEI:A', 'AWD:1');
    const b = { ...a, dataset: 'fac' };
    expect(edgeId(a)).not.toBe(edgeId(b));
  });
});

describe('collapseFacets', () => {
  it('collapses classification nodes into stack nodes by default', () => {
    const ego: MergeEgo = {
      entityKey: 'UEI:A',
      nodes: [
        node('UEI:A'),
        node('ALN:93.778', 'aln'),
        node('ALN:10.001', 'aln'),
        node('AWD:1', 'award_assistance'),
      ],
      edges: [edge('UEI:A', 'AWD:1')],
    };
    const r = collapseFacets(ego);
    expect(r.stacks).toEqual([{ type: 'aln', count: 2, keys: ['ALN:93.778', 'ALN:10.001'] }]);
    expect(r.nodes.map((n) => n.key)).toContain('STACK:aln');
    expect(r.nodes.map((n) => n.key)).not.toContain('ALN:93.778');
  });
});
