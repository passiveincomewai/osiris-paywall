/**
 * Click-wiring contract for OsirisMap's satellite pick deferral.
 *
 * The map's generic click handler (satellite GPU pick) must defer to
 * any layer that has its own click handler: it checks the features
 * under the cursor against CLICKABLE_LAYERS and bails when one is
 * present, so "a camera or an aircraft under the cursor is not stolen
 * by a satellite behind it". That set is a hand-maintained list of
 * layer ids, and it drifted: when the flight layers were renamed to
 * fl-commercial / fl-private / fl-jets / fl-military, the set kept
 * the dead ids flight-dots / military-dots / jet-dots / private-dots
 * — layers that are never added — so the deferral silently did not
 * cover aircraft at all. At zoom ≤ SAT_MAX_ZOOM (where the satellite
 * pick is live) a click on an aircraft with a satellite marker within
 * the pick radius opened the flight popup and the satellite handler
 * removed it in the same click.
 *
 * These pins extract the three sets mechanically from the component
 * source — layers actually added, layers with a delegated click
 * handler, and CLICKABLE_LAYERS — and hold the invariant the handler
 * comment promises:
 *   every added layer with its own click handler is in the set, and
 *   every member of the set is a layer that is actually added.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const osirisMap = readFileSync(
  join(process.cwd(), 'src', 'components', 'OsirisMap.tsx'),
  'utf8',
);

function extractSets(source: string) {
  // Layers actually added: literal addLayer({ id: '…' }) plus the
  // flight layers, whose ids live in the flightLayers table and are
  // added via map.addLayer({ id: l.id … }).
  const added = new Set<string>();
  for (const m of source.matchAll(/addLayer\(\{\s*id:\s*'([^']+)'/g)) added.add(m[1]);
  const flightTable = source.match(/const flightLayers = \[([\s\S]*?)\];/);
  const flightIds: string[] = [];
  if (flightTable) {
    for (const m of flightTable[1].matchAll(/\{\s*id:\s*'([^']+)'/g)) {
      flightIds.push(m[1]);
      added.add(m[1]);
    }
  }
  // Layers with a delegated click handler: direct registrations plus
  // array-driven loops (['a','b'].forEach(layer => { map.on('click', layer …)).
  const clickHandled = new Set<string>();
  for (const m of source.matchAll(/map\.on\('click',\s*'([^']+)'/g)) clickHandled.add(m[1]);
  for (const m of source.matchAll(/\[([^\]]*)\]\.forEach\(layer => \{\s*\n?\s*map\.on\('click', layer/g)) {
    for (const id of m[1].matchAll(/'([^']+)'/g)) clickHandled.add(id[1]);
  }
  // The satellite handler's deferral set.
  const setLiteral = source.match(/CLICKABLE_LAYERS = new Set\(\[([\s\S]*?)\]\)/);
  const clickable = new Set<string>();
  if (setLiteral) {
    for (const m of setLiteral[1].matchAll(/'([^']+)'/g)) clickable.add(m[1]);
  }
  return { added, flightIds, clickHandled, clickable };
}

const { added, flightIds, clickHandled, clickable } = extractSets(osirisMap);

describe('OsirisMap click wiring — satellite deferral set', () => {
  it('extracts the flight layer table (guard against a vacuous pass)', () => {
    expect(flightIds).toEqual(['fl-commercial', 'fl-private', 'fl-jets', 'fl-military']);
    expect(clickable.size).toBeGreaterThan(40);
    expect(clickHandled.size).toBeGreaterThan(40);
  });

  it('every flight layer has a delegated click handler that opens the flight popup', () => {
    for (const id of flightIds) expect(clickHandled.has(id)).toBe(true);
    expect(osirisMap).toMatch(
      /\['fl-commercial','fl-private','fl-jets','fl-military'\]\.forEach\(layer => \{\s*\n?\s*map\.on\('click', layer, e => \{\s*\n?\s*if \(!e\.features\?\.length\) return;\s*\n?\s*showFlightPopup\(e\.features\[0\]\);/,
    );
  });

  it('every flight layer is in CLICKABLE_LAYERS, so the satellite pick defers to aircraft clicks', () => {
    for (const id of flightIds) expect(clickable.has(id)).toBe(true);
  });

  it('every added layer with its own click handler is in CLICKABLE_LAYERS', () => {
    const missing = [...clickHandled].filter((id) => added.has(id) && !clickable.has(id));
    expect(missing).toEqual([]);
  });

  it('CLICKABLE_LAYERS contains no stale ids — every member is a layer actually added', () => {
    const stale = [...clickable].filter((id) => !added.has(id));
    expect(stale).toEqual([]);
  });
});
