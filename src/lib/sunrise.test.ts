import { describe, expect, it } from 'vitest';
import {
  normalizeLng,
  selectSunCameras,
  sunBandCenterLng,
  sunElevationDeg,
  sunEventOffsetMinutes,
  sunTermsAt,
  type SunCameraInput,
} from './sunrise';

/**
 * Expected values are derived by hand from the model the module documents
 * (the globe's own approximation: δ = −23.44°·cos(2π/365·(doy+10)),
 * subsolar longitude (12 − UTC hours)·15°, event elevation −0.833°).
 * They pin the MODEL, not an almanac — the site deliberately runs one
 * solar model everywhere, so the tests assert that model's arithmetic.
 */

const OCT24_NOON = new Date('2026-10-24T12:00:00Z'); // subsolar lng 0, δ ≈ −12.72°
const EQUINOX_NOON = new Date('2026-03-20T12:00:00Z'); // subsolar lng 0, δ ≈ −0.92°

describe('normalizeLng', () => {
  it('wraps into (−180, 180]', () => {
    expect(normalizeLng(0)).toBe(0);
    expect(normalizeLng(180)).toBe(180);
    expect(normalizeLng(-180)).toBe(180);
    expect(normalizeLng(270)).toBe(-90);
    expect(normalizeLng(-270)).toBe(90);
    expect(normalizeLng(540)).toBe(180);
  });
});

describe('sunTermsAt', () => {
  it('puts the subsolar point on the Greenwich meridian at 12:00 UTC', () => {
    expect(sunTermsAt(OCT24_NOON).subsolarLng).toBe(0);
  });

  it('moves the subsolar point 15° per hour', () => {
    expect(sunTermsAt(new Date('2026-10-24T06:00:00Z')).subsolarLng).toBe(90);
    expect(sunTermsAt(new Date('2026-10-24T18:00:00Z')).subsolarLng).toBe(-90);
    expect(sunTermsAt(new Date('2026-10-24T00:00:00Z')).subsolarLng).toBe(180);
  });

  it('declination matches the shared model in late October', () => {
    // −23.44 · cos(2π/365 · 307) ≈ −12.72
    expect(sunTermsAt(OCT24_NOON).declinationDeg).toBeCloseTo(-12.72, 1);
  });

  it('declination is near zero at the March equinox and ±23.44 at solstices', () => {
    expect(Math.abs(sunTermsAt(EQUINOX_NOON).declinationDeg)).toBeLessThan(1.5);
    expect(sunTermsAt(new Date('2026-06-21T12:00:00Z')).declinationDeg).toBeGreaterThan(23);
    expect(sunTermsAt(new Date('2026-12-21T12:00:00Z')).declinationDeg).toBeLessThan(-23);
  });
});

describe('sunBandCenterLng', () => {
  it('at 12:00 UTC the sunrise line sits at −90° and sunset at +90°', () => {
    expect(sunBandCenterLng(EQUINOX_NOON, 'sunrise')).toBe(-90);
    expect(sunBandCenterLng(EQUINOX_NOON, 'sunset')).toBe(90);
  });

  it('the band follows the subsolar point westward', () => {
    const t = new Date('2026-10-24T15:00:00Z'); // subsolar −45
    expect(sunBandCenterLng(t, 'sunrise')).toBe(-135);
    expect(sunBandCenterLng(t, 'sunset')).toBe(45);
  });
});

describe('sunElevationDeg', () => {
  it('is ~89° at the equator under a near-equinox noon sun', () => {
    expect(sunElevationDeg(0, 0, EQUINOX_NOON)).toBeCloseTo(89.1, 0);
  });

  it('is deep negative on the night side', () => {
    expect(sunElevationDeg(0, 180, EQUINOX_NOON)).toBeCloseTo(-89.1, 0);
  });

  it('is ~0° on the geometric terminator', () => {
    expect(Math.abs(sunElevationDeg(0, -90, EQUINOX_NOON))).toBeLessThan(1);
  });
});

describe('sunEventOffsetMinutes', () => {
  it('equator at equinox: sunrise at −90° happened ~3 minutes before noon UTC', () => {
    // The −0.833° limb definition puts the event slightly ahead of the
    // geometric terminator: offset ≈ −3.3 min.
    const off = sunEventOffsetMinutes(0, -90, EQUINOX_NOON, 'sunrise');
    expect(off).not.toBeNull();
    expect(off!).toBeCloseTo(-3.3, 0);
  });

  it('equator at equinox: sunset at +90° is ~3 minutes after noon UTC', () => {
    const off = sunEventOffsetMinutes(0, 90, EQUINOX_NOON, 'sunset');
    expect(off).not.toBeNull();
    expect(off!).toBeCloseTo(3.3, 0);
  });

  it('London sunrise on 2026-10-24 falls at ~07:01 UTC by the model', () => {
    const off = sunEventOffsetMinutes(51.5, -0.13, new Date('2026-10-24T00:00:00Z'), 'sunrise');
    expect(off).not.toBeNull();
    expect(off!).toBeCloseTo(420.8, 0); // 00:00 + ~421 min ≈ 07:01 UTC
  });

  it('the offset grows by ~4 minutes per degree east of the band', () => {
    const a = sunEventOffsetMinutes(40, -90, OCT24_NOON, 'sunrise')!;
    const b = sunEventOffsetMinutes(40, -80, OCT24_NOON, 'sunrise')!;
    expect(a - b).toBeCloseTo(40, 0); // 10° further west = 40 min later sunrise
  });

  it('returns null in polar day and polar night', () => {
    expect(sunEventOffsetMinutes(80, 0, new Date('2026-06-21T12:00:00Z'), 'sunrise')).toBeNull();
    expect(sunEventOffsetMinutes(80, 0, new Date('2026-06-21T12:00:00Z'), 'sunset')).toBeNull();
    expect(sunEventOffsetMinutes(80, 0, new Date('2026-12-21T12:00:00Z'), 'sunrise')).toBeNull();
    expect(sunEventOffsetMinutes(-80, 0, new Date('2026-06-21T12:00:00Z'), 'sunrise')).toBeNull();
  });

  it('returns null at the poles themselves', () => {
    expect(sunEventOffsetMinutes(90, 0, OCT24_NOON, 'sunrise')).toBeNull();
    expect(sunEventOffsetMinutes(-90, 0, OCT24_NOON, 'sunset')).toBeNull();
  });
});

/* Selection scenario at 2026-10-24 12:00 UTC (δ ≈ −12.72°, subsolar 0°).
 * At latitude 40° the model's sunrise offset is noonOffset − 320.9 min,
 * so a camera's offset is (0 − lng)·4 − 320.9. */
const jpg = (partial: Partial<SunCameraInput>): SunCameraInput => ({
  stream_type: 'jpg',
  feed_url: 'https://example.com/cam.jpg',
  ...partial,
});

const SCENARIO: SunCameraInput[] = [
  jpg({ id: 'a', name: 'Alpha', city: 'A Town', country: 'US', lat: 40, lng: -90 }), // +39.2
  jpg({ id: 'b', name: 'Bravo', lat: 40, lng: -75 }), // −20.9
  jpg({ id: 'c', name: 'Charlie', lat: 40, lng: 0 }), // −320.9: long past
  jpg({ id: 'd', name: 'Delta', lat: 40, lng: -170 }), // +359: hours away
  jpg({ id: 'e', name: 'Echo' }), // no coordinates
  { id: 'f', name: 'Foxtrot', lat: 40, lng: -85, stream_type: 'iframe', stream_url: 'https://example.com/embed' }, // not showable
  jpg({ id: 'g', name: 'Golf', lat: 40, lng: 90 }), // sunset-side camera
  { id: 'h', name: 'Hotel', lat: 40, lng: -80, stream_type: 'mp4', stream_url: 'https://example.com/clip.mp4' }, // −0.9, video
  jpg({ id: 'i', name: 'India', lat: 40, lng: -81 }), // +3.1
  jpg({ id: 'j', name: 'Juliett', lat: 40, lng: -80.5 }), // +1.1, still image
  jpg({ id: 'a', name: 'Alpha duplicate', lat: 40, lng: -90 }), // same id: deduped
  jpg({ id: 'k', name: 'Kilo', lat: 85, lng: -90 }), // beyond the polar cap
];

describe('selectSunCameras — sunrise', () => {
  const picks = selectSunCameras(SCENARIO, OCT24_NOON, { mode: 'sunrise' });
  const ids = picks.map(p => p.id);

  it('keeps exactly the cameras inside the window', () => {
    expect(ids).toEqual(expect.arrayContaining(['a', 'b', 'h', 'i', 'j']));
    expect(ids).not.toContain('c');
    expect(ids).not.toContain('d');
    expect(ids).not.toContain('e');
    expect(ids).not.toContain('f');
    expect(ids).not.toContain('g');
    expect(ids).not.toContain('k');
  });

  it('dedupes by id', () => {
    expect(ids.filter(id => id === 'a')).toHaveLength(1);
  });

  it('orders nearest-to-the-moment first, still images ahead of video in a bucket', () => {
    // Buckets (5-min): j +1.1 (img), h −0.9 (video) → bucket 0, image first;
    // i +3.1 → bucket 1; b −20.9 → bucket 4; a +39.2 → bucket 8.
    expect(ids).toEqual(['j', 'h', 'i', 'b', 'a']);
  });

  it('reports offsets, event times and elevations consistent with the model', () => {
    const a = picks.find(p => p.id === 'a')!;
    expect(a.offsetMinutes).toBeCloseTo(39.2, 0);
    expect(Math.abs(Date.parse(a.eventTime) - OCT24_NOON.getTime() - a.offsetMinutes * 60000)).toBeLessThan(30000);
    const b = picks.find(p => p.id === 'b')!;
    expect(b.offsetMinutes).toBeCloseTo(-20.9, 0);
    expect(b.elevationDeg).toBeGreaterThan(0); // sun already up where it rose 21 min ago
    expect(a.elevationDeg).toBeLessThan(0); // sun not yet up where it rises in 39 min
  });

  it('respects a narrower window', () => {
    const narrow = selectSunCameras(SCENARIO, OCT24_NOON, {
      mode: 'sunrise',
      beforeMinutes: 10,
      afterMinutes: 10,
    });
    expect(narrow.map(p => p.id)).toEqual(['j', 'h', 'i']);
  });

  it('respects the limit', () => {
    const many: SunCameraInput[] = Array.from({ length: 30 }, (_, n) =>
      jpg({ id: `m${n}`, name: `Many ${n}`, lat: 40, lng: -90 + n * 0.1 }),
    );
    expect(selectSunCameras(many, OCT24_NOON, { mode: 'sunrise' })).toHaveLength(24);
    expect(selectSunCameras(many, OCT24_NOON, { mode: 'sunrise', limit: 5 })).toHaveLength(5);
  });

  it('returns an honest empty list when nothing is in the window', () => {
    const none = selectSunCameras([jpg({ id: 'x', name: 'Xray', lat: 40, lng: 0 })], OCT24_NOON, {
      mode: 'sunrise',
    });
    expect(none).toEqual([]);
  });
});

describe('selectSunCameras — sunset', () => {
  it('selects the dusk side, not the dawn side', () => {
    const picks = selectSunCameras(SCENARIO, OCT24_NOON, { mode: 'sunset' });
    const ids = picks.map(p => p.id);
    expect(ids).toContain('g'); // lng +90: sunset ≈ −39 min from noon… within window
    expect(ids).not.toContain('a');
    expect(ids).not.toContain('b');
  });

  it('sunset offset mirrors sunrise geometry at the same place', () => {
    const rise = sunEventOffsetMinutes(40, 90, OCT24_NOON, 'sunrise')!;
    const set = sunEventOffsetMinutes(40, 90, OCT24_NOON, 'sunset')!;
    // Sunrise and sunset straddle solar noon symmetrically.
    expect(Math.abs(rise + set - 2 * -360)).toBeLessThan(2);
  });
});
