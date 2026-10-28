/**
 * Cockpit View wiring contract for OsirisMap.
 *
 * The flight popup has two distinct engage buttons: FOLLOW AIRCRAFT —
 * CHASE CAMERA (the original toggle, __weFlightFollowToggle, two-arg,
 * chase default) and COCKPIT VIEW, which must engage follow DIRECTLY
 * in 'forward' mode via the sibling bridge __weFlightCockpitView —
 * including when follow is already riding that aircraft in another
 * mode, where it must switch the mode rather than re-engage or stop.
 *
 * These pins extract the wiring mechanically from the component
 * source, in the style of click-wiring.test.ts, so a refactor that
 * drops the cockpit button, merges it back into the chase toggle, or
 * loses the mode threading fails here instead of silently shipping a
 * dead button (the popup is string-built HTML with window bridges —
 * nothing else type-checks the connection).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const osirisMap = readFileSync(
  join(process.cwd(), 'src', 'components', 'OsirisMap.tsx'),
  'utf8',
);

/** Slice of source between two anchors (start inclusive, end exclusive). */
function block(startAnchor: string, endAnchor: string): string {
  const a = osirisMap.indexOf(startAnchor);
  const b = osirisMap.indexOf(endAnchor, a + startAnchor.length);
  expect(a, `anchor missing: ${startAnchor}`).toBeGreaterThan(-1);
  expect(b, `anchor missing: ${endAnchor}`).toBeGreaterThan(a);
  return osirisMap.slice(a, b);
}

describe('OsirisMap cockpit wiring — popup buttons', () => {
  it('the popup still carries the original chase follow toggle, two-arg and label-switching', () => {
    expect(osirisMap).toMatch(
      /window\.__weFlightFollowToggle && window\.__weFlightFollowToggle\('\$\{idSafe\(p\.icao24\|\|''\)\}','\$\{idSafe\(cs\)\}'\)/,
    );
    expect(osirisMap).toContain('FOLLOW AIRCRAFT ');
    expect(osirisMap).toContain('CHASE CAMERA');
    expect(osirisMap).toContain('STOP FOLLOWING');
  });

  it('the popup gains a distinct COCKPIT VIEW button wired to the cockpit bridge', () => {
    expect(osirisMap).toMatch(
      /window\.__weFlightCockpitView && window\.__weFlightCockpitView\('\$\{idSafe\(p\.icao24\|\|''\)\}','\$\{idSafe\(cs\)\}'\)/,
    );
    expect(osirisMap).toContain('COCKPIT VIEW');
    // Distinct from the chase button: it must not be the follow toggle
    // with a different label — the two onclick bridges differ.
    const cockpit = osirisMap.indexOf('__weFlightCockpitView &&');
    const chase = osirisMap.indexOf('__weFlightFollowToggle &&');
    expect(cockpit).toBeGreaterThan(-1);
    expect(chase).toBeGreaterThan(-1);
    expect(cockpit).not.toBe(chase);
  });
});

describe('OsirisMap cockpit wiring — engage path', () => {
  it('the bridge effect registers __weFlightCockpitView and removes it on cleanup', () => {
    const bridge = block('(window as any).__weFlightFollowToggle = ', '}, [engageFlightFollow');
    expect(bridge).toContain('(window as any).__weFlightCockpitView = ');
    expect(bridge).toContain('engageFlightCockpit(icao24, callsign)');
    expect(bridge).toContain('delete (window as any).__weFlightCockpitView');
  });

  it('engageFlightFollow threads an explicit mode into startFollow and the follow UI state', () => {
    const engage = block('const engageFlightFollow = useCallback(', 'const setFlightFollowMode = useCallback(');
    expect(engage).toMatch(/\(icao24: string, callsign\?: string, mode\?: FollowMode\)/);
    expect(engage).toMatch(/startFollow\(\{ icao24, callsign: cs \}, savedCamera, Date\.now\(\), startMode\)/);
    expect(engage).toMatch(/setFlightFollowUi\(\{ icao24, callsign: cs, mode: startMode \}\)/);
    // Without an explicit mode the historic default survives: carry the
    // current mode across a target switch, 'chase' for a fresh engage.
    expect(engage).toMatch(/mode \?\? \(cur\.phase !== 'idle' \? cur\.mode : 'chase'\)/);
  });

  it('engageFlightCockpit switches an already-followed aircraft to forward instead of re-engaging', () => {
    const cockpit = block('const engageFlightCockpit = useCallback(', '// Popup buttons, Watch-panel rows');
    expect(cockpit).toMatch(/st\.target\?\.icao24 === icao24/);
    expect(cockpit).toContain("setFlightFollowMode('forward')");
    expect(cockpit).toMatch(/engageFlightFollow\(icao24, callsign, 'forward'\)/);
  });
});

describe('OsirisMap cockpit wiring — overlay mount', () => {
  it('the cockpit overlay mounts only in forward mode, fed by the follow HUD ref', () => {
    expect(osirisMap).toMatch(/flightFollowUi\?\.mode === 'forward'/);
    expect(osirisMap).toMatch(
      /<FlightCockpitOverlay\s+hudRef=\{flightFollowHudRef\}\s+target=\{flightFollowUi\}/,
    );
    expect(osirisMap).toContain("import FlightCockpitOverlay from '@/components/FlightCockpitOverlay';");
  });
});
