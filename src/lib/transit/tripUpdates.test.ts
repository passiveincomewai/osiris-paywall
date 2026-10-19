import { describe, it, expect } from 'vitest';
import { indexTripDelays, delayForTrip, upcomingStop, vehicleDelayAndStop } from './tripUpdates';

const NOW = 1_800_000_000; // fixed epoch-seconds "now" for time-based tests

/** Fixture shaped like a decoded GTFS-RT FeedMessage. */
const FEED = {
  entity: [
    {
      id: 'e1',
      tripUpdate: {
        trip: { tripId: 'T1' },
        stopTimeUpdate: [
          { stopSequence: 1, arrival: { delay: 0, time: NOW - 600 } },
          { stopSequence: 5, arrival: { delay: 240, time: NOW + 300 } },
          { stopSequence: 9, departure: { delay: 600 } },
        ],
      },
    },
    {
      id: 'e2', // duplicate entity for T1 — the first entity must win
      tripUpdate: {
        trip: { tripId: 'T1' },
        stopTimeUpdate: [{ stopSequence: 5, arrival: { delay: 9999 } }],
      },
    },
    {
      id: 'e3',
      tripUpdate: {
        trip: { tripId: 'T2' },
        stopTimeUpdate: [{ stopSequence: 3, arrival: { delay: -120 } }],
      },
    },
    { id: 'e4', vehicle: { trip: { tripId: 'T9' } } }, // not a trip update
    { id: 'e5', tripUpdate: { trip: {}, stopTimeUpdate: [] } }, // no trip id
  ],
};

describe('indexTripDelays', () => {
  const index = indexTripDelays(FEED);
  it('indexes by trip and records first + per-stop delays', () => {
    expect(index.get('T1')?.first).toBe(0);
    expect(index.get('T1')?.bySeq.get(5)).toBe(240);
    expect(index.get('T1')?.bySeq.get(9)).toBe(600); // departure delay when no arrival delay
    expect(index.get('T2')?.first).toBe(-120);
  });
  it('ignores non-trip-update entities and trip-less updates', () => {
    expect(index.has('T9')).toBe(false);
    expect(index.size).toBe(2);
  });
});

describe('delayForTrip', () => {
  const index = indexTripDelays(FEED);
  it("prefers the delay at the vehicle's own stop sequence", () => {
    expect(delayForTrip(index, 'T1', 5)).toBe(240);
    expect(delayForTrip(index, 'T1', 9)).toBe(600);
  });
  it('falls back to the first delay for an unmatched or unknown sequence', () => {
    expect(delayForTrip(index, 'T1', 7)).toBe(0);
    expect(delayForTrip(index, 'T1', undefined)).toBe(0);
  });
  it('returns undefined for unknown trips', () => {
    expect(delayForTrip(index, 'NOPE', 1)).toBeUndefined();
    expect(delayForTrip(index, undefined, 1)).toBeUndefined();
  });
});

describe('upcomingStop', () => {
  const index = indexTripDelays(FEED);
  it('returns the first stop whose predicted arrival is not yet past', () => {
    expect(upcomingStop(index, 'T1', NOW)?.seq).toBe(5);
  });
  it('applies a 60 s grace to a just-passed prediction', () => {
    expect(upcomingStop(index, 'T1', NOW + 330)?.seq).toBe(5); // arrival NOW+300, now = +330 → within grace
    expect(upcomingStop(index, 'T1', NOW + 361)).toBeUndefined(); // beyond grace; seq 9 has no time
  });
  it('returns undefined when all predictions are past or the trip is unknown', () => {
    expect(upcomingStop(index, 'T2', NOW)).toBeUndefined(); // T2's STU has no arrival time
    expect(upcomingStop(index, 'NOPE', NOW)).toBeUndefined();
  });
});

describe('vehicleDelayAndStop', () => {
  const index = indexTripDelays(FEED);
  it('uses the vehicle sequence when it matches a predicted stop', () => {
    expect(vehicleDelayAndStop(index, 'T1', 9, NOW)).toEqual({ delay: 600, stopSeq: 9 });
  });
  it('derives the upcoming stop when the position feed has no sequence (UTA seq=0)', () => {
    expect(vehicleDelayAndStop(index, 'T1', 0, NOW)).toEqual({ delay: 240, stopSeq: 5 });
    expect(vehicleDelayAndStop(index, 'T1', undefined, NOW)).toEqual({ delay: 240, stopSeq: 5 });
  });
  it('falls back to the first delay when no prediction is upcoming', () => {
    expect(vehicleDelayAndStop(index, 'T2', undefined, NOW)).toEqual({ delay: -120, stopSeq: undefined });
  });
  it('returns empty for unknown trips', () => {
    expect(vehicleDelayAndStop(index, 'NOPE', 3, NOW)).toEqual({});
  });
});
