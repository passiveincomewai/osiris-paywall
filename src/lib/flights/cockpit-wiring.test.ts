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

// ── Cockpit View: imagery basemap + real 3D (2026-11-01) ────────────
//
// Cockpit rendered flat because it rode on whatever basemap the
// visitor last chose — usually the dark vector style — with the 3D
// buildings layer off. Entry now borrows the satellite imagery
// through the shared hold machinery (OsirisMap) and forces the real
// building extrusions, the two things this style honestly has; exit
// restores the visitor's own view. These pins keep that wiring from
// silently unwiring.

describe('cockpit view — satellite imagery + real 3D buildings', () => {
  const followSrc = readFileSync(join(process.cwd(), 'src', 'lib', 'flights', 'follow.ts'), 'utf8');
  const hud = readFileSync(join(process.cwd(), 'src', 'components', 'FlightFollowHud.tsx'), 'utf8');
  const engageBody = block('const engageFlightFollow = useCallback(', 'const setFlightFollowMode = useCallback(');
  const endBody = block('const endFlightFollow = useCallback(', 'const engageFlightFollow = useCallback(');
  const modeBody = block('const setFlightFollowMode = useCallback(', 'const engageFlightCockpit = useCallback(');
  const bIdx = osirisMap.indexOf('const enabled = activeLayers.terrain_3d');
  const buildingsBody = osirisMap.slice(bIdx, bIdx + 800);

  it('the hold machinery is defined before the follow callbacks that use it', () => {
    // useCallback deps arrays evaluate at definition time: if the
    // holds ever move back below the follow block, the component
    // TDZ-crashes on mount.
    expect(osirisMap.indexOf('const acquireSatelliteView')).toBeGreaterThan(-1);
    expect(osirisMap.indexOf('const acquireSatelliteView')).toBeLessThan(
      osirisMap.indexOf('const engageFlightFollow = useCallback('),
    );
  });

  it('entering cockpit borrows the imagery basemap through the shared hold', () => {
    expect(engageBody).toContain("acquireSatelliteView('cockpit')");
    expect(modeBody).toContain("acquireSatelliteView('cockpit')");
    expect(modeBody).toContain("releaseSatelliteView('cockpit')");
  });

  it('exiting follow releases the hold so the previous view is restored', () => {
    expect(endBody).toContain("releaseSatelliteView('cockpit')");
  });

  it('cockpit forces the real 3D building extrusions; chase and orbit do not', () => {
    expect(buildingsBody).toContain("activeLayers.terrain_3d || flightFollowUi?.mode === 'forward'");
    expect(osirisMap).toContain('activeLayers.terrain_3d, flightFollowUi?.mode]);');
  });

  it('the HUD labels the ground imagery honestly while in cockpit', () => {
    expect(followSrc).toContain('COCKPIT_IMAGERY_TAG');
    expect(followSrc).toContain('REFERENCE SATELLITE IMAGERY (DATED)');
    expect(hud).toContain('COCKPIT_IMAGERY_TAG');
    expect(hud).toContain("mode === 'forward'");
  });
});

// ── Follow HUD: mobile compact bar (2026-11-01) ─────────────────────
//
// On a phone the follow HUD was a 320 px slab over the pitched view —
// the satellite card's bird's-eye defect in a second panel. These
// pins hold the SatelliteCard-pattern collapse: a mobile-only compact
// bar (identity, headline telemetry, honesty lines, expand, exit) and
// a body that is hidden on mobile until expanded, with desktop
// rendering untouched.

describe('follow HUD — mobile compact bar', () => {
  const hud = readFileSync(join(process.cwd(), 'src', 'components', 'FlightFollowHud.tsx'), 'utf8');
  const overlay = readFileSync(
    join(process.cwd(), 'src', 'components', 'FlightCockpitOverlay.tsx'),
    'utf8',
  );
  const bar = hud.slice(hud.indexOf('The collapsed mobile bar'), hud.indexOf('bodyHiddenOnMobile ?'));

  it('renders a mobile-only compact bar with identity, telemetry and 44px controls', () => {
    expect(bar).toContain('md:hidden');
    expect(bar).toContain('FOLLOWING {callsign}');
    expect(bar).toMatch(/ALT <span className="text-white\/90">/);
    expect(bar).toMatch(/SPD <span className="text-white\/90">/);
    expect(bar).toMatch(/HDG <span className="text-white\/90">/);
    expect(bar).toContain('aria-expanded={detailsOpen}');
    expect(bar).toContain('Show follow details');
    expect(bar).toContain('Hide follow details');
    // Expand and EXIT are both full-height tap targets.
    expect(bar.match(/min-h-\[44px\]/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps EXIT — RESTORE VIEW reachable from the bar without expanding', () => {
    expect(bar).toContain('onClick={onExit}');
    expect(bar).toContain('aria-label="Exit follow and restore view"');
    expect(bar).toContain('EXIT');
  });

  it('carries both honesty lines in the bar while collapsed, verbatim', () => {
    expect(bar).toContain('{!detailsOpen && (');
    expect(bar).toContain('FOLLOW_HONESTY_TAG');
    expect(bar).toContain('COCKPIT_IMAGERY_TAG');
    expect(bar).toContain("mode === 'forward'");
  });

  it('hides the full body on mobile until expanded; desktop always shows it', () => {
    expect(hud).toContain('const bodyHiddenOnMobile = !detailsOpen;');
    expect(hud).toContain("bodyHiddenOnMobile ? 'hidden md:block' : undefined");
  });

  it('resets the collapse on target change (exit unmounts, so re-engage starts collapsed)', () => {
    expect(hud).toMatch(/useEffect\(\(\) => \{ setDetailsOpen\(false\); \}, \[target\.icao24\]\)/);
  });

  it('the cockpit overlay yields the honesty tag to the HUD on mobile', () => {
    expect(overlay).toContain('hidden max-w-[92vw]');
    expect(overlay).toContain('md:top-0');
    expect(overlay).toContain('max-w-[calc(100vw-1.5rem)]');
  });
});
