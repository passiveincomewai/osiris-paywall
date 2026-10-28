import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from './explore-data';
import {
  FERRY_SYSTEMS,
  ferrySystemBySlug,
  matchFerryVessels,
  normalizeShipName,
} from './ferries';
import type { FeedShip } from './ais-feed';

/**
 * Ferry tracker — the reconciliation the ferry pages publish by.
 * Walls are recomputed independently from the raw generated chunks
 * (src/data/countries/*.json, catalogue generated 2026-10-20) with
 * this file's own haversine and pinned; the named terminal cameras
 * the copy quotes are pinned by name; the gaps the pages print
 * (Tsawwassen / Swartz Bay / Duke Point, both Staten Island
 * terminals) are pinned at zero so a future catalogue regeneration
 * that adds a feed there fails loudly and the copy gets revisited
 * instead of drifting. The AIS matcher is pinned against the rule
 * the endpoint serves: fleet-name ∩ service geofence ∩ not a known
 * non-passenger type ∩ inside the feed's 10-minute freshness window.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
  lat?: number;
  lng?: number;
  name?: string;
}

const chunkCache = new Map<string, Rec[]>();
function chunk(slug: string): Rec[] {
  let hit = chunkCache.get(slug);
  if (!hit) {
    hit = JSON.parse(readFileSync(join(DATA_DIR, 'countries', `${slug}.json`), 'utf8')) as Rec[];
    chunkCache.set(slug, hit);
  }
  return hit;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(lat2 - lat1) / 2) ** 2 +
    Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(t(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function rawWall(slug: string, lat: number, lng: number, radiusKm: number): Rec[] {
  return chunk(slug).filter(
    (r) =>
      typeof r.lat === 'number' &&
      typeof r.lng === 'number' &&
      haversineKm(lat, lng, r.lat, r.lng) <= radiusKm,
  );
}

/** Pinned wall yields, audited 2026-10-27 against the 2026-10-20 catalogue. */
const WALL_PINS: Record<string, number> = {
  'ferry-wsf-seattle': 89,
  'ferry-wsf-edmonds-kingston': 6,
  'ferry-wsf-bainbridge': 3,
  'ferry-wsf-bremerton': 3,
  'ferry-wsf-mukilteo-clinton': 7,
  'ferry-wsf-fauntleroy-vashon': 10,
  'ferry-wsf-point-defiance': 1,
  'ferry-wsf-anacortes': 4,
  'ferry-wsf-san-juans': 5,
  'ferry-wsf-port-townsend': 1,
  'ferry-wsf-coupeville': 1,
  'ferry-bcf-departure-bay': 15,
  'ferry-bcf-horseshoe-bay': 2,
  'ferry-si-new-york-harbor': 24,
};

function* allWalls() {
  for (const s of FERRY_SYSTEMS) for (const w of s.walls) yield { s, w };
}

describe('ferry registry ↔ EXPLORE_SCOPES', () => {
  it('covers exactly the ferry-* scopes, both ways', () => {
    const scopeKeys = Object.keys(EXPLORE_SCOPES).filter((k) => k.startsWith('ferry-'));
    const registryKeys = [...allWalls()].map(({ w }) => w.scopeKey);
    expect(scopeKeys.sort()).toEqual([...new Set(registryKeys)].sort());
    expect(FERRY_SYSTEMS).toHaveLength(3);
  });

  it('every system carries real copy and a resolvable slug', () => {
    for (const s of FERRY_SYSTEMS) {
      expect(s.intro[0].length, s.slug).toBeGreaterThan(100);
      expect(s.intro[1].length, s.slug).toBeGreaterThan(100);
      expect(s.highlights.length, s.slug).toBeGreaterThanOrEqual(1);
      expect(s.faqs.length, s.slug).toBeGreaterThanOrEqual(3);
      expect(s.fleetNames.length, s.slug).toBeGreaterThanOrEqual(5);
      expect(s.terminals.length, s.slug).toBeGreaterThanOrEqual(2);
      expect(s.routes.length, s.slug).toBeGreaterThanOrEqual(1);
      expect(
        () => new Intl.DateTimeFormat('en-US', { timeZone: s.tz }),
        s.slug,
      ).not.toThrow();
      expect(ferrySystemBySlug(s.slug), s.slug).toBe(s);
    }
    expect(ferrySystemBySlug('galveston-bolivar-ferry')).toBeNull();
    expect(ferrySystemBySlug('sydney-ferries')).toBeNull();
  });

  it('every wall scope exists and every wall has a pin', () => {
    for (const { s, w } of allWalls()) {
      const def = EXPLORE_SCOPES[w.scopeKey];
      expect(def, `${s.slug}/${w.scopeKey}`).toBeDefined();
      expect(def.geo, w.scopeKey).toBeDefined();
      expect(WALL_PINS[w.scopeKey], w.scopeKey).toBeDefined();
    }
  });
});

describe('ferry wall yields (raw-chunk recomputation)', () => {
  it('matches the pinned totals for every wall', () => {
    for (const { w } of allWalls()) {
      const def = EXPLORE_SCOPES[w.scopeKey];
      const wall = rawWall(def.slugs[0], def.geo!.lat, def.geo!.lng, def.geo!.radiusKm);
      expect(wall.length, w.scopeKey).toBe(WALL_PINS[w.scopeKey]);
    }
  });

  it('the named terminal cameras the copy quotes are really in their walls', () => {
    const at = (key: string) => {
      const def = EXPLORE_SCOPES[key];
      return rawWall(def.slugs[0], def.geo!.lat, def.geo!.lng, def.geo!.radiusKm);
    };
    expect(at('ferry-wsf-seattle').some((r) => r.name === 'WSF Seattle Ferry Bainbridge Holding')).toBe(true);
    expect(at('ferry-wsf-edmonds-kingston').some((r) => r.name === 'WSF Kingston Terminal')).toBe(true);
    expect(at('ferry-wsf-mukilteo-clinton').some((r) => r.name === 'WSF Clinton Terminal')).toBe(true);
    expect(at('ferry-wsf-anacortes').some((r) => r.name === 'WSF Anacortes Ferry Terminal')).toBe(true);
    const juans = at('ferry-wsf-san-juans');
    expect(juans.some((r) => r.name === 'WSF Friday Harbor Ferry Holding')).toBe(true);
    expect(juans.some((r) => r.name === 'WSF Orcas Ferry Holding')).toBe(true);
    expect(juans.some((r) => (r.name ?? '').startsWith('WSF Lopez Ferry Holding'))).toBe(true);
    expect(at('ferry-wsf-coupeville').some((r) => r.name === 'WSF Coupeville Terminal')).toBe(true);
    expect(at('ferry-bcf-departure-bay').some((r) => r.name === 'Departure Bay Ferry')).toBe(true);
  });

  it('the printed camera gaps are real: zero catalogue cameras at the named docks', () => {
    // BC Ferries' three busiest terminals — the page names them as gaps.
    expect(rawWall('canada', 49.006, -123.128, 4)).toHaveLength(0); // Tsawwassen
    expect(rawWall('canada', 48.688, -123.411, 4)).toHaveLength(0); // Swartz Bay
    expect(rawWall('canada', 49.163, -123.89, 3)).toHaveLength(0); // Duke Point
    // Staten Island Ferry: no camera at either terminal.
    expect(rawWall('united-states', 40.6433, -74.0735, 2.5)).toHaveLength(0); // St. George
    expect(rawWall('united-states', 40.702, -74.013, 1)).toHaveLength(0); // Whitehall
  });
});

const NOW = Date.UTC(2026, 9, 27, 18, 0, 0);
const fresh = (over: Partial<FeedShip>): FeedShip => ({
  timestamp: NOW - 60_000,
  ...over,
});

describe('normalizeShipName', () => {
  it('strips prefixes and punctuation', () => {
    expect(normalizeShipName('MV Tacoma')).toBe('TACOMA');
    expect(normalizeShipName('M/V Wenatchee')).toBe('WENATCHEE');
    expect(normalizeShipName('  queen  of  oak bay ')).toBe('QUEEN OF OAK BAY');
  });
});

describe('matchFerryVessels — the honest identification rule', () => {
  const wsf = ferrySystemBySlug('washington-state-ferries')!;
  const bcf = ferrySystemBySlug('bc-ferries')!;
  const si = ferrySystemBySlug('staten-island-ferry')!;

  it('matches a WSF boat by broadcast name inside Puget Sound', () => {
    const feed = [
      fresh({ name: 'MV TACOMA', lat: 47.62, lng: -122.45, speed: 14.2, destination: 'Bainbridge Island' }),
      fresh({ name: 'EVERGREEN STATE', lat: 47.62, lng: -122.45, speed: 10 }), // not a WSF name
      fresh({ name: 'SEATTLE SPIRIT', lat: 47.62, lng: -122.45, speed: 8, type: 'passenger' }), // tour boat, not fleet
    ];
    const hits = matchFerryVessels(wsf, feed, NOW);
    expect(hits).toHaveLength(1);
    expect(hits[0].name).toBe('MV TACOMA');
    expect(hits[0].destination).toBe('Bainbridge Island');
  });

  it('excludes a fleet-named contact identified as a non-passenger type', () => {
    const feed = [fresh({ name: 'TACOMA', lat: 47.62, lng: -122.45, type: 'cargo' })];
    expect(matchFerryVessels(wsf, feed, NOW)).toHaveLength(0);
  });

  it('excludes stale reports beyond the 10-minute window', () => {
    const feed = [
      { name: 'KITSAP', lat: 47.6, lng: -122.5, timestamp: NOW - 11 * 60_000 },
    ];
    expect(matchFerryVessels(wsf, feed, NOW)).toHaveLength(0);
  });

  it('separates the two SALISH fleets by the geofence gap', () => {
    const wsfSalish = fresh({ name: 'SALISH', lat: 48.5, lng: -122.95, type: 'passenger' });
    const bcSalish = fresh({ name: 'SALISH ORCA', lat: 49.7, lng: -124.5, type: 'passenger' });
    const gapSalish = fresh({ name: 'SALISH', lat: 48.575, lng: -122.95, type: 'passenger' });
    expect(matchFerryVessels(wsf, [wsfSalish], NOW)).toHaveLength(1);
    expect(matchFerryVessels(bcf, [bcSalish], NOW)).toHaveLength(1);
    expect(matchFerryVessels(wsf, [bcSalish], NOW)).toHaveLength(0);
    expect(matchFerryVessels(bcf, [wsfSalish], NOW)).toHaveLength(0);
    // In the 48.55–48.6°N gap between the boxes, neither fleet claims it.
    expect(matchFerryVessels(wsf, [gapSalish], NOW)).toHaveLength(0);
    expect(matchFerryVessels(bcf, [gapSalish], NOW)).toHaveLength(0);
  });

  it('matches BC Ferries Queens and Staten Island boats in their own waters', () => {
    const queen = fresh({ name: 'QUEEN OF OAK BAY', lat: 49.19, lng: -123.9, type: 'passenger' });
    expect(matchFerryVessels(bcf, [queen], NOW)).toHaveLength(1);
    expect(matchFerryVessels(wsf, [queen], NOW)).toHaveLength(0);
    const barberi = fresh({ name: 'ANDREW J. BARBERI', lat: 40.69, lng: -74.02, type: 'passenger' });
    expect(matchFerryVessels(si, [barberi], NOW)).toHaveLength(1);
    // The same boat name outside the harbour geofence is not claimed.
    const barberiElsewhere = fresh({ name: 'ANDREW J. BARBERI', lat: 47.6, lng: -122.3, type: 'passenger' });
    expect(matchFerryVessels(si, [barberiElsewhere], NOW)).toHaveLength(0);
  });
});
