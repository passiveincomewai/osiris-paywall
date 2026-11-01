import { describe, expect, it } from 'vitest';
import { SAT_MAX_ZOOM } from './satellite-layer';
import { BIRDSEYE_COMPACT_HONESTY, BIRDSEYE_PITCH, BIRDSEYE_ZOOM, birdsEyeLabel, unwrapLngNear } from './satellite-birdseye';

describe("satellite bird's-eye view", () => {
  it('rides at the satellite layer ceiling — any higher and the satellite stops drawing', () => {
    expect(BIRDSEYE_ZOOM).toBe(SAT_MAX_ZOOM);
  });

  it('pitches under the terrain manager cap', () => {
    expect(BIRDSEYE_PITCH).toBeGreaterThan(0);
    expect(BIRDSEYE_PITCH).toBeLessThan(60);
  });

  it('labels the view honestly: named satellite, dated reference imagery, not a live feed', () => {
    const label = birdsEyeLabel('ISS (ZARYA)');
    expect(label).toContain('ISS (ZARYA)');
    expect(label).toContain('REFERENCE SATELLITE IMAGERY (DATED)');
    expect(label).toContain('NOT A LIVE FEED');
    expect(label).not.toContain('LIVE FEED FROM');
  });

  it('keeps the honesty statement in the compact bar wording', () => {
    expect(BIRDSEYE_COMPACT_HONESTY).toContain('DATED');
    expect(BIRDSEYE_COMPACT_HONESTY).toContain('NOT A LIVE FEED');
    expect(BIRDSEYE_COMPACT_HONESTY).not.toContain('LIVE FEED FROM');
    // Bar width: the compact form must actually be shorter than the banner.
    expect(BIRDSEYE_COMPACT_HONESTY.length).toBeLessThan(birdsEyeLabel('ISS (ZARYA)').length);
  });

  it('unwraps longitude the short way across the antimeridian', () => {
    expect(unwrapLngNear(-179.9, 179.9)).toBeCloseTo(180.1);
    expect(unwrapLngNear(179.9, -179.9)).toBeCloseTo(-180.1);
    expect(unwrapLngNear(10, 12)).toBe(10);
    expect(unwrapLngNear(-170, 170)).toBeCloseTo(190);
  });
});
