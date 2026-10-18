import { describe, expect, it } from 'vitest';
import { normalizeOccRecord, occCameraId, type OccRawRecord } from './normalize';

const base: OccRawRecord = {
  id: 'state511-abc123',
  name: 'I-15 at 9000 S',
  city: 'Sandy',
  country: 'US',
  lat: 40.59,
  lng: -111.9,
  feed_url: 'https://example.dot.gov/cam/abc.jpg',
  feed_type: 'image',
  source: 'state511',
  active: 1,
};

describe('normalizeOccRecord', () => {
  it('maps a snapshot record into the catalogue shape', () => {
    const result = normalizeOccRecord(base);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.camera).toEqual({
      id: 'occ-state511-abc123',
      lat: 40.59,
      lng: -111.9,
      name: 'I-15 at 9000 S',
      city: 'Sandy',
      country: 'US',
      feed_url: 'https://example.dot.gov/cam/abc.jpg',
      source: 'OpenCCTV / state511',
    });
    expect(result.value.family).toBe('state511');
    expect(result.value.probeKind).toBe('image');
  });

  it('is deterministic — the same upstream record always yields the same id', () => {
    const a = normalizeOccRecord(base);
    const b = normalizeOccRecord({ ...base });
    expect(a.ok && b.ok && a.value.camera.id === b.value.camera.id).toBe(true);
    expect(occCameraId('state511-abc123')).toBe('occ-state511-abc123');
    expect(occCameraId('x')).not.toBe(occCameraId('y'));
  });

  it('routes streams to stream_url with the mapped type', () => {
    const result = normalizeOccRecord({ ...base, feed_type: 'm3u8', feed_url: 'https://hls.example.com/cam/index.m3u8' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.camera.stream_url).toBe('https://hls.example.com/cam/index.m3u8');
    expect(result.value.camera.stream_type).toBe('hls');
    expect(result.value.camera.feed_url).toBeUndefined();
    expect(result.value.probeKind).toBe('hls');
  });

  it.each([
    [{ active: 0 }, 'inactive-or-missing-id'],
    [{ id: undefined }, 'inactive-or-missing-id'],
    [{ feed_url: null }, 'missing-feed-url'],
    [{ feed_url: 'faa-weathercam://10171' }, 'non-http-feed-url'],
    [{ feed_url: 'https://www.windy.com/webcams/123' }, 'windy-host'],
    [{ feed_url: 'https://eismoinfo.lt/cam/1.jpg' }, 'covered-host'],
    [{ feed_url: 'https://llm.example.my/offcam/cam1.jpg' }, 'offline-placeholder-path'],
    [{ feed_type: 'rtsp' }, 'unknown-feed-type'],
    [{ lat: 91 }, 'invalid-coordinates'],
    [{ lat: 0, lng: 0 }, 'invalid-coordinates'],
    [{ lat: Number.NaN }, 'invalid-coordinates'],
    [{ cache_buster_breaks_url: true }, 'cache-buster-breaks-still'],
  ])('skips %o as %s', (patch, reason) => {
    const result = normalizeOccRecord({ ...base, ...(patch as Partial<OccRawRecord>) });
    expect(result).toEqual({ ok: false, reason });
  });
});
