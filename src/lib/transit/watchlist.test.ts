import { describe, it, expect } from 'vitest';
import {
  loadWatchlist,
  saveWatchlist,
  toggleWatch,
  isWatched,
  watchForAgency,
  watchId,
  WATCHLIST_KEY,
  type WatchEntry,
  type WatchStorage,
} from './watchlist';

function fakeStorage(): WatchStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
  };
}

const stop: WatchEntry = { kind: 'stop', agencyId: 'uta', key: 'STP1', label: 'Murray Central', lat: 40.66, lng: -111.89 };
const route: WatchEntry = { kind: 'route', agencyId: 'uta', key: '701', label: '701 · Blue Line' };
const otherAgency: WatchEntry = { kind: 'route', agencyId: 'mbta', key: 'Red', label: 'Red' };

describe('watchlist persistence', () => {
  it('round-trips through storage under the versioned key', () => {
    const s = fakeStorage();
    saveWatchlist([stop, route], s);
    expect(s.map.has(WATCHLIST_KEY)).toBe(true);
    expect(loadWatchlist(s)).toEqual([stop, route]);
  });

  it('absent, corrupt and non-array storage all read as an empty list', () => {
    const s = fakeStorage();
    expect(loadWatchlist(s)).toEqual([]);
    s.map.set(WATCHLIST_KEY, '{broken json');
    expect(loadWatchlist(s)).toEqual([]);
    s.map.set(WATCHLIST_KEY, '"just a string"');
    expect(loadWatchlist(s)).toEqual([]);
    expect(loadWatchlist(null)).toEqual([]);
  });

  it('drops malformed entries on load instead of trusting them', () => {
    const s = fakeStorage();
    s.map.set(WATCHLIST_KEY, JSON.stringify([stop, { kind: 'stop' }, { kind: 'plane', agencyId: 'uta', key: 'x', label: 'y' }, null]));
    expect(loadWatchlist(s)).toEqual([stop]);
  });

  it('a throwing storage (privacy mode) is survived', () => {
    const hostile: WatchStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(loadWatchlist(hostile)).toEqual([]);
    expect(() => saveWatchlist([stop], hostile)).not.toThrow();
  });
});

describe('toggleWatch / isWatched', () => {
  it('adds to the front, removes on a second toggle, identity is agency+kind+key', () => {
    let list = toggleWatch([], stop);
    expect(list).toEqual([stop]);
    list = toggleWatch(list, route);
    expect(list.map(watchId)).toEqual([watchId(route), watchId(stop)]);
    expect(isWatched(list, { kind: 'stop', agencyId: 'uta', key: 'STP1' })).toBe(true);
    expect(isWatched(list, { kind: 'stop', agencyId: 'mbta', key: 'STP1' })).toBe(false);
    list = toggleWatch(list, stop);
    expect(list).toEqual([route]);
    expect(isWatched(list, stop)).toBe(false);
  });
});

describe('watchForAgency', () => {
  it('filters to the agency, stops before routes', () => {
    const list = [route, otherAgency, stop];
    expect(watchForAgency(list, 'uta')).toEqual([stop, route]);
    expect(watchForAgency(list, 'mbta')).toEqual([otherAgency]);
    expect(watchForAgency(list, 'rtd-denver')).toEqual([]);
  });
});
