import { describe, expect, it } from 'vitest';
import { EVENT_WALLS, getEventWall } from '../data/event-walls';
import { resolveEventWallCameras } from './event-wall-cameras';
import { haversineKm } from './ski-resorts';
import {
  formatWallDate,
  wallStateLabel,
  wallStatusAt,
  wallStatusLine,
} from './event-walls';

/* ------------------------------------------------------------------ */
/* Configuration integrity                                             */
/* ------------------------------------------------------------------ */

describe('EVENT_WALLS configuration', () => {
  it('ships the four launch walls with unique slugs', () => {
    expect(EVENT_WALLS.map((w) => w.slug)).toEqual([
      'times-square',
      'northern-lights',
      'rocket-launches',
      'hurricane-watch',
    ]);
    expect(new Set(EVENT_WALLS.map((w) => w.slug)).size).toBe(EVENT_WALLS.length);
    for (const wall of EVENT_WALLS) {
      expect(getEventWall(wall.slug)).toBe(wall);
    }
    expect(getEventWall('no-such-wall')).toBeUndefined();
  });

  it('every wall is fully written: copy, cameras, faqs, cross-links', () => {
    for (const wall of EVENT_WALLS) {
      expect(wall.title.length).toBeGreaterThan(10);
      expect(wall.description.length).toBeGreaterThan(40);
      expect(wall.intro.length).toBeGreaterThanOrEqual(2);
      expect(wall.about.length).toBeGreaterThanOrEqual(1);
      expect(wall.cameras.length).toBeGreaterThanOrEqual(4);
      expect(wall.faqs.length).toBeGreaterThanOrEqual(3);
      // Unique picks within a wall — a duplicated card is a broken wall.
      expect(new Set(wall.cameras.map((c) => c.id)).size).toBe(wall.cameras.length);
      for (const pick of wall.cameras) {
        expect(pick.note.length).toBeGreaterThan(10);
        expect(pick.from.length).toBeGreaterThan(0);
      }
      expect(wall.related.some((r) => r.href === '/live-events')).toBe(true);
      if (wall.schedule.kind === 'annual') {
        expect(wall.offSeasonNote.length).toBeGreaterThan(10);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Camera resolution against the real catalogue                        */
/*                                                                     */
/* These tests are the wall-integrity net the config header promises:  */
/* every pick must still resolve from the catalogue's own data files,  */
/* in configuration order, and must still satisfy the place rule the   */
/* wall's copy claims for it. A pick that rots out of the catalogue    */
/* fails here instead of silently shrinking a wall in production.      */
/* ------------------------------------------------------------------ */

describe('event wall camera resolution', () => {
  it('resolves every configured camera, in order, for every wall', async () => {
    for (const wall of EVENT_WALLS) {
      const records = await resolveEventWallCameras(wall);
      expect(
        records.map((r) => r.id),
        `${wall.slug} must resolve all ${wall.cameras.length} picks`,
      ).toEqual(wall.cameras.map((c) => c.id));
    }
  }, 60_000);

  it('times-square: every camera is a NYC record within 5 km of the Square', async () => {
    const wall = getEventWall('times-square')!;
    const records = await resolveEventWallCameras(wall);
    for (const r of records) {
      expect(['New York City', 'Manhattan']).toContain(r.city);
      expect(typeof r.lat).toBe('number');
      expect(typeof r.lng).toBe('number');
      // The wall's honesty claim: these are the CLOSEST catalogue
      // cameras to Times Square (40.7580, -73.9855), none in it.
      expect(haversineKm(r.lat!, r.lng!, 40.758, -73.9855)).toBeLessThan(5);
    }
    // And the nearest pick really is the ~1.4 km one the copy names.
    const nearest = Math.min(
      ...records.map((r) => haversineKm(r.lat!, r.lng!, 40.758, -73.9855)),
    );
    expect(nearest).toBeGreaterThan(1);
    expect(nearest).toBeLessThan(1.6);
  }, 60_000);

  it('northern-lights: every camera sits at aurora latitude (>= 64.5)', async () => {
    const wall = getEventWall('northern-lights')!;
    const records = await resolveEventWallCameras(wall);
    expect(records.length).toBe(wall.cameras.length);
    for (const r of records) {
      expect(r.lat, `${r.id} must carry coordinates`).toBeGreaterThanOrEqual(64.5);
    }
  }, 60_000);

  it('rocket-launches: every camera is a Brevard County record on a Cape corridor road', async () => {
    const wall = getEventWall('rocket-launches')!;
    const records = await resolveEventWallCameras(wall);
    expect(records.length).toBe(wall.cameras.length);
    for (const r of records) {
      expect(r.city).toBe('Brevard County');
      // SR-405 / SR-406 (Kennedy approaches) or SR-528 (the Beachline).
      expect(r.name).toMatch(/SR-(405|406|528)/);
    }
  }, 60_000);

  it('hurricane-watch: every camera is a hurricane-belt coast record', async () => {
    const wall = getEventWall('hurricane-watch')!;
    const records = await resolveEventWallCameras(wall);
    expect(records.length).toBe(wall.cameras.length);
    // The four USGS CoastCam picks resolve from the station module.
    const usgs = records.filter((r) => r.source === 'USGS CoastCam');
    expect(usgs.map((r) => r.id).sort()).toEqual([
      'usgs-coastcam-caco-05-c1',
      'usgs-coastcam-islaverde-c1',
      'usgs-coastcam-islaverde-c2',
      'usgs-coastcam-madeira_beach-c1',
    ]);
    for (const r of records) {
      // Florida / Gulf / Caribbean / US Atlantic coast bbox — the
      // shores the wall claims, and nothing inland or elsewhere.
      expect(r.lat).toBeGreaterThanOrEqual(17);
      expect(r.lat).toBeLessThanOrEqual(42.5);
      expect(r.lng).toBeGreaterThanOrEqual(-83);
      expect(r.lng).toBeLessThanOrEqual(-64);
    }
  }, 60_000);
});

/* ------------------------------------------------------------------ */
/* Status logic                                                        */
/* ------------------------------------------------------------------ */

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('wallStatusAt', () => {
  it('evergreen walls are always live with no next start', () => {
    const wall = getEventWall('rocket-launches')!;
    for (const d of ['2026-01-15', '2026-07-04', '2026-12-25']) {
      expect(wallStatusAt(wall, at(d))).toEqual({ state: 'live', nextStart: null });
    }
    expect(wallStateLabel(wall, wallStatusAt(wall, at('2026-07-04')))).toBe('Always live');
  });

  it('hurricane (Jun 1 – Nov 30, non-wrapping) opens, closes and names the next opening', () => {
    const wall = getEventWall('hurricane-watch')!;
    expect(wallStatusAt(wall, at('2026-06-01')).state).toBe('live');
    expect(wallStatusAt(wall, at('2026-10-24')).state).toBe('live');
    expect(wallStatusAt(wall, at('2026-11-30')).state).toBe('live');

    const dec = wallStatusAt(wall, at('2026-12-01'));
    expect(dec.state).toBe('off-season');
    expect(dec.nextStart?.toISOString()).toBe('2027-06-01T00:00:00.000Z');

    const may = wallStatusAt(wall, at('2026-05-15'));
    expect(may.state).toBe('off-season');
    expect(may.nextStart?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('aurora (Sep 1 – Mar 31, wrapping) is live across the year boundary', () => {
    const wall = getEventWall('northern-lights')!;
    expect(wallStatusAt(wall, at('2026-09-01')).state).toBe('live');
    expect(wallStatusAt(wall, at('2026-12-31')).state).toBe('live');
    expect(wallStatusAt(wall, at('2027-01-15')).state).toBe('live');
    expect(wallStatusAt(wall, at('2027-03-31')).state).toBe('live');

    const summer = wallStatusAt(wall, at('2026-06-21'));
    expect(summer.state).toBe('off-season');
    expect(summer.nextStart?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(wallStatusAt(wall, at('2027-04-01')).state).toBe('off-season');
  });

  it("times-square (Dec 30 – Jan 2, wrapping) is live only for the New Year window", () => {
    const wall = getEventWall('times-square')!;
    expect(wallStatusAt(wall, at('2026-12-30')).state).toBe('live');
    expect(wallStatusAt(wall, at('2026-12-31')).state).toBe('live');
    expect(wallStatusAt(wall, at('2027-01-02')).state).toBe('live');

    const after = wallStatusAt(wall, at('2027-01-03'));
    expect(after.state).toBe('off-season');
    expect(after.nextStart?.toISOString()).toBe('2027-12-30T00:00:00.000Z');

    const before = wallStatusAt(wall, at('2026-12-29'));
    expect(before.state).toBe('off-season');
    expect(before.nextStart?.toISOString()).toBe('2026-12-30T00:00:00.000Z');
  });
});

describe('wall status lines', () => {
  it('live lines lead with the state and the event label', () => {
    const wall = getEventWall('hurricane-watch')!;
    expect(wallStatusLine(wall, at('2026-10-24'))).toBe(
      'In season now — Atlantic hurricane season',
    );
  });

  it('off-season lines name the return date', () => {
    const wall = getEventWall('northern-lights')!;
    const line = wallStatusLine(wall, at('2026-06-21'));
    expect(line).toBe('Off-season — Aurora season returns September 1, 2026');
    expect(formatWallDate(new Date(Date.UTC(2026, 11, 30)))).toBe('December 30, 2026');
  });
});
