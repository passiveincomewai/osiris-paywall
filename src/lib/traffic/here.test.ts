import { describe, it, expect } from 'vitest';
import { parseHereFlow, parseHereIncidents, hereConfigured, hereFlowUrl } from './here';

/** Modelled on the documented HERE Traffic API v7 flow response shape
 *  (results → location.shape.links[].points, currentFlow.speed /
 *  freeFlow). No live key exists yet; the fixture pins the parser to
 *  the documented contract. */
const FLOW_FIXTURE = {
  sourceUpdated: '2026-11-04T08:00:00Z',
  results: [
    {
      location: {
        description: 'I-15 N',
        shape: { links: [{ points: [{ lat: 40.7608, lng: -111.891 }, { lat: 40.7712, lng: -111.8915 }], length: 1160 }] },
      },
      currentFlow: { speed: 30, freeFlow: 60, jamFactor: 5.2, confidence: 0.9, traversability: 'open' },
    },
    {
      location: { shape: { links: [{ points: [{ lat: 40.7, lng: -111.8 }], length: 10 }] } },
      currentFlow: { speed: 10, freeFlow: 50 },
    },
    {
      location: { shape: { links: [{ points: [{ lat: 40.7, lng: -111.8 }, { lat: 40.71, lng: -111.8 }] }] } },
      currentFlow: { speed: null, freeFlow: 50 },
    },
  ],
};

describe('parseHereFlow', () => {
  it('turns speed/freeFlow into relative_speed line features tagged here', () => {
    const feats = parseHereFlow(FLOW_FIXTURE);
    expect(feats).toHaveLength(1);
    expect(feats[0].properties).toEqual({ relative_speed: 0.5, source: 'here' });
    expect(feats[0].geometry).toEqual({
      type: 'LineString',
      coordinates: [[-111.891, 40.7608], [-111.8915, 40.7712]],
    });
  });

  it('returns nothing for malformed payloads', () => {
    expect(parseHereFlow(null)).toEqual([]);
    expect(parseHereFlow({})).toEqual([]);
    expect(parseHereFlow({ results: 'nope' })).toEqual([]);
  });
});

describe('parseHereIncidents', () => {
  it('extracts typed, geolocated incidents', () => {
    const out = parseHereIncidents({
      results: [{
        id: 'inc-1',
        details: { type: 'accident', description: { value: 'Crash on I-15' } },
        location: { shape: { links: [{ points: [{ lat: 40.76, lng: -111.89 }, { lat: 40.77, lng: -111.89 }] }] } },
      }],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'inc-1', type: 'accident', summary: 'Crash on I-15' });
    expect(out[0].lines[0]).toEqual([[-111.89, 40.76], [-111.89, 40.77]]);
    expect(parseHereIncidents(null)).toEqual([]);
  });
});

describe('hereConfigured / hereFlowUrl', () => {
  it('reads only HERE_API_KEY', () => {
    expect(hereConfigured({ ...process.env, HERE_API_KEY: 'k' })).toBe(true);
    const without = { ...process.env };
    delete without.HERE_API_KEY;
    expect(hereConfigured(without)).toBe(false);
  });
  it('builds the v7 flow URL with a bbox and shape referencing', () => {
    const u = hereFlowUrl({ west: -112, south: 40.7, east: -111.8, north: 40.8 }, 'k e y');
    expect(u).toContain('https://data.traffic.hereapi.com/v7/flow?in=bbox:-112,40.7,-111.8,40.8');
    expect(u).toContain('locationReferencing=shape');
    expect(u).toContain('apiKey=k%20e%20y');
  });
});
