import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Transit redesign contract (2026-10-26): enabling the Live Transit
 * layer must activate map layers ONLY — the old design mounted the
 * large floating TransitNetworkPanel the moment the layer turned on,
 * covering the globe (worst on mobile). These pins keep the new
 * shape from regressing:
 *  - the floating panel component is gone and unreferenced;
 *  - the Explorer renders only behind its explicit open state, and
 *    the only ways in are the Layers action (window event) and the
 *    selection card / Explorer's own callbacks — never the layer
 *    toggle;
 *  - the selection card renders only behind a map tap selection;
 *  - Layers carries the six subdivision toggles + the two actions.
 * Behavioural semantics of the toggles themselves are pinned in
 * lib/transit/subdivisions.test.ts; Explorer data mapping in
 * lib/transit/explorer.test.ts.
 */

const src = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');
const osirisMap = src('components/OsirisMap.tsx');
const layerPanel = src('components/LayerPanel.tsx');

describe('transit redesign contract', () => {
  it('the floating TransitNetworkPanel is deleted and unreferenced', () => {
    expect(existsSync(join(process.cwd(), 'src/components/TransitNetworkPanel.tsx'))).toBe(false);
    expect(osirisMap).not.toContain('TransitNetworkPanel');
  });

  it('enabling the transit layer mounts neither the Explorer nor a panel', () => {
    // The old auto-open shape: a layer-flag-gated mount of a transit UI.
    expect(osirisMap).not.toMatch(/\(activeLayers as any\)\.transit && \(\s*<Transit/);
    // The Explorer mounts only behind its own open state.
    expect(osirisMap).toMatch(/\{transitExplorer && \(\s*<TransitExplorer/);
    // …and the selection card only behind an actual map selection.
    expect(osirisMap).toMatch(/\{mapReady && transitSel && \(\s*<TransitSelectionCard/);
  });

  it('the Explorer opens through the Layers window event, not a layer effect', () => {
    expect(osirisMap).toContain("window.addEventListener('we:open-transit-explorer'");
    expect(layerPanel).toContain("new CustomEvent('we:open-transit-explorer'");
  });

  it('Layers carries the six subdivision toggles bound to the subdivision keys', () => {
    for (const key of ['vehicles', 'busRoutes', 'railRoutes', 'stops', 'alerts', 'labels']) {
      expect(layerPanel).toContain(`TRANSIT_SUB.${key}`);
    }
    expect(layerPanel).toContain('LIVE TRANSIT NETWORK');
    expect(layerPanel).toContain('EXPLORE TRANSIT NETWORK');
    expect(layerPanel).toContain("new CustomEvent('we:transit-nearby')");
  });

  it('the globe answers Show Nearby Transit and reports back to Layers', () => {
    expect(osirisMap).toContain("window.addEventListener('we:transit-nearby'");
    expect(osirisMap).toContain('we:transit-nearby-result');
    expect(layerPanel).toContain("addEventListener('we:transit-nearby-result'");
  });
});
