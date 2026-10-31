import { describe, expect, it } from 'vitest';
import { decodeSatelliteRows, encodeSatelliteRows, type SatelliteRow } from './satellite-payload';

const ROWS: SatelliteRow[] = [
  { name: 'ISS (ZARYA)', lat: 12.3456, lng: -45.6789, alt: 418, mission: 'Space Station', color: '#FFD700', category: 'science', noradId: '25544' },
  { name: 'STARLINK-1007', lat: -3.769, lng: 172.5773, alt: 550, mission: 'Commercial Comms', color: '#00E676', category: 'comms', noradId: '44235' },
  { name: 'STARLINK-1008', lat: 1.071, lng: 68.9352, alt: 551, mission: 'Commercial Comms', color: '#00E676', category: 'comms', noradId: '44236' },
  { name: 'CALSPHERE 1', lat: 0, lng: 0, alt: 20022, mission: 'Unknown', color: '#00E5FF', category: 'other', noradId: '00900' },
];

describe('encodeSatelliteRows', () => {
  it('dictionary-encodes repeated missions and categories', () => {
    const { missions, categories, rows } = encodeSatelliteRows(ROWS);
    // Two Starlinks share one legend entry; the ISS and the unknown are their own.
    expect(missions).toEqual([
      ['Space Station', '#FFD700'],
      ['Commercial Comms', '#00E676'],
      ['Unknown', '#00E5FF'],
    ]);
    expect(categories).toEqual(['science', 'comms', 'other']);
    expect(rows[1]).toEqual(['STARLINK-1007', -3.769, 172.5773, 550, 1, 1, '44235']);
    expect(rows[2][4]).toBe(rows[1][4]); // same mission index
    expect(rows[2][5]).toBe(rows[1][5]); // same category index
  });

  it('keeps same-mission rows with different colours apart', () => {
    const odd: SatelliteRow[] = [
      { ...ROWS[1], color: '#111111' },
      { ...ROWS[2], color: '#222222' },
    ];
    const { missions } = encodeSatelliteRows(odd);
    expect(missions).toHaveLength(2);
  });
});

describe('decodeSatelliteRows', () => {
  it('round-trips v2 rows back to the exact v1 objects', () => {
    const { missions, categories, rows } = encodeSatelliteRows(ROWS);
    const body = { v: 2, missions, categories, satellites: rows };
    expect(decodeSatelliteRows(body)).toEqual(ROWS);
  });

  it('passes v1 object rows through with their fields intact', () => {
    expect(decodeSatelliteRows({ satellites: ROWS })).toEqual(ROWS);
  });

  it('fills defaults for sparse v1 rows instead of emitting undefined', () => {
    const [row] = decodeSatelliteRows({ satellites: [{ name: 'X', lat: 1, lng: 2 }] });
    expect(row).toEqual({
      name: 'X', lat: 1, lng: 2, alt: 0,
      mission: 'Unknown', color: '#00E5FF', category: 'other', noradId: '',
    });
  });

  it('returns [] for junk bodies', () => {
    expect(decodeSatelliteRows(null)).toEqual([]);
    expect(decodeSatelliteRows('nope')).toEqual([]);
    expect(decodeSatelliteRows({})).toEqual([]);
    expect(decodeSatelliteRows({ satellites: 'nope' })).toEqual([]);
  });

  it('skips rows without numeric coordinates but keeps the rest', () => {
    const { missions, categories, rows } = encodeSatelliteRows(ROWS);
    const mangled = [...rows];
    mangled[1] = ['BROKEN', 'x' as unknown as number, 0, 0, 0, 0, '1'];
    const decoded = decodeSatelliteRows({ missions, categories, satellites: mangled });
    expect(decoded.map(r => r.name)).toEqual(['ISS (ZARYA)', 'STARLINK-1008', 'CALSPHERE 1']);
  });
});

describe('lookahead positions (motion)', () => {
  const MOVING: SatelliteRow[] = [
    { ...ROWS[0], lat2: 13.9, lng2: -41.2 },
    { ...ROWS[1] },                       // no lookahead — keeps its 7-slot shape
    { ...ROWS[2], lat2: 2.4 },            // half a pair — not a vector, dropped
  ];

  it('appends the lookahead slots only to rows that carry a full pair', () => {
    const { rows } = encodeSatelliteRows(MOVING);
    expect(rows[0]).toEqual(['ISS (ZARYA)', 12.3456, -45.6789, 418, 0, 0, '25544', 13.9, -41.2]);
    expect(rows[1]).toHaveLength(7);
    expect(rows[2]).toHaveLength(7);
  });

  it('round-trips lookahead positions back onto the row objects', () => {
    const { missions, categories, rows } = encodeSatelliteRows(MOVING);
    const decoded = decodeSatelliteRows({ v: 2, missions, categories, satellites: rows });
    expect(decoded[0].lat2).toBe(13.9);
    expect(decoded[0].lng2).toBe(-41.2);
    expect(decoded[1].lat2).toBeUndefined();
    expect(decoded[2].lat2).toBeUndefined();
  });

  it('drops a wire row whose lookahead is only half present', () => {
    const body = {
      missions: [['Space Station', '#FFD700']],
      categories: ['science'],
      satellites: [['ISS (ZARYA)', 12.3456, -45.6789, 418, 0, 0, '25544', 13.9]],
    };
    const [row] = decodeSatelliteRows(body);
    expect(row.lat2).toBeUndefined();
    expect(row.lng2).toBeUndefined();
  });

  it('passes lookahead positions through on v1 object rows', () => {
    const [row] = decodeSatelliteRows({ satellites: [{ ...ROWS[0], lat2: 1, lng2: 2 }] });
    expect(row.lat2).toBe(1);
    expect(row.lng2).toBe(2);
  });
});
