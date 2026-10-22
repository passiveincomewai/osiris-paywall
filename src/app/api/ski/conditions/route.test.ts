import { describe, expect, it } from 'vitest';
import { shapeNwsAlerts } from './route';

describe('shapeNwsAlerts', () => {
  it('shapes features into alerts, most severe first', () => {
    const out = shapeNwsAlerts({
      features: [
        { properties: { event: 'Winter Weather Advisory', severity: 'Minor', headline: 'Snow expected', expires: '2026-01-01T00:00Z' } },
        { properties: { event: 'Winter Storm Warning', severity: 'Severe', headline: 'Heavy snow', ends: '2026-01-02T00:00Z' } },
        { properties: { headline: 'no event name — dropped' } },
      ],
    });
    expect(out.map(a => a.event)).toEqual(['Winter Storm Warning', 'Winter Weather Advisory']);
    expect(out[0].expires).toBe('2026-01-02T00:00Z'); // ends stands in for expires
    expect(out[1].severity).toBe('Minor');
  });

  it('returns an empty list for an empty or malformed payload', () => {
    expect(shapeNwsAlerts(null)).toEqual([]);
    expect(shapeNwsAlerts({})).toEqual([]);
    expect(shapeNwsAlerts({ features: [] })).toEqual([]);
  });
});
