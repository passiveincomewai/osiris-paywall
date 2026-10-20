import { describe, it, expect } from 'vitest';
import { parseAlerts, alertsForRoute } from './alerts';

const SHORT = new Map([['93610', '126'], ['27610', '200']]);

const MSG = {
  entity: [
    {
      id: 'a1',
      alert: {
        informedEntity: [{ routeId: '93610' }],
        cause: 'CONSTRUCTION',
        effect: 'DETOUR',
        activePeriod: [{ start: 1792000000, end: 1793000000 }],
        headerText: { translation: [{ text: 'Pioneer Road Closure', language: 'en' }] },
        descriptionText: { translation: [{ text: 'Detour via 700 E.', language: 'en' }] },
      },
    },
    {
      id: 'a2',
      alert: {
        informedEntity: [{ routeId: '27610' }, { routeId: 'UNKNOWN9' }, { stopId: '1234' }],
        headerText: {
          translation: [
            { text: 'Aviso', language: 'es' },
            { text: 'State Street detour', language: 'en' },
          ],
        },
      },
    },
    { id: 'a3', alert: { informedEntity: [] } }, // no header — unusable, skipped
    { id: 'v1', vehicle: { id: 'x' } }, // not an alert entity
  ],
};

describe('parseAlerts', () => {
  const alerts = parseAlerts(MSG, SHORT);
  it('keeps only real alerts with headers', () => {
    expect(alerts.map(a => a.id)).toEqual(['a1', 'a2']);
  });
  it('resolves route ids to public numbers and converts periods to ms', () => {
    const [a1] = alerts;
    expect(a1.routes).toEqual(['126']);
    expect(a1.routeIds).toEqual(['93610']);
    expect(a1.description).toBe('Detour via 700 E.');
    expect(a1.periods).toEqual([{ startMs: 1792000000000, endMs: 1793000000000 }]);
  });
  it('prefers the English translation and drops unresolvable ids from display routes', () => {
    const [, a2] = alerts;
    expect(a2.header).toBe('State Street detour');
    expect(a2.routes).toEqual(['200']);
    expect(a2.routeIds).toEqual(['27610', 'UNKNOWN9']); // stopId-only entity not a route
  });
});

describe('alertsForRoute', () => {
  const alerts = parseAlerts(MSG, SHORT);
  it('matches by internal id or public number', () => {
    expect(alertsForRoute(alerts, { id: '93610', short: '126' }).map(a => a.id)).toEqual(['a1']);
    expect(alertsForRoute(alerts, { id: 'x', short: '200' }).map(a => a.id)).toEqual(['a2']);
    expect(alertsForRoute(alerts, { id: 'nope', short: '999' })).toEqual([]);
  });
});
