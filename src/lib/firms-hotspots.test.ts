import { describe, expect, it } from 'vitest';
import { parseFirmsCsv, summariseHotspotsNear, type FirmsHotspot } from './firms-hotspots';

/**
 * FIRMS parsing + near-point summaries. The fixture header is the
 * real VIIRS C2 CSV header (bright_ti4 shape); the MODIS shape
 * (brightness) is pinned too, because the fallback feed uses it.
 * The honesty rule under test: detections are counted as
 * detections, inside exactly the stated radius — nothing is named,
 * merged or promoted into an incident here.
 */

const VIIRS_HEADER =
  'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp';
const MODIS_HEADER =
  'latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp';

const VIIRS_CSV = [
  VIIRS_HEADER,
  '40.100,-104.900,310.5,0.4,0.4,2026-10-28,0825,N,h,2.0,290.1,12.5',
  '40.500,-104.500,320.0,0.4,0.4,2026-10-28,0910,N,n,2.0,295.0,40.25',
  '41.500,-105.500,330.0,0.4,0.4,2026-10-27,2330,N,l,2.0,300.0,99.9',
  'not-a-number,-104.0,300,0.4,0.4,2026-10-28,0000,N,h,2.0,290,1',
].join('\n');

describe('parseFirmsCsv', () => {
  it('parses the VIIRS shape and skips unparseable rows', () => {
    const out = parseFirmsCsv(VIIRS_CSV);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({
      lat: 40.1,
      lng: -104.9,
      brightness: 310.5,
      confidence: 'h',
      acqDate: '2026-10-28',
      acqTime: '0825',
      frp: 12.5,
    });
  });

  it('parses the MODIS brightness shape (the fallback feed)', () => {
    const csv = [MODIS_HEADER, '35.0,-90.0,305.2,1.0,1.0,2026-10-28,0500,T,80,6.1,290,7.5'].join('\n');
    const out = parseFirmsCsv(csv);
    expect(out).toHaveLength(1);
    expect(out[0].brightness).toBe(305.2);
    expect(out[0].confidence).toBe('80');
  });

  it('returns nothing for a headerless or empty body', () => {
    expect(parseFirmsCsv('')).toEqual([]);
    expect(parseFirmsCsv('some,error,page')).toEqual([]);
  });

  it('does not sample: every parseable row survives', () => {
    const rows = [VIIRS_HEADER];
    for (let i = 0; i < 5000; i++) {
      rows.push(`40.0,-104.0,300,0.4,0.4,2026-10-28,0000,N,h,2.0,290,1`);
    }
    expect(parseFirmsCsv(rows.join('\n'))).toHaveLength(5000);
  });
});

describe('summariseHotspotsNear', () => {
  const hotspots: FirmsHotspot[] = parseFirmsCsv(VIIRS_CSV);

  it('counts only detections inside the stated radius', () => {
    // Centre on the first detection: the second is ~57 km away,
    // the third ~160 km — a 25 km rule admits exactly one.
    const s = summariseHotspotsNear(hotspots, 40.1, -104.9, 25);
    expect(s.count).toBe(1);
    expect(s.maxFrp).toBe(12.5);
    expect(s.latest).toBe('2026-10-28 08:25');
  });

  it('widens honestly with the radius and reports the strongest + latest', () => {
    const s = summariseHotspotsNear(hotspots, 40.1, -104.9, 200);
    expect(s.count).toBe(3);
    expect(s.maxFrp).toBe(99.9);
    expect(s.latest).toBe('2026-10-28 09:10');
  });

  it('returns nulls for an empty neighbourhood', () => {
    const s = summariseHotspotsNear(hotspots, 30, -90, 25);
    expect(s).toEqual({ count: 0, maxFrp: null, latest: null });
  });
});
