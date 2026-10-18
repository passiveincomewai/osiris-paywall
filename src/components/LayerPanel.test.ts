import { describe, it, expect } from 'vitest';
import { layerShownActive } from './LayerPanel';

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
