import { describe, it, expect } from 'vitest';
import {
  delayStatus,
  isAlertActive,
  routeStatusFromAlerts,
  buildServiceBoard,
  boardHasNews,
  alertsMatchingRoute,
  alertsMatchingStop,
  isSystemWide,
  type StatusAlertLike,
} from './status';
import { parseAlerts } from './alerts';

const NOW = Date.UTC(2026, 9, 26, 12, 0, 0); // 2026-10-26 12:00 UTC

const alert = (over: Partial<StatusAlertLike> = {}): StatusAlertLike => ({
  header: 'Something happening',
  routes: [],
  routeIds: [],
  stopIds: [],
  periods: [],
  ...over,
});

describe('delayStatus — thresholds', () => {
  it('scheduled basis never claims a live status, whatever the delay', () => {
    expect(delayStatus(600, 'scheduled')).toEqual({
      label: 'Scheduled — no live data', tone: 'muted', minutes: null,
    });
    expect(delayStatus(undefined, 'scheduled').label).toBe('Scheduled — no live data');
  });

  it('realtime without a delay value claims only "Realtime"', () => {
    expect(delayStatus(undefined, 'realtime')).toEqual({ label: 'Realtime', tone: 'cyan', minutes: null });
    expect(delayStatus(null, 'realtime').label).toBe('Realtime');
  });

  it('inside the ±60 s band is On time', () => {
    expect(delayStatus(0, 'realtime')).toEqual({ label: 'On time', tone: 'green', minutes: 0 });
    expect(delayStatus(59, 'realtime').label).toBe('On time');
    expect(delayStatus(-59, 'realtime').label).toBe('On time');
  });

  it('at and beyond 60 s late is minutes late, amber then red at 10', () => {
    expect(delayStatus(60, 'realtime')).toEqual({ label: '1 min late', tone: 'amber', minutes: 1 });
    expect(delayStatus(299, 'realtime').label).toBe('5 min late');
    expect(delayStatus(300, 'realtime').label).toBe('5 min late');
    expect(delayStatus(600, 'realtime')).toEqual({ label: '10 min late', tone: 'red', minutes: 10 });
  });

  it('at and beyond 60 s early is minutes early', () => {
    expect(delayStatus(-60, 'realtime')).toEqual({ label: '1 min early', tone: 'cyan', minutes: -1 });
    expect(delayStatus(-420, 'realtime').label).toBe('7 min early');
  });
});

describe('isAlertActive', () => {
  it('no stated period = in force', () => {
    expect(isAlertActive(alert(), NOW)).toBe(true);
  });
  it('a period covering now is active; a past period is not; a future one has not started', () => {
    expect(isAlertActive(alert({ periods: [{ startMs: NOW - 1000, endMs: NOW + 1000 }] }), NOW)).toBe(true);
    expect(isAlertActive(alert({ periods: [{ startMs: NOW - 5000, endMs: NOW - 1000 }] }), NOW)).toBe(false);
    expect(isAlertActive(alert({ periods: [{ startMs: NOW + 1000, endMs: null }] }), NOW)).toBe(false);
    expect(isAlertActive(alert({ periods: [{ startMs: null, endMs: null }] }), NOW)).toBe(true);
  });
});

describe('routeStatusFromAlerts — classification from feed fields', () => {
  it('no alerts (or none active) is Normal service', () => {
    expect(routeStatusFromAlerts([], NOW).status).toBe('normal');
    const past = alert({ effect: 'DETOUR', periods: [{ startMs: NOW - 9000, endMs: NOW - 1000 }] });
    expect(routeStatusFromAlerts([past], NOW)).toMatchObject({ status: 'normal', alerts: [] });
  });

  it('DETOUR effect is On detour', () => {
    const st = routeStatusFromAlerts([alert({ effect: 'DETOUR' })], NOW);
    expect(st).toMatchObject({ status: 'detour', label: 'On detour' });
  });

  it('a header that says detour is On detour even without the DETOUR effect', () => {
    const st = routeStatusFromAlerts(
      [alert({ effect: 'OTHER_CAUSE', header: 'Route 200 detour via State St' })], NOW);
    expect(st.status).toBe('detour');
  });

  it('NO_SERVICE is Suspended and outranks a detour', () => {
    const st = routeStatusFromAlerts(
      [alert({ effect: 'DETOUR' }), alert({ effect: 'NO_SERVICE', header: 'No service today' })], NOW);
    expect(st).toMatchObject({ status: 'suspended', label: 'Suspended' });
  });

  it('REDUCED_SERVICE is Reduced service; MODIFIED_SERVICE is disrupted as Modified', () => {
    expect(routeStatusFromAlerts([alert({ effect: 'REDUCED_SERVICE' })], NOW))
      .toMatchObject({ status: 'reduced', label: 'Reduced service' });
    expect(routeStatusFromAlerts([alert({ effect: 'MODIFIED_SERVICE' })], NOW))
      .toMatchObject({ status: 'reduced', label: 'Modified service' });
  });

  it('SIGNIFICANT_DELAYS stays an alert-grade disruption, other effects are generic alerts', () => {
    expect(routeStatusFromAlerts([alert({ effect: 'SIGNIFICANT_DELAYS' })], NOW))
      .toMatchObject({ status: 'alert', label: 'Significant delays' });
    expect(routeStatusFromAlerts([alert({ effect: 'OTHER_CAUSE' })], NOW).status).toBe('alert');
  });

  it('detour outranks reduced service', () => {
    const st = routeStatusFromAlerts(
      [alert({ effect: 'REDUCED_SERVICE' }), alert({ effect: 'DETOUR' })], NOW);
    expect(st.status).toBe('detour');
  });
});

describe('matching helpers', () => {
  const a = alert({ routeIds: ['65123'], routes: ['200'], stopIds: ['STP1'] });
  it('matches a route by internal id or public label', () => {
    expect(alertsMatchingRoute([a], { id: '65123', short: '999' })).toHaveLength(1);
    expect(alertsMatchingRoute([a], { id: 'x', short: '200' })).toHaveLength(1);
    expect(alertsMatchingRoute([a], { id: 'x', short: '201' })).toHaveLength(0);
  });
  it('matches a stop directly or through a serving route', () => {
    expect(alertsMatchingStop([a], 'STP1', [])).toHaveLength(1);
    expect(alertsMatchingStop([a], 'OTHER', ['200'])).toHaveLength(1);
    expect(alertsMatchingStop([a], 'OTHER', ['201'])).toHaveLength(0);
  });
  it('system-wide means addressed to no route and no stop', () => {
    expect(isSystemWide(alert())).toBe(true);
    expect(isSystemWide(a)).toBe(false);
    expect(isSystemWide(alert({ stopIds: ['S1'] }))).toBe(false);
    // route-scoped to an id that never resolved to a label is NOT system-wide
    expect(isSystemWide(alert({ routeIds: ['99999'] }))).toBe(false);
  });
});

describe('buildServiceBoard — grouping', () => {
  const routes = [
    { id: 'r200', short: '200' },
    { id: 'r701', short: '701' },
    { id: 'r9', short: '9' },
    { id: 'r17', short: '17' },
  ];
  const alerts: StatusAlertLike[] = [
    alert({ header: '200 on detour', effect: 'DETOUR', routeIds: ['r200'], routes: ['200'] }),
    alert({ header: '701 suspended', effect: 'NO_SERVICE', routeIds: ['r701'], routes: ['701'] }),
    alert({ header: '9 reduced', effect: 'REDUCED_SERVICE', routeIds: ['r9'], routes: ['9'] }),
    alert({ header: 'System-wide advisory', effect: 'OTHER_CAUSE' }),
    alert({ header: 'Expired detour', effect: 'DETOUR', routeIds: ['r17'], routes: ['17'],
      periods: [{ startMs: NOW - 9000, endMs: NOW - 1000 }] }),
  ];

  it('groups detours, disruptions and system-wide alerts; expired alerts vanish', () => {
    const board = buildServiceBoard(alerts, routes, NOW);
    expect(board.detour.map(b => b.route.short)).toEqual(['200']);
    expect(board.disrupted.map(b => b.route.short)).toEqual(['701', '9']);
    expect(board.systemWide.map(a => a.header)).toEqual(['System-wide advisory']);
    expect(boardHasNews(board)).toBe(true);
  });

  it('a quiet feed produces an empty board', () => {
    const board = buildServiceBoard([], routes, NOW);
    expect(board).toEqual({ detour: [], disrupted: [], systemWide: [] });
    expect(boardHasNews(board)).toBe(false);
  });
});

describe('parseAlerts — stop ids are captured alongside routes', () => {
  it('keeps stopId entities out of routeIds but records them as stopIds', () => {
    const msg = {
      entity: [{
        id: 'x1',
        alert: {
          informedEntity: [{ routeId: '93610' }, { stopId: '1234' }, { routeId: '93610', stopId: '99' }],
          headerText: { translation: [{ text: 'Stop moved', language: 'en' }] },
        },
      }],
    };
    const [a] = parseAlerts(msg, new Map([['93610', '126']]));
    expect(a.routeIds).toEqual(['93610']);
    expect(a.stopIds).toEqual(['1234', '99']);
    expect(a.routes).toEqual(['126']);
  });
});
