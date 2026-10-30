import { describe, it, expect } from 'vitest';
import {
  haversineM,
  routeStops,
  nearestStop,
  directionsServing,
  directionsServingJourney,
  alightingStop,
  rideLineFrom,
  rideLineBetween,
  journeyGeometry,
  type PlannerDirection,
} from './stop-finder';

// Downtown Crossing and State station, from the MBTA Orange Line's
// published GTFS stop list (the planner's live test route).
const downtownCrossing = { id: '70020', name: 'Downtown Crossing', lat: 42.35554, lng: -71.06022 };
const state = { id: '70022', name: 'State', lat: 42.35898, lng: -71.0576 };
const oakGrove = { id: '70036', name: 'Oak Grove', lat: 42.43774, lng: -71.07087 };
const forestHills = { id: '70001', name: 'Forest Hills', lat: 42.30052, lng: -71.11368 };

const directions: PlannerDirection[] = [
  {
    dir: 0,
    headsign: 'Forest Hills',
    stops: [oakGrove, state, downtownCrossing, forestHills],
    line: [
      [-71.07087, 42.43774],
      [-71.0576, 42.35898],
      [-71.06022, 42.35554],
      [-71.11368, 42.30052],
    ],
  },
  {
    dir: 1,
    headsign: 'Oak Grove',
    stops: [forestHills, downtownCrossing, state, oakGrove],
    line: [
      [-71.11368, 42.30052],
      [-71.06022, 42.35554],
      [-71.0576, 42.35898],
      [-71.07087, 42.43774],
    ],
  },
];

describe('haversineM', () => {
  it('measures a known city pair to within a percent', () => {
    // Downtown Crossing → Oak Grove is ≈ 9.2 km great-circle.
    const m = haversineM(downtownCrossing, oakGrove);
    expect(m).toBeGreaterThan(9000);
    expect(m).toBeLessThan(9400);
  });
  it('is zero for the same point', () => {
    expect(haversineM(state, state)).toBe(0);
  });
});

describe('routeStops', () => {
  it('dedupes stops served by both directions, first-seen order', () => {
    const stops = routeStops(directions);
    expect(stops.map((s) => s.id)).toEqual(['70036', '70022', '70020', '70001']);
  });
  it('is empty for a route with no directions', () => {
    expect(routeStops([])).toEqual([]);
  });
});

describe('nearestStop', () => {
  it('finds Downtown Crossing for an address beside it', () => {
    // 100 Washington St, Boston — a few steps from Downtown Crossing.
    const hit = nearestStop(routeStops(directions), { lat: 42.3559, lng: -71.0598 });
    expect(hit?.stop.id).toBe('70020');
    expect(hit!.distanceM).toBeLessThan(120);
  });
  it('skips stops without usable coordinates', () => {
    const broken = [{ id: 'x', name: 'Nowhere', lat: Number.NaN, lng: 0 }];
    expect(nearestStop(broken, { lat: 42, lng: -71 })).toBeNull();
  });
  it('is null for an empty stop list', () => {
    expect(nearestStop([], { lat: 42, lng: -71 })).toBeNull();
  });
});

describe('directionsServing', () => {
  it('returns both directions for a mid-line stop', () => {
    expect(directionsServing(directions, '70020')).toEqual([0, 1]);
  });
  it('returns one direction for a terminus-only pattern', () => {
    const oneWay: PlannerDirection[] = [directions[0]];
    expect(directionsServing(oneWay, '70036')).toEqual([0]);
    expect(directionsServing(oneWay, 'nope')).toEqual([]);
  });
});

describe('rideLineFrom', () => {
  it('slices the shape from the boarding stop to the terminus', () => {
    const ride = rideLineFrom(directions[0].line, downtownCrossing);
    expect(ride[0]).toEqual([-71.06022, 42.35554]);
    expect(ride[ride.length - 1]).toEqual([-71.11368, 42.30052]);
    expect(ride.length).toBe(2);
  });
  it('keeps the whole shape when boarding at the first stop', () => {
    const ride = rideLineFrom(directions[0].line, oakGrove);
    expect(ride.length).toBe(4);
    expect(ride[0]).toEqual([-71.07087, 42.43774]);
  });
  it('degrades to the stop point for a shapeless direction', () => {
    expect(rideLineFrom([], state)).toEqual([[-71.0576, 42.35898]]);
    expect(rideLineFrom([[-71.0576, 42.35898]], state)).toEqual([[-71.0576, 42.35898]]);
  });
});

describe('directionsServingJourney', () => {
  it('finds the one direction carrying board → alight in order', () => {
    expect(directionsServingJourney(directions, '70020', '70001')).toEqual([0]);
    expect(directionsServingJourney(directions, '70001', '70020')).toEqual([1]);
  });
  it('is empty when no direction orders the pair that way', () => {
    expect(directionsServingJourney(directions, '70020', '70020')).toEqual([]);
    expect(directionsServingJourney(directions, '70020', 'nope')).toEqual([]);
  });
});

describe('alightingStop', () => {
  it('picks the later stop nearest the destination', () => {
    // Destination beside Forest Hills; boarding at Downtown
    // Crossing toward Forest Hills — Forest Hills is the only
    // later stop and must be named.
    const hit = alightingStop(directions[0], '70020', { lat: 42.301, lng: -71.112 });
    expect(hit?.stop.id).toBe('70001');
    expect(hit?.stopsRidden).toBe(1);
  });
  it('never picks a stop at or before the boarding stop', () => {
    // Destination beside Downtown Crossing; boarding at Oak Grove
    // toward Forest Hills — Downtown Crossing is ahead and wins
    // over the nearer-in-space but behind-you alternatives.
    const hit = alightingStop(directions[0], '70036', { lat: 42.3559, lng: -71.0598 });
    expect(hit?.stop.id).toBe('70020');
    expect(hit?.stopsRidden).toBe(2);
  });
  it('is null when boarding at the terminus (no later stop)', () => {
    expect(alightingStop(directions[0], '70001', { lat: 42.3, lng: -71.1 })).toBeNull();
  });
  it('is null when the boarding stop is not on the direction', () => {
    expect(alightingStop(directions[0], 'nope', { lat: 42.3, lng: -71.1 })).toBeNull();
  });
});

describe('rideLineBetween', () => {
  it('slices the shape between the two stops, bracketed by the stops', () => {
    const ride = rideLineBetween(directions[0].line, state, forestHills);
    expect(ride[0]).toEqual([-71.0576, 42.35898]);
    expect(ride[ride.length - 1]).toEqual([-71.11368, 42.30052]);
    // passes Downtown Crossing's vertex on the way
    expect(ride).toContainEqual([-71.06022, 42.35554]);
  });
  it('degrades to the straight segment when the shape orders backwards', () => {
    const ride = rideLineBetween(directions[0].line, forestHills, state);
    expect(ride).toEqual([
      [-71.11368, 42.30052],
      [-71.0576, 42.35898],
    ]);
  });
  it('is a single point when board and alight are the same stop', () => {
    expect(rideLineBetween(directions[0].line, state, state)).toEqual([[-71.0576, 42.35898]]);
  });
});

describe('journeyGeometry', () => {
  it('joins walk and ride without duplicating the stop joint', () => {
    const walk: [number, number][] = [
      [-71.0598, 42.3559],
      [-71.06022, 42.35554],
    ];
    const ride: [number, number][] = [
      [-71.06022, 42.35554],
      [-71.11368, 42.30052],
    ];
    expect(journeyGeometry(walk, ride)).toEqual([
      [-71.0598, 42.3559],
      [-71.06022, 42.35554],
      [-71.11368, 42.30052],
    ]);
  });
  it('tolerates either side being empty', () => {
    const ride: [number, number][] = [[-71.06, 42.35]];
    expect(journeyGeometry([], ride)).toEqual(ride);
    expect(journeyGeometry(ride, [])).toEqual(ride);
  });
});
