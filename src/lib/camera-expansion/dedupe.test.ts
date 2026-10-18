import { describe, expect, it } from 'vitest';
import type { CctvCamera } from '../../app/api/cctv/types';
import { CameraIndex, nameSimilarity, normalizeUrlFull, normalizeUrlHostPath } from './dedupe';

const existing: CctvCamera = {
  id: 'udot-102337',
  lat: 40.59,
  lng: -111.9,
  name: 'I-15 at 9000 S',
  city: 'Sandy',
  country: 'US',
  feed_url: 'https://udot.example.com/cameras/102337.jpg?token=AAA',
  source: 'UDOT',
};

function candidate(patch: Partial<CctvCamera>): CctvCamera {
  return {
    id: 'occ-candidate-1',
    lat: 41.2,
    lng: -112.0,
    name: 'Somewhere Else',
    city: '',
    country: 'US',
    feed_url: 'https://other.example.com/x.jpg',
    source: 'OpenCCTV / state511',
    ...patch,
  };
}

describe('URL normalization (audit matcher port)', () => {
  it('full form keeps the query; host/path form drops it', () => {
    expect(normalizeUrlFull('HTTPS://Example.COM//a//b.jpg/?x=1')).toBe('example.com/a/b.jpg/?x=1'.replace('/?', '?'));
    expect(normalizeUrlHostPath('https://example.com/a/b.jpg?x=1')).toBe('example.com/a/b.jpg');
    expect(normalizeUrlHostPath('https://example.com/a/b.jpg?x=2')).toBe(normalizeUrlHostPath('https://example.com/a/b.jpg?x=1'));
  });

  it('unwraps catalogue proxy URLs so both sides compare equal', () => {
    const proxied = '/api/cctv/proxy?url=' + encodeURIComponent('https://cam.example.com/a.jpg');
    expect(normalizeUrlHostPath(proxied)).toBe('cam.example.com/a.jpg');
  });
});

describe('nameSimilarity', () => {
  it('uses containment over content tokens, ignoring stopwords', () => {
    expect(nameSimilarity('I-15 at 9000 S', '9000 S I-15 Camera')).toBeGreaterThanOrEqual(0.5);
    expect(nameSimilarity('I-15 at 9000 S', 'US-89 at State St')).toBeLessThan(0.5);
    expect(nameSimilarity('Camera', 'Traffic Camera')).toBe(0);
  });
});

describe('CameraIndex.classify', () => {
  const index = () => new CameraIndex([existing]);

  it('matches the identical catalogue id first', () => {
    const result = index().classify(candidate({ id: 'udot-102337' }));
    expect(result).toEqual({ cls: 'duplicate', method: 'id', matchedId: 'udot-102337' });
  });

  it('matches the full URL including its query', () => {
    const result = index().classify(candidate({ feed_url: 'https://udot.example.com/cameras/102337.jpg?token=AAA' }));
    expect(result).toEqual({ cls: 'duplicate', method: 'url-full', matchedId: 'udot-102337' });
  });

  it('matches host/path when only the query differs', () => {
    const result = index().classify(candidate({ feed_url: 'https://udot.example.com/cameras/102337.jpg?token=BBB' }));
    expect(result).toEqual({ cls: 'duplicate', method: 'url-hostpath', matchedId: 'udot-102337' });
  });

  it('treats ≤10 m as the same camera whatever the name says (audit calibration)', () => {
    const result = index().classify(candidate({ lat: 40.59005, lng: -111.90005, name: 'Utah Camera 102337' }));
    expect(result.cls).toBe('duplicate');
    if (result.cls === 'duplicate') expect(result.method).toBe('same-location');
  });

  it('matches by geo + name within 120 m', () => {
    const result = index().classify(candidate({ lat: 40.5905, lng: -111.9005, name: 'I-15 / 9000 S' }));
    expect(result.cls).toBe('duplicate');
    if (result.cls === 'duplicate') expect(result.method).toBe('geo-name');
  });

  it('does NOT auto-merge a different camera at the same intersection', () => {
    // ~55 m away, pointing the other way: a distinct camera, not a duplicate.
    const result = index().classify(candidate({ lat: 40.5905, lng: -111.9, name: 'Westbound Ramp View' }));
    expect(result.cls).toBe('near-distinct');
  });

  it('passes a genuinely new camera', () => {
    expect(index().classify(candidate({})).cls).toBe('new');
  });

  it('catches intra-harvest duplicates once a record is accepted', () => {
    const idx = index();
    const first = candidate({ id: 'occ-a', feed_url: 'https://new.example.com/cam1.jpg' });
    expect(idx.classify(first).cls).toBe('new');
    idx.add(first);
    const twin = candidate({ id: 'occ-b', feed_url: 'https://new.example.com/cam1.jpg' });
    const result = idx.classify(twin);
    expect(result).toEqual({ cls: 'duplicate', method: 'url-full', matchedId: 'occ-a' });
  });
});
