import { describe, it, expect } from 'vitest';
import {
  loadSavedLocations,
  saveSavedLocations,
  toggleSavedLocation,
  removeSavedLocation,
  isSavedLocation,
  savedId,
  cameraSavedHref,
  globeHrefFor,
  SAVED_LOCATIONS_KEY,
  MAX_SAVED_LOCATIONS,
  type SavedLocation,
  type SavedLocationInput,
  type SavedStorage,
} from './saved-locations';

function fakeStorage(): SavedStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
  };
}

const place: SavedLocationInput = {
  kind: 'place',
  key: 'city:london',
  label: 'London',
  detail: 'United Kingdom',
  href: '/city-webcams/london',
  lat: 51.5074,
  lng: -0.1278,
};
const camera: SavedLocationInput = {
  kind: 'camera',
  key: 'cam-123',
  label: 'Blackwall Tunnel approach',
  detail: 'London, United Kingdom',
  href: cameraSavedHref('cam-123'),
  lat: 51.5074,
  lng: -0.1278,
};
const country: SavedLocationInput = {
  kind: 'place',
  key: 'country:france',
  label: 'France',
  href: '/cameras/countries/france',
};

describe('saved locations persistence', () => {
  it('round-trips through storage under the versioned key', () => {
    const s = fakeStorage();
    const { entries } = toggleSavedLocation([], place, 1000);
    saveSavedLocations(entries, s);
    expect(s.map.has(SAVED_LOCATIONS_KEY)).toBe(true);
    // A fresh load from the same storage — the reload case.
    expect(loadSavedLocations(s)).toEqual([{ ...place, savedAt: 1000 }]);
  });

  it('persists a mixed list in saved order (newest first)', () => {
    const s = fakeStorage();
    let list = toggleSavedLocation([], place, 1000).entries;
    list = toggleSavedLocation(list, camera, 2000).entries;
    list = toggleSavedLocation(list, country, 3000).entries;
    saveSavedLocations(list, s);
    const reloaded = loadSavedLocations(s);
    expect(reloaded.map(savedId)).toEqual(['place|country:france', 'camera|cam-123', 'place|city:london']);
    expect(reloaded.map((e) => e.savedAt)).toEqual([3000, 2000, 1000]);
  });

  it('absent, corrupt and non-array storage all read as an empty list', () => {
    const s = fakeStorage();
    expect(loadSavedLocations(s)).toEqual([]);
    s.map.set(SAVED_LOCATIONS_KEY, '{broken json');
    expect(loadSavedLocations(s)).toEqual([]);
    s.map.set(SAVED_LOCATIONS_KEY, '"just a string"');
    expect(loadSavedLocations(s)).toEqual([]);
    expect(loadSavedLocations(null)).toEqual([]);
  });

  it('drops malformed entries on load instead of trusting them', () => {
    const s = fakeStorage();
    const good: SavedLocation = { ...place, savedAt: 1000 };
    s.map.set(SAVED_LOCATIONS_KEY, JSON.stringify([
      good,
      { kind: 'place' }, // missing everything
      { kind: 'flight', key: 'x', label: 'y', href: '/x', savedAt: 1 }, // unknown kind
      { kind: 'place', key: 'evil', label: 'Evil', href: 'https://example.com', savedAt: 1 }, // absolute href
      { kind: 'place', key: 'evil2', label: 'Evil 2', href: '//example.com', savedAt: 1 }, // protocol-relative
      { kind: 'place', key: 'badcoord', label: 'Bad', href: '/x', lat: 999, lng: 0, savedAt: 1 }, // out-of-range coord
      null,
    ]));
    expect(loadSavedLocations(s)).toEqual([good]);
  });

  it('collapses duplicate identities on load, keeping the newest copy', () => {
    const s = fakeStorage();
    const newer: SavedLocation = { ...place, savedAt: 2000 };
    const older: SavedLocation = { ...place, label: 'London (old)', savedAt: 1000 };
    s.map.set(SAVED_LOCATIONS_KEY, JSON.stringify([newer, older]));
    expect(loadSavedLocations(s)).toEqual([newer]);
  });

  it('a throwing storage (privacy mode) is survived', () => {
    const hostile: SavedStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(loadSavedLocations(hostile)).toEqual([]);
    expect(() => saveSavedLocations([{ ...place, savedAt: 1 }], hostile)).not.toThrow();
  });
});

describe('toggleSavedLocation / isSavedLocation', () => {
  it('adds to the front, removes on a second toggle, identity is kind+key', () => {
    let r = toggleSavedLocation([], place, 1000);
    expect(r.state).toBe('added');
    expect(r.entries).toEqual([{ ...place, savedAt: 1000 }]);
    r = toggleSavedLocation(r.entries, camera, 2000);
    expect(r.entries.map(savedId)).toEqual(['camera|cam-123', 'place|city:london']);
    expect(isSavedLocation(r.entries, { kind: 'place', key: 'city:london' })).toBe(true);
    // Same key, different kind is a different save.
    expect(isSavedLocation(r.entries, { kind: 'camera', key: 'city:london' })).toBe(false);
    r = toggleSavedLocation(r.entries, place, 3000);
    expect(r.state).toBe('removed');
    expect(r.entries.map(savedId)).toEqual(['camera|cam-123']);
    expect(isSavedLocation(r.entries, place)).toBe(false);
  });

  it('removeSavedLocation removes only the probed entry', () => {
    const list: SavedLocation[] = [
      { ...camera, savedAt: 2000 },
      { ...place, savedAt: 1000 },
    ];
    expect(removeSavedLocation(list, place)).toEqual([{ ...camera, savedAt: 2000 }]);
    expect(removeSavedLocation(list, country)).toEqual(list);
  });
});

describe('the cap', () => {
  function fullList(): SavedLocation[] {
    const out: SavedLocation[] = [];
    for (let i = 0; i < MAX_SAVED_LOCATIONS; i++) {
      out.push({
        kind: 'camera',
        key: `cam-${i}`,
        label: `Camera ${i}`,
        href: cameraSavedHref(`cam-${i}`),
        savedAt: i,
      });
    }
    return out;
  }

  it('refuses to add at the cap — no silent eviction', () => {
    const full = fullList();
    const r = toggleSavedLocation(full, place, 9999);
    expect(r.state).toBe('full');
    expect(r.entries).toBe(full); // untouched, same reference
    expect(r.entries).toHaveLength(MAX_SAVED_LOCATIONS);
  });

  it('removing still works at the cap, and then adding works again', () => {
    const full = fullList();
    const removed = toggleSavedLocation(full, { ...camera, key: 'cam-0' }, 5000);
    expect(removed.state).toBe('removed');
    expect(removed.entries).toHaveLength(MAX_SAVED_LOCATIONS - 1);
    const added = toggleSavedLocation(removed.entries, place, 6000);
    expect(added.state).toBe('added');
    expect(added.entries[0]).toEqual({ ...place, savedAt: 6000 });
  });

  it('load caps a hand-grown store at MAX_SAVED_LOCATIONS', () => {
    const s = fakeStorage();
    const many: SavedLocation[] = [];
    for (let i = 0; i < MAX_SAVED_LOCATIONS + 25; i++) {
      many.push({ kind: 'camera', key: `cam-${i}`, label: `Camera ${i}`, href: `/?camera=cam-${i}`, savedAt: i });
    }
    s.map.set(SAVED_LOCATIONS_KEY, JSON.stringify(many));
    expect(loadSavedLocations(s)).toHaveLength(MAX_SAVED_LOCATIONS);
  });
});

describe('links', () => {
  it('cameraSavedHref builds the globe deep link, encoding the id', () => {
    expect(cameraSavedHref('cam-123')).toBe('/?camera=cam-123');
    expect(cameraSavedHref('a b/c')).toBe('/?camera=a%20b%2Fc');
  });

  it('globeHrefFor frames a place with coordinates as a geo jump', () => {
    const href = globeHrefFor({ ...place, savedAt: 1 });
    expect(href).toBe('/?geo=51.50740,-0.12780,5000');
  });

  it('globeHrefFor is null for cameras and for places without coordinates', () => {
    expect(globeHrefFor({ ...camera, savedAt: 1 })).toBeNull();
    expect(globeHrefFor({ ...country, savedAt: 1 })).toBeNull();
  });
});
