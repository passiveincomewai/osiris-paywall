import { describe, it, expect } from 'vitest';
import {
  parsePlanespottersPhoto, planespottersHexUrl, planespottersRegUrl,
  aircraftPhotoCacheKey,
} from './aircraft-photo';

const HIT = {
  photos: [{
    id: '356145',
    thumbnail: { src: 'https://t.plnspttrs.net/27423/356145_t.jpg' },
    thumbnail_large: { src: 'https://t.plnspttrs.net/27423/356145_280.jpg' },
    link: 'https://www.planespotters.net/photo/356145/example?utm_source=api',
    photographer: 'Marco Dotti',
  }],
};

describe('parsePlanespottersPhoto', () => {
  it('takes the large thumbnail, the page link and the photographer', () => {
    expect(parsePlanespottersPhoto(HIT, 'hex')).toEqual({
      src: 'https://t.plnspttrs.net/27423/356145_280.jpg',
      link: 'https://www.planespotters.net/photo/356145/example?utm_source=api',
      photographer: 'Marco Dotti',
      via: 'hex',
    });
  });

  it('falls back to the small thumbnail when no large one exists', () => {
    const json = { photos: [{ thumbnail: { src: 'https://t.plnspttrs.net/x_t.jpg' }, link: 'https://www.planespotters.net/photo/1/x', photographer: 'A B' }] };
    expect(parsePlanespottersPhoto(json, 'reg')?.src).toBe('https://t.plnspttrs.net/x_t.jpg');
  });

  it('an empty or malformed response is a miss, never a guess', () => {
    expect(parsePlanespottersPhoto({ photos: [] }, 'hex')).toBeNull();
    expect(parsePlanespottersPhoto({}, 'hex')).toBeNull();
    expect(parsePlanespottersPhoto(null, 'hex')).toBeNull();
    expect(parsePlanespottersPhoto({ error: 'nope' }, 'reg')).toBeNull();
  });

  it('a photo without attribution is never shown', () => {
    const noCredit = { photos: [{ thumbnail_large: { src: 'https://t.plnspttrs.net/x.jpg' }, link: 'https://www.planespotters.net/photo/1/x', photographer: '  ' }] };
    expect(parsePlanespottersPhoto(noCredit, 'hex')).toBeNull();
    const noLink = { photos: [{ thumbnail_large: { src: 'https://t.plnspttrs.net/x.jpg' }, photographer: 'A B' }] };
    expect(parsePlanespottersPhoto(noLink, 'hex')).toBeNull();
  });

  it('skips an unusable first entry for a usable later one', () => {
    const json = { photos: [{ photographer: 'X' }, ...HIT.photos] };
    expect(parsePlanespottersPhoto(json, 'hex')?.photographer).toBe('Marco Dotti');
  });
});

describe('lookup urls + cache keys', () => {
  it('builds hex and registration lookups, normalised', () => {
    expect(planespottersHexUrl(' 3C6DD8 ')).toBe('https://api.planespotters.net/pub/photos/hex/3c6dd8');
    expect(planespottersRegUrl('n739ma')).toBe('https://api.planespotters.net/pub/photos/reg/N739MA');
  });

  it('cache key prefers hex, falls back to registration, else null', () => {
    expect(aircraftPhotoCacheKey('ABC123', 'N1')).toBe('hex:abc123');
    expect(aircraftPhotoCacheKey('', 'n1')).toBe('reg:N1');
    expect(aircraftPhotoCacheKey(null, null)).toBeNull();
    expect(aircraftPhotoCacheKey(' ', '')).toBeNull();
  });
});
