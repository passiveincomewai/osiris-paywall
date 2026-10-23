import { describe, expect, it } from 'vitest';
import {
  buildDirectoryIndex,
  findInDirectoryIndex,
} from './camera-directory-lookup';
import type { CountryCamera } from './country-cameras';

const cam = (id: string, name = 'Cam'): CountryCamera => ({
  id,
  name,
  lat: 40.5,
  lng: -111.6,
  feed_url: `https://example.com/${id}.jpg`,
  source: 'TEST',
});

describe('buildDirectoryIndex', () => {
  it('indexes every chunk by exact id', () => {
    const byId = buildDirectoryIndex([[cam('a-1'), cam('a-2')], [cam('b-1')]]);
    expect(byId.size).toBe(3);
    expect(findInDirectoryIndex(byId, 'a-2')?.name).toBe('Cam');
    expect(findInDirectoryIndex(byId, 'b-1')?.id).toBe('b-1');
  });

  it('keeps the first record when an id appears twice', () => {
    const byId = buildDirectoryIndex([[cam('x-1', 'First')], [cam('x-1', 'Second')]]);
    expect(findInDirectoryIndex(byId, 'x-1')?.name).toBe('First');
  });

  it('skips records without an id', () => {
    const byId = buildDirectoryIndex([[{ name: 'No id' } as CountryCamera, cam('ok-1')]]);
    expect(byId.size).toBe(1);
  });
});

describe('findInDirectoryIndex', () => {
  const byId = buildDirectoryIndex([[cam('udot-165175')]]);

  it('resolves the directory id the live catalogue no longer carries', () => {
    expect(findInDirectoryIndex(byId, 'udot-165175')?.feed_url).toContain('udot-165175');
  });

  it('misses honestly on unknown, near-miss and empty ids', () => {
    expect(findInDirectoryIndex(byId, 'udot-165176')).toBeUndefined();
    expect(findInDirectoryIndex(byId, 'udot-16517')).toBeUndefined();
    expect(findInDirectoryIndex(byId, '')).toBeUndefined();
    expect(findInDirectoryIndex(byId, null)).toBeUndefined();
    expect(findInDirectoryIndex(byId, undefined)).toBeUndefined();
  });
});
