/**
 * Bird's-Eye View wiring contract.
 *
 * The satellite card's BIRD'S-EYE VIEW button, the OsirisMap engage /
 * drive / exit machinery and the page's programmatic satellite-view
 * setter are connected by props and refs alone — nothing else
 * type-checks that the button reaches the camera, that the drive reads
 * the same interpolated rows the markers draw, or that the basemap
 * borrow never persists over the visitor's stored choice. These pins
 * extract the wiring mechanically from the sources, in the style of
 * lib/flights/cockpit-wiring.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');
const osirisMap = read('src', 'components', 'OsirisMap.tsx');
const card = read('src', 'components', 'SatelliteCard.tsx');
const dashboard = read('src', 'components', 'Dashboard.tsx');

describe("satellite bird's-eye wiring — the card", () => {
  it("carries a bird's-eye action that toggles with the active state", () => {
    expect(card).toContain('onBirdsEye');
    expect(card).toContain("BIRD'S-EYE VIEW");
    expect(card).toContain("EXIT BIRD'S-EYE VIEW");
    expect(card).toContain('birdsEyeActive');
  });
});

describe("satellite bird's-eye wiring — engage, drive, exit", () => {
  it('engages from the selected satellite at the layer ceiling, pitched', () => {
    expect(osirisMap).toContain('const engageBirdsEye = useCallback(');
    expect(osirisMap).toContain('BIRDSEYE_ZOOM');
    expect(osirisMap).toContain('BIRDSEYE_PITCH');
    expect(osirisMap).toContain("acquireSatelliteView('birdseye')");
  });

  it('drives off the same interpolated rows the markers draw', () => {
    expect(osirisMap).toContain('satAppliedRef.current.find(');
    expect(osirisMap).toContain('unwrapLngNear(');
  });

  it('exits by restoring the saved camera and releasing the basemap hold', () => {
    expect(osirisMap).toContain('const exitBirdsEye = useCallback(');
    expect(osirisMap).toContain("releaseSatelliteView('birdseye')");
    expect(osirisMap).toContain('be.savedCamera');
  });

  it('shows the honesty banner for as long as the view is active', () => {
    expect(osirisMap).toContain('birdsEyeLabel(birdsEyeUi.name)');
    expect(osirisMap).toContain('Exit bird\'s-eye view');
  });
});

describe("satellite bird's-eye wiring — the basemap borrow", () => {
  it('OsirisMap takes a programmatic setter beside the persisting switch', () => {
    expect(osirisMap).toContain('onSatelliteViewChange?: (on: boolean) => void;');
    expect(osirisMap).toContain('acquireSatelliteView');
    expect(osirisMap).toContain('releaseSatelliteView');
  });

  it('the page wires it as a bare state set (no storage write on this path)', () => {
    expect(dashboard).toContain('onSatelliteViewChange={(on: boolean) => setMapStyle(');
  });
});
