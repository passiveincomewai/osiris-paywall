import { describe, it, expect } from 'vitest';
import { parseNetwork, zonedMidnightMs, type TransitNetwork } from './network';
import { indexTripPredictions, nextArrivals } from './arrivals';

const TZ = 'America/Denver';
const TUE = '20261020';
const BASE = zonedMidnightMs(TUE, TZ);

const net: TransitNetwork = parseNetwork({
  routes: [
    'route_id,route_short_name,route_long_name,route_type,route_color',
    'R1,701,Blue Line,0,0076BC',
  ].join('\n'),
  stops: [
    'stop_id,stop_name,stop_lat,stop_lon',
    'A,Alpha,40.0,-111.0',
    'B,Beta,40.01,-111.0',
    'C,Gamma,40.02,-111.005',
  ].join('\n'),
  trips: [
    'route_id,service_id,trip_id,trip_headsign,direction_id,shape_id',
    'R1,WKD,T1,Downtown,0,',
    'R1,WKD,T2,Downtown,0,',
  ].join('\n'),
  stopTimes: [
    'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
    'T1,08:00:00,08:00:00,A,1',
    'T1,08:10:00,08:10:00,B,2',
    'T1,08:20:00,08:20:00,C,3',
    'T2,09:00:00,09:00:00,A,1',
    'T2,09:10:00,09:10:00,B,2',
    'T2,09:20:00,09:20:00,C,3',
  ].join('\n'),
  calendar: [
    'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
    'WKD,1,1,1,1,1,0,0,20260101,20261231',
  ].join('\n'),
});

/** A decoded-feed-shaped object: T1's stop-2 prediction is 5 min late
 *  with an absolute time; T2's stop-2 prediction is delay-only. */
function feedMsg(feedTsS: number) {
  const t1B = (BASE + (8 * 3600 + 10 * 60) * 1000) / 1000;
  return {
    header: { timestamp: feedTsS },
    entity: [
      {
        tripUpdate: {
          trip: { tripId: 'T1' },
          stopTimeUpdate: [{ stopSequence: 2, arrival: { time: t1B + 300, delay: 300 } }],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'T2' },
          stopTimeUpdate: [{ stopSequence: 2, departure: { delay: 120 } }],
        },
      },
    ],
  };
}

const NOW = BASE + (7 * 3600 + 55 * 60) * 1000; // Tue 07:55 Denver

describe('indexTripPredictions', () => {
  it('indexes predictions by trip and stop sequence', () => {
    const preds = indexTripPredictions(feedMsg(Math.floor(NOW / 1000) - 30));
    expect(preds.feedTsS).toBe(Math.floor(NOW / 1000) - 30);
    expect(preds.byTrip.get('T1')?.get(2)?.delayS).toBe(300);
    expect(preds.byTrip.get('T2')?.get(2)?.delayS).toBe(120);
  });
});

describe('nextArrivals', () => {
  it('labels feed-backed times realtime and the rest scheduled', () => {
    const preds = indexTripPredictions(feedMsg(Math.floor(NOW / 1000) - 30));
    const { arrivals, rtLive, rtAgeS } = nextArrivals(net, 'B', preds, NOW, TZ);
    expect(rtLive).toBe(true);
    expect(rtAgeS).toBe(30);
    expect(arrivals.length).toBe(2);
    // T1: feed's absolute time wins (08:10 + 5 min), delay stated.
    expect(arrivals[0].basis).toBe('realtime');
    expect(arrivals[0].timeMs).toBe(BASE + (8 * 3600 + 15 * 60) * 1000);
    expect(arrivals[0].delayS).toBe(300);
    // T2: delay-only prediction applies to the timetable time.
    expect(arrivals[1].basis).toBe('realtime');
    expect(arrivals[1].timeMs).toBe(BASE + (9 * 3600 + 12 * 60) * 1000);
    expect(arrivals[1].delayS).toBe(120);
    expect(arrivals.every(a => a.routeShort === '701')).toBe(true);
  });

  it('falls back to labeled scheduled times when the feed is stale', () => {
    const stale = indexTripPredictions(feedMsg(Math.floor(NOW / 1000) - 600)); // 10 min old
    const { arrivals, rtLive } = nextArrivals(net, 'B', stale, NOW, TZ);
    expect(rtLive).toBe(false);
    expect(arrivals.length).toBe(2);
    expect(arrivals.every(a => a.basis === 'scheduled')).toBe(true);
    expect(arrivals[0].timeMs).toBe(BASE + (8 * 3600 + 10 * 60) * 1000);
  });

  it('serves scheduled arrivals with no feed at all', () => {
    const { arrivals, rtLive, rtAgeS } = nextArrivals(net, 'B', null, NOW, TZ);
    expect(rtLive).toBe(false);
    expect(rtAgeS).toBeNull();
    expect(arrivals.map(a => a.basis)).toEqual(['scheduled', 'scheduled']);
  });

  it('returns an honest empty list outside service hours', () => {
    const late = BASE + 23 * 3600000; // 23:00 — both trips long gone
    const { arrivals } = nextArrivals(net, 'B', null, late, TZ);
    expect(arrivals).toEqual([]);
  });
});
