/**
 * OSIRIS — Launch Library 2 server-side fetch + cache.
 *
 * LL2's anonymous tier allows 15 calls/hour TOTAL — not per user. Every
 * WorldEye client therefore talks to /api/launches, never to LL2, and this
 * service is the only code that calls upstream:
 *
 *   • upcoming — 15-min TTL → ≤ 4 upstream calls/hour
 *   • previous — 60-min TTL → ≤ 1 upstream call/hour
 *   • worst case 5 calls/hour against a 15/hour budget, before the CDN
 *     cache on the route absorbs most client traffic anyway.
 *
 * Stale-on-error (the house pattern): a failed refresh keeps serving the
 * last good list and marks the payload stale; only a cold cache + a dead
 * upstream is an error. Concurrent refreshes share one in-flight request.
 */
import { normalizeLaunchList } from './normalize';
import { LAUNCH_SOURCE_LABEL, type LaunchRecord, type LaunchesPayload } from './types';

export const LL2_UPCOMING_URL = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=40&mode=detailed';
export const LL2_PREVIOUS_URL = 'https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=25&mode=detailed';

export const UPCOMING_TTL_MS = 15 * 60_000;
export const PREVIOUS_TTL_MS = 60 * 60_000;

export interface LaunchServiceDeps {
  fetchJson: (url: string) => Promise<unknown>;
  now?: () => number;
}

interface Section {
  data: LaunchRecord[] | null;
  fetchedAt: number;
  inflight: Promise<void> | null;
  staleServed: boolean;
}

const byNetAsc = (a: LaunchRecord, b: LaunchRecord) =>
  (a.net ? Date.parse(a.net) : Infinity) - (b.net ? Date.parse(b.net) : Infinity);
const byNetDesc = (a: LaunchRecord, b: LaunchRecord) => byNetAsc(b, a);

export function createLaunchService(deps: LaunchServiceDeps) {
  const now = deps.now ?? (() => Date.now());
  let upstreamCalls = 0;

  const sections: Record<'upcoming' | 'previous', { section: Section; url: string; ttl: number; sort: (a: LaunchRecord, b: LaunchRecord) => number }> = {
    upcoming: { section: { data: null, fetchedAt: 0, inflight: null, staleServed: false }, url: LL2_UPCOMING_URL, ttl: UPCOMING_TTL_MS, sort: byNetAsc },
    previous: { section: { data: null, fetchedAt: 0, inflight: null, staleServed: false }, url: LL2_PREVIOUS_URL, ttl: PREVIOUS_TTL_MS, sort: byNetDesc },
  };

  async function refresh(key: 'upcoming' | 'previous'): Promise<void> {
    const { section, url, ttl, sort } = sections[key];
    if (section.data && now() - section.fetchedAt < ttl) return;
    if (section.inflight) return section.inflight;
    section.inflight = (async () => {
      try {
        upstreamCalls++;
        const json = await deps.fetchJson(url);
        const data = normalizeLaunchList(json).sort(sort);
        // An empty list from LL2 for UPCOMING is implausible (hundreds are
        // always scheduled) — treat it as a failed refresh, keep last-good.
        if (data.length === 0 && section.data?.length) throw new Error('empty upstream response');
        section.data = data;
        section.fetchedAt = now();
        section.staleServed = false;
      } catch {
        if (section.data) {
          section.staleServed = true; // last-good carries on; payload is marked stale
        } else {
          throw new Error(`LL2 ${key} unavailable`);
        }
      } finally {
        section.inflight = null;
      }
    })();
    return section.inflight;
  }

  async function getLaunches(): Promise<LaunchesPayload> {
    await Promise.all([refresh('upcoming'), refresh('previous')]);
    const up = sections.upcoming.section;
    const prev = sections.previous.section;
    return {
      upcoming: up.data ?? [],
      previous: prev.data ?? [],
      source: LAUNCH_SOURCE_LABEL,
      // The payload is only as fresh as its stalest section.
      fetchedAt: Math.min(up.fetchedAt, prev.fetchedAt),
      stale: up.staleServed || prev.staleServed,
      upstreamCalls,
    };
  }

  return { getLaunches, upstreamCallCount: () => upstreamCalls };
}

/** The process-wide service the route uses (real fetch, real clock). */
async function fetchJsonReal(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WorldEye/1.0 (worldeye.app; globe launch layer)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

const singleton = createLaunchService({ fetchJson: fetchJsonReal });

export function getLaunchesPayload(): Promise<LaunchesPayload> {
  return singleton.getLaunches();
}
