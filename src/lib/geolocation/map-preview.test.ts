import { describe, it, expect } from 'vitest';
import {
  bboxAround,
  metersPerPixel,
  nearestCameras,
  radiusToPixels,
  tileGrid,
  tileX,
  tileY,
  zoomForRadius,
} from './map-preview';

describe('slippy tile math', () => {
  it('puts lng 0 / lat 0 at the centre tile of a z1 world', () => {
    expect(tileX(0, 1)).toBe(1);
    expect(tileY(0, 1)).toBe(1);
    expect(tileX(-180, 3)).toBe(0);
    expect(tileX(180, 3)).toBe(8);
  });

  it('matches the known metres-per-pixel at the equator', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(156543.03392, 3);
    expect(metersPerPixel(0, 10)).toBeCloseTo(156543.03392 / 1024, 3);
  });

  it('zoomForRadius frames the circle at the requested fill', () => {
    const z = zoomForRadius(250, 48.8584, 480);
    const diameter = radiusToPixels(250, 48.8584, z);
    // The chosen zoom is the tightest integer zoom whose circle still
    // fits the fill fraction, so the diameter lands just under/at it
    // and the next zoom up would overflow.
    expect(diameter).toBeLessThanOrEqual(480 * 0.78 * 1.05);
    expect(radiusToPixels(250, 48.8584, z + 1)).toBeGreaterThan(480 * 0.78 * 0.95);
  });

  it('tileGrid covers the container and centres the point', () => {
    const grid = tileGrid(48.8584, 2.2945, 15, 640, 360);
    expect(grid.tiles.length).toBeGreaterThanOrEqual(6);
    for (const t of grid.tiles) {
      expect(t.url).toContain('server.arcgisonline.com');
      expect(t.url).toContain('/15/');
    }
    expect(Math.abs(grid.centerPx.x - 320)).toBeLessThanOrEqual(1);
    expect(Math.abs(grid.centerPx.y - 180)).toBeLessThanOrEqual(1);
    // Tiles must actually cover the centre pixel.
    const cover = grid.tiles.some(
      t => grid.centerPx.x >= t.left && grid.centerPx.x < t.left + 256 &&
           grid.centerPx.y >= t.top && grid.centerPx.y < t.top + 256,
    );
    expect(cover).toBe(true);
  });
});

describe('bboxAround / nearestCameras', () => {
  it('builds a sane bbox', () => {
    const bb = bboxAround(48.8584, 2.2945, 25);
    expect(bb.south).toBeLessThan(48.8584);
    expect(bb.north).toBeGreaterThan(48.8584);
    expect(bb.west).toBeLessThan(2.2945);
    expect(bb.east).toBeGreaterThan(2.2945);
  });

  it('returns real catalogue records nearest-first, inside the radius only', () => {
    const cams = [
      { id: 'far', name: 'Far', lat: 49.5, lng: 3.0 },
      { id: 'near', name: 'Near', lat: 48.86, lng: 2.296 },
      { id: 'mid', name: 'Mid', lat: 48.9, lng: 2.35 },
      { id: 'broken', name: 'No coords' },
    ] as Array<Record<string, unknown>>;
    const found = nearestCameras(cams, 48.8584, 2.2945, 6, 25);
    expect(found.map(c => c.id)).toEqual(['near', 'mid']);
    expect(found[0].distanceKm).toBeLessThan(found[1].distanceKm);
  });
});
