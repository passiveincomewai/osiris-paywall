import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { layerShownActive, layerLocked, groupTogglePatch, premiumLayerLabels, LAYER_GROUPS } from './LayerPanel';
import LayerPanel from './LayerPanel';

const traffic = { key: 'traffic' };
const vehicles = { key: 'traffic_vehicles', parent: 'traffic' };
const previews = { key: 'cctv_previews', parent: 'cctv' };

describe('layerShownActive', () => {
  it('shows a top-level layer exactly as stored', () => {
    expect(layerShownActive(traffic, { traffic: true })).toBe(true);
    expect(layerShownActive(traffic, { traffic: false })).toBe(false);
    expect(layerShownActive(traffic, {})).toBe(false);
  });

  it('shows a sub-layer on when it and its parent are both on', () => {
    expect(layerShownActive(vehicles, { traffic: true, traffic_vehicles: true })).toBe(true);
    expect(layerShownActive(previews, { cctv: true, cctv_previews: true })).toBe(true);
  });

  it('shows a sub-layer OFF while its parent is off, whatever is stored', () => {
    // The bug: stored-on sub-layers rendered ON under an off parent, reading
    // as a running feature while nothing rendered.
    expect(layerShownActive(vehicles, { traffic: false, traffic_vehicles: true })).toBe(false);
    expect(layerShownActive(vehicles, { traffic_vehicles: true })).toBe(false);
    expect(layerShownActive(previews, { cctv_previews: true })).toBe(false);
  });

  it('shows a stored-off sub-layer off even with the parent on', () => {
    expect(layerShownActive(vehicles, { traffic: true, traffic_vehicles: false })).toBe(false);
    expect(layerShownActive(vehicles, { traffic: true })).toBe(false);
  });

  it('is generic across parent/sub pairs and tolerates missing state', () => {
    expect(layerShownActive(vehicles, undefined)).toBe(false);
    expect(layerShownActive(vehicles, null)).toBe(false);
    expect(layerShownActive(traffic, undefined)).toBe(false);
  });
});

describe('layerLocked', () => {
  it('locks a premium layer for a free viewer only', () => {
    expect(layerLocked({ premium: true }, false)).toBe(true);
    expect(layerLocked({ premium: true }, true)).toBe(false);
  });

  it('never locks a free layer', () => {
    expect(layerLocked({}, false)).toBe(false);
    expect(layerLocked({ premium: false }, false)).toBe(false);
    expect(layerLocked({}, true)).toBe(false);
  });
});

describe('traffic is a premium layer group', () => {
  const byKey = new Map(LAYER_GROUPS.flatMap((g) => g.layers.map((l) => [l.key, l] as const)));

  it('marks the traffic parent and both sub-layers premium', () => {
    expect(byKey.get('traffic')?.premium).toBe(true);
    expect(byKey.get('traffic_vehicles')?.premium).toBe(true);
    expect(byKey.get('traffic_vehicles')?.parent).toBe('traffic');
    expect(byKey.get('traffic_congestion')?.premium).toBe(true);
    expect(byKey.get('traffic_congestion')?.parent).toBe('traffic');
  });

  it('keeps its free neighbours free (transit, bike share)', () => {
    expect(byKey.get('transit')?.premium).toBeUndefined();
    expect(byKey.get('gbfs')?.premium).toBeUndefined();
  });
});

describe('groupTogglePatch', () => {
  const group = [
    { key: 'transit' },
    { key: 'traffic', premium: true },
    { key: 'traffic_vehicles', premium: true, parent: 'traffic' },
  ];

  it('switching a group ON skips layers locked for a free viewer', () => {
    const patch = groupTogglePatch(group, {}, false);
    expect(patch).toEqual({ transit: true });
  });

  it('switching a group ON includes premium layers for a subscriber', () => {
    const patch = groupTogglePatch(group, {}, true);
    expect(patch).toEqual({ transit: true, traffic: true, traffic_vehicles: true });
  });

  it('switching a group OFF turns everything off, locked or not', () => {
    const patch = groupTogglePatch(group, { traffic: true }, false);
    expect(patch).toEqual({ transit: false, traffic: false, traffic_vehicles: false });
  });
});

describe('the intel section is gone from the panel (owner order, 2026-10-20)', () => {
  it('no group is an intel group any more', () => {
    for (const g of LAYER_GROUPS) {
      expect(g.label).not.toMatch(/INTEL|THREAT|NETWORK/);
      expect(g.fullLabel).not.toMatch(/INTEL/);
    }
  });

  it('none of the intel layer keys render in the panel', () => {
    const keys = LAYER_GROUPS.flatMap((g) => g.layers.map((l) => l.key));
    for (const k of [
      'infrastructure', 'global_incidents', 'alert_pins', 'gdelt_events',
      'malware', 'cyber_attacks', 'cf_outages', 'cf_attacks',
    ]) {
      expect(keys).not.toContain(k);
    }
  });

  it('the remaining groups are untouched', () => {
    expect(LAYER_GROUPS.map((g) => g.label)).toEqual([
      'SDK', 'AVIATION', 'MARITIME', 'SPACE', 'SURVEIL', 'HAZARD', 'TRANSIT', 'DISPLAY',
    ]);
  });
});

describe('premiumLayerLabels — what the upgrade embed pitches', () => {
  it('lists exactly the top-level premium layers the panel locks', () => {
    expect(premiumLayerLabels()).toEqual([
      'Maritime Lines',
      'Maritime / Naval',
      'Live News Feeds',
      'Traffic',
    ]);
  });
});

describe('the Pro upgrade embed in the panel', () => {
  const renderMobile = (isPremiumUser: boolean) =>
    renderToString(
      createElement(LayerPanel, {
        data: {},
        activeLayers: {},
        setActiveLayers: () => {},
        isMobile: true,
        isPremiumUser,
      }),
    ).replace(/<!-- -->/g, '');

  it('shows for a free viewer, in the intel groups’ old slot (after Hazards)', () => {
    const html = renderMobile(false);
    expect(html).toContain('data-pro-upgrade-embed');
    expect(html).toContain('NATURAL HAZARDS');
    expect(html.indexOf('NATURAL HAZARDS')).toBeLessThan(html.indexOf('data-pro-upgrade-embed'));
    expect(html).not.toContain('THREATS &amp; INTEL');
    expect(html).not.toContain('NETWORK INTEL');
  });

  it('never shows for a Pro user', () => {
    const html = renderMobile(true);
    expect(html).not.toContain('data-pro-upgrade-embed');
  });
});
