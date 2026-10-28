import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES } from './explore-data';
import { CRUISE_PORTS, cruisePortBySlug, shipsInPort } from './cruise-ports';
import type { FeedShip } from './ais-feed';

/**
 * Cruise-port boards — the reconciliation the port pages publish by.
 * Wall yields are recomputed independently from the raw generated
 * chunks (catalogue generated 2026-10-20) with this file's own
 * haversine and pinned. The rejected ports are pinned at zero port
 * cameras so the family's honesty is enforced by the suite: Port
 * Canaveral (freeway cameras and a buoy only — no port camera) and
 * Southampton / Cozumel at flat zero. The board rule is pinned
 * against fixtures: AIS passenger-type ∩ board radius ∩ fresh.
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
  miami: 82,
  'port-everglades': 90,
  tampa: 263,
  seattle: 127,
  vancouver: 98,
  galveston: 12,
  'san-diego': 57,
  barcelona: 24,
  juneau: 12,
};

describe('cruise-port registry ↔ EXPLORE_SCOPES', () => {
  it('has exactly the nine evidenced ports, each with its wall', () => {
    expect(CRUISE_PORTS).toHaveLength(9);
    const slugs = CRUISE_PORTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of CRUISE_PORTS) {
      const def = EXPLORE_SCOPES[p.scopeKey];
      expect(def, p.slug).toBeDefined();
      expect(def.geo?.radiusKm, p.slug).toBe(p.wallRadiusKm);
      expect(p.boardRadiusKm, p.slug).toBeGreaterThanOrEqual(p.wallRadiusKm);
      expect(WALL_PINS[p.slug], p.slug).toBeDefined();
      expect(p.intro[0].length, p.slug).toBeGreaterThan(100);
      expect(p.intro[1].length, p.slug).toBeGreaterThan(100);
      expect(p.highlights.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.faqs.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(
        () => new Intl.DateTimeFormat('en-US', { timeZone: p.tz }),
        p.slug,
      ).not.toThrow();
      expect(cruisePortBySlug(p.slug), p.slug).toBe(p);
    }
    // The rejected candidates stay rejected.
    expect(cruisePortBySlug('port-canaveral')).toBeNull();
    expect(cruisePortBySlug('southampton')).toBeNull();
    expect(cruisePortBySlug('cozumel')).toBeNull();
    expect(cruisePortBySlug('nassau')).toBeNull();
  });
});

describe('cruise wall yields (raw-chunk recomputation)', () => {
  it('matches the pinned totals for every port wall', () => {
    for (const p of CRUISE_PORTS) {
      const def = EXPLORE_SCOPES[p.scopeKey];
      const wall = rawWall(def.slugs[0], def.geo!.lat, def.geo!.lng, def.geo!.radiusKm);
      expect(wall.length, p.slug).toBe(WALL_PINS[p.slug]);
    }
  });

  it("Port Everglades' wall really holds the port's own published camera", () => {
    const def = EXPLORE_SCOPES['port-fort-lauderdale'];
    const wall = rawWall(def.slugs[0], def.geo!.lat, def.geo!.lng, def.geo!.radiusKm);
    expect(wall.some((r) => r.name === 'Port Everglades trafficcams')).toBe(true);
  });

  it("Galveston's wall is the ferry-landing network the copy says it is", () => {
    const def = EXPLORE_SCOPES['port-galveston'];
    const wall = rawWall(def.slugs[0], def.geo!.lat, def.geo!.lng, def.geo!.radiusKm);
    expect(wall.some((r) => (r.name ?? '').includes('Galveston Ferry at Harborside'))).toBe(true);
    expect(wall.some((r) => (r.name ?? '').includes('Bolivar Ferry'))).toBe(true);
  });
});

describe('rejected ports — pinned absences', () => {
  it('Port Canaveral has no port camera: freeway cams and a buoy only', () => {
    const wall = rawWall('united-states', 28.41, -80.63, 12);
    const named = wall.filter((r) =>
      /port|berth|terminal|cruise/i.test(r.name ?? ''),
    );
    expect(named).toHaveLength(0);
  });

  it('Southampton and Cozumel sit at flat zero', () => {
    expect(rawWall('united-kingdom', 50.9, -1.4, 10)).toHaveLength(0);
    expect(rawWall('mexico', 20.51, -86.81, 10)).toHaveLength(0);
  });
});

const NOW = Date.UTC(2026, 9, 27, 18, 0, 0);
const miami = cruisePortBySlug('miami')!;
const fresh = (over: Partial<FeedShip>): FeedShip => ({
  timestamp: NOW - 120_000,
  ...over,
});

describe('shipsInPort — the live presence rule', () => {
  it('lists a berthed passenger ship as in-port and a moving one as in-area', () => {
    const feed = [
      fresh({ name: 'SYMPHONY OF THE SEAS', lat: 25.77, lng: -80.165, speed: 0, type: 'passenger', destination: 'Nassau' }),
      fresh({ name: 'CELEBRITY APEX', lat: 25.78, lng: -80.1, speed: 6.5, type: 'passenger' }),
    ];
    const board = shipsInPort(miami, feed, NOW);
    expect(board).toHaveLength(2);
    expect(board[0].name).toBe('SYMPHONY OF THE SEAS'); // in-port sorts first
    expect(board[0].status).toBe('in-port');
    expect(board[0].destination).toBe('Nassau');
    expect(board[1].status).toBe('in-area');
  });

  it('never guesses: cargo, typeless and out-of-radius contacts are absent', () => {
    const feed = [
      fresh({ name: 'MAERSK SENTOSA', lat: 25.77, lng: -80.165, speed: 0, type: 'cargo' }),
      fresh({ name: 'UNKNOWN CONTACT', lat: 25.77, lng: -80.165, speed: 0 }), // no type yet
      fresh({ name: 'FAR AWAY LINER', lat: 24.5, lng: -81.8, speed: 0, type: 'passenger' }), // Key West way
      fresh({ name: 'TANKER', lat: 25.77, lng: -80.165, speed: 0, type: 'tanker' }),
    ];
    expect(shipsInPort(miami, feed, NOW)).toHaveLength(0);
  });

  it('drops reports older than the feed freshness window', () => {
    const feed = [
      { name: 'STALE LINER', lat: 25.77, lng: -80.165, speed: 0, type: 'passenger', timestamp: NOW - 11 * 60_000 },
    ];
    expect(shipsInPort(miami, feed, NOW)).toHaveLength(0);
  });
});
