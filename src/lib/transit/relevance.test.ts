import { describe, it, expect } from 'vitest';
import { agencyIntersectsView, selectAgenciesForView, type AgencyGeo } from './relevance';
import { TRANSIT_AGENCIES } from './agencies';

const uta = TRANSIT_AGENCIES.find(a => a.id === 'uta')!;
const rtd = TRANSIT_AGENCIES.find(a => a.id === 'rtd-denver')!;

/** A ~1200×800 viewport of the given span centered on a point. */
function viewAt(lat: number, lng: number, spanLat: number, spanLng = spanLat * 1.5) {
  return { south: lat - spanLat / 2, north: lat + spanLat / 2, west: lng - spanLng / 2, east: lng + spanLng / 2 };
}

describe('agencyIntersectsView — the zoom-disappearance regression', () => {
  // Real positions from the live UTA feed, 2026-10-18: buses run from
  // Provo (40.55) to Ogden (41.22); the old center-point test dropped
  // UTA for all of these viewports. Bounds intersection must keep it.
  it('keeps UTA at street zoom on an Ogden bus (41.2248, -111.9701)', () => {
    expect(agencyIntersectsView(uta, viewAt(41.2248, -111.9701, 0.015))).toBe(true); // z15
    expect(agencyIntersectsView(uta, viewAt(41.2248, -111.9701, 0.0038))).toBe(true); // z17
  });
  it('keeps UTA at street zoom on a south TRAX train (40.5503, -112.0201)', () => {
    expect(agencyIntersectsView(uta, viewAt(40.5503, -112.0201, 0.06))).toBe(true); // z13
    expect(agencyIntersectsView(uta, viewAt(40.5503, -112.0201, 0.0038))).toBe(true); // z17
  });
  it('keeps UTA at globe and city zooms over Utah', () => {
    expect(agencyIntersectsView(uta, viewAt(40.9, -111.9, 40))).toBe(true);
    expect(agencyIntersectsView(uta, viewAt(40.7608, -111.891, 0.24))).toBe(true);
  });
  it('drops UTA when the viewport is genuinely outside its service area', () => {
    expect(agencyIntersectsView(uta, viewAt(39.7392, -104.9903, 0.015))).toBe(false); // Denver street
    expect(agencyIntersectsView(uta, viewAt(0, -30, 10))).toBe(false); // mid-Atlantic
  });
  it('keeps a national feed (Entur, Norway-wide bounds) at Oslo street zoom', () => {
    const entur = TRANSIT_AGENCIES.find(a => a.id === 'entur-no')!;
    expect(agencyIntersectsView(entur, viewAt(59.9139, 10.7522, 0.0038))).toBe(true);
  });
  it('falls back to the center test when bounds are absent (stale payload)', () => {
    const stale: AgencyGeo = { center: uta.center, bounds: null };
    expect(agencyIntersectsView(stale, viewAt(40.7608, -111.891, 0.24))).toBe(true);
    expect(agencyIntersectsView(stale, viewAt(41.2248, -111.9701, 0.015))).toBe(false);
  });
});

describe('selectAgenciesForView', () => {
  it('selects RTD (not UTA) for a Denver street viewport', () => {
    const sel = selectAgenciesForView([uta, rtd], viewAt(39.75, -104.99, 0.015));
    expect(sel.map(a => a.id)).toEqual(['rtd-denver']);
  });
  it('caps at 6 and prefers the nearest centers on a continent view', () => {
    const sel = selectAgenciesForView(TRANSIT_AGENCIES, viewAt(41, -111, 60, 120), 6);
    expect(sel.length).toBe(6);
    expect(sel[0].id).toBe('uta'); // viewport is centered over Utah
  });
  it('returns nothing over the open Pacific', () => {
    expect(selectAgenciesForView(TRANSIT_AGENCIES, viewAt(-25, -150, 8))).toEqual([]);
  });
});
