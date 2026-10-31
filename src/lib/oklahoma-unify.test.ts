import { describe, expect, it } from 'vitest';
import type { CountryCamera } from './country-cameras';
import {
  refreshOklahomaRecords,
  translateSupersededCameraId,
} from './oklahoma-unify';

const OCC: CountryCamera = {
  id: 'occ-ok-1690894724543',
  name: 'US-69 & C Tree NE',
  city: 'McAlester',
  country: 'United States',
  lat: 34.83621,
  lng: -95.83708,
  stream_url: 'https://stream.oktraffic.org/delay-stream/STALE.stream/playlist.m3u8',
  stream_type: 'hls',
  source: 'OpenCCTV / oktraffic',
};

const OKDOT_STALE: CountryCamera = {
  id: 'okdot-1294406354',
  name: 'I-235 & 5th SE',
  city: 'Oklahoma City',
  country: 'United States',
  lat: 35.47305,
  lng: -97.50718,
  stream_url: 'https://stream.oktraffic.org/delay-stream/STALE2.stream/playlist.m3u8',
  stream_type: 'hls',
  source: 'Oklahoma DOT',
};

const GDOT: CountryCamera = {
  id: 'gdot-11843',
  name: '10th St at Fowler St (Atlanta)',
  city: 'Georgia',
  country: 'United States',
  lat: 33.78158,
  lng: -84.39365,
  feed_url: 'https://511ga.org/map/Cctv/19253',
  source: 'GDOT',
};

const LIVE = [
  {
    id: 'okdot-1690894724543',
    stream_url: 'https://stream.oktraffic.org/delay-stream/FRESH.stream/playlist.m3u8',
  },
  {
    id: 'okdot-1294406354',
    stream_url: 'https://stream.oktraffic.org/delay-stream/FRESH2.stream/playlist.m3u8',
  },
];

describe('translateSupersededCameraId', () => {
  it('maps the superseded oktraffic family to the okdot- twin id', () => {
    expect(translateSupersededCameraId('occ-ok-1690894724543')).toBe(
      'okdot-1690894724543',
    );
    expect(translateSupersededCameraId('occ-ok-39')).toBe('okdot-39');
  });

  it('passes every other id through unchanged', () => {
    expect(translateSupersededCameraId('okdot-1690894724543')).toBe(
      'okdot-1690894724543',
    );
    expect(translateSupersededCameraId('occ-ok-abc')).toBe('occ-ok-abc');
    expect(translateSupersededCameraId('occ-wsdot-4029')).toBe('occ-wsdot-4029');
    expect(translateSupersededCameraId('gdot-11843')).toBe('gdot-11843');
    expect(translateSupersededCameraId('')).toBe('');
  });
});

describe('refreshOklahomaRecords', () => {
  it('rewrites a superseded record to its live twin: id, source, stream', () => {
    const out = refreshOklahomaRecords([OCC], LIVE);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: 'okdot-1690894724543',
      source: 'Oklahoma DOT',
      stream_url:
        'https://stream.oktraffic.org/delay-stream/FRESH.stream/playlist.m3u8',
    });
    /* The directory's own fields are never taken from the feed. */
    expect(out[0].name).toBe(OCC.name);
    expect(out[0].city).toBe(OCC.city);
    expect(out[0].lat).toBe(OCC.lat);
    expect(out[0].lng).toBe(OCC.lng);
  });

  it('refreshes the stream of an already-unified okdot- record', () => {
    const out = refreshOklahomaRecords([OKDOT_STALE], LIVE);
    expect(out[0].id).toBe('okdot-1294406354');
    expect(out[0].source).toBe('Oklahoma DOT');
    expect(out[0].stream_url).toBe(
      'https://stream.oktraffic.org/delay-stream/FRESH2.stream/playlist.m3u8',
    );
  });

  it('leaves a superseded record whose twin is not live exactly as-is', () => {
    const gone: CountryCamera = { ...OCC, id: 'occ-ok-1103131489' };
    const out = refreshOklahomaRecords([gone], LIVE);
    expect(out[0]).toBe(gone);
  });

  it('never touches other families, and preserves array identity when nothing changes', () => {
    const records = [GDOT, OKDOT_STALE];
    const fresh = [{ id: 'okdot-1294406354', stream_url: OKDOT_STALE.stream_url }];
    const out = refreshOklahomaRecords(records, fresh);
    expect(out).toBe(records);
    expect(out[0]).toBe(GDOT);
  });

  it('ignores live entries without a stream URL and empty live sets', () => {
    const records = [OCC];
    expect(refreshOklahomaRecords(records, [])).toBe(records);
    expect(
      refreshOklahomaRecords(records, [{ id: 'okdot-1690894724543', stream_url: '' }]),
    ).toBe(records);
    expect(
      refreshOklahomaRecords(records, [{ id: 'okdot-1690894724543', stream_url: null }]),
    ).toBe(records);
  });

  it('does not rewrite an occ- id from a different harvest family', () => {
    const wsdot: CountryCamera = {
      id: 'occ-ok-4029',
      name: 'I-82 at MP 54: Zillah',
      source: 'OpenCCTV / wsdot',
    };
    const out = refreshOklahomaRecords([wsdot], LIVE);
    expect(out[0]).toBe(wsdot);
  });
});
