import { departuresForStop, type TransitNetwork } from './network';

/**
 * OSIRIS — per-stop next arrivals: scheduled departures from the
 * static network, upgraded to real-time by TripUpdates where the feed
 * actually speaks about that trip at that stop.
 *
 * THE JOIN PROBLEM (verified live 2026-10-20 for UTA): TripUpdates
 * stopTimeUpdates carry NO stopId at all — 0 of every stopTimeUpdate
 * sampled — only stopSequence, an absolute predicted time, and a
 * delay. So a stop's real-time prediction exists only through the
 * static schedule: trip → its call at THIS stop → that call's
 * sequence → the prediction indexed at (trip, sequence). That join is
 * exact, not heuristic: sequence is the trip's own stop order.
 *
 * BASIS HONESTY: every arrival is labeled. 'realtime' means a fresh
 * TripUpdates feed carried a prediction for this trip at this stop —
 * the displayed time is the feed's. 'scheduled' means the static
 * timetable time, shown because no fresh prediction covers it. A feed
 * older than RT_FRESH_MS is not fresh: everything falls back to
 * scheduled rather than dressing old predictions as live.
 */

export interface StopPredictionRT {
  /** Absolute predicted time at the stop (epoch seconds), when given. */
  timeS?: number;
  /** Delay at the stop (seconds), when given. */
  delayS?: number;
}

export interface TripPredictions {
  /** Feed header timestamp (epoch seconds) — the freshness witness. */
  feedTsS: number | null;
  /** tripId → stopSequence → prediction. */
  byTrip: Map<string, Map<number, StopPredictionRT>>;
}

function toEpoch(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  if (typeof v?.toNumber === 'function') return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Index a decoded TripUpdates FeedMessage for the stop-arrival join. */
export function indexTripPredictions(msg: any): TripPredictions {
  const byTrip = new Map<string, Map<number, StopPredictionRT>>();
  for (const e of msg?.entity ?? []) {
    const tu = e?.tripUpdate;
    const tripId = tu?.trip?.tripId;
    if (!tripId || byTrip.has(tripId)) continue;
    const perStop = new Map<number, StopPredictionRT>();
    for (const stu of tu.stopTimeUpdate ?? []) {
      const seq = typeof stu?.stopSequence === 'number' ? stu.stopSequence : undefined;
      if (seq == null || perStop.has(seq)) continue;
      const timeS = toEpoch(stu?.arrival?.time) ?? toEpoch(stu?.departure?.time);
      const delayRaw = stu?.arrival?.delay ?? stu?.departure?.delay;
      const pred: StopPredictionRT = {};
      if (timeS !== undefined) pred.timeS = timeS;
      if (typeof delayRaw === 'number') pred.delayS = delayRaw;
      if (pred.timeS !== undefined || pred.delayS !== undefined) perStop.set(seq, pred);
    }
    if (perStop.size > 0) byTrip.set(tripId, perStop);
  }
  return { feedTsS: toEpoch(msg?.header?.timestamp) ?? null, byTrip };
}

/** A TripUpdates feed counts as live for arrivals only this long. */
export const RT_FRESH_MS = 180_000;

export type ArrivalBasis = 'realtime' | 'scheduled';

export interface Arrival {
  routeShort: string;
  routeId: string;
  headsign: string;
  dir: number;
  /** The time to show: the feed's prediction, or the timetable's. */
  timeMs: number;
  /** The timetable time (epoch ms) — always carried so the UI can
   *  show scheduled vs predicted side by side for realtime rows. */
  schedMs: number;
  basis: ArrivalBasis;
  /** Prediction minus schedule (seconds), when both are known. */
  delayS?: number;
}

export interface StopArrivals {
  arrivals: Arrival[];
  /** True when a TripUpdates feed exists and is fresh. */
  rtLive: boolean;
  /** Age of the TripUpdates feed in seconds (null when there is none). */
  rtAgeS: number | null;
}

/**
 * Next arrivals at a stop. Window: from 10 minutes ago (a slightly
 * late real-time trip is still "arriving") to 3 hours out, capped.
 * Arrivals whose best-known time has passed are dropped.
 */
export function nextArrivals(
  net: TransitNetwork,
  stopId: string,
  preds: TripPredictions | null,
  nowMs: number,
  tz: string,
  limit = 8,
): StopArrivals {
  const rtAgeS = preds?.feedTsS != null ? Math.max(0, Math.round(nowMs / 1000 - preds.feedTsS)) : null;
  const rtLive = !!(preds && preds.feedTsS != null && nowMs - preds.feedTsS * 1000 <= RT_FRESH_MS);
  const sched = departuresForStop(net, stopId, nowMs - 600_000, nowMs + 3 * 3600_000, tz);
  const out: Arrival[] = [];
  for (const dep of sched) {
    let timeMs = dep.schedMs;
    let basis: ArrivalBasis = 'scheduled';
    let delayS: number | undefined;
    if (rtLive && preds) {
      const pred = preds.byTrip.get(dep.tripId)?.get(dep.seq);
      if (pred) {
        if (pred.timeS !== undefined) {
          timeMs = pred.timeS * 1000;
          basis = 'realtime';
          delayS = Math.round((timeMs - dep.schedMs) / 1000);
        } else if (pred.delayS !== undefined) {
          timeMs = dep.schedMs + pred.delayS * 1000;
          basis = 'realtime';
          delayS = pred.delayS;
        }
      }
    }
    if (timeMs < nowMs - 60_000) continue;
    const route = net.routeById.get(dep.routeId);
    out.push({
      routeShort: route?.short ?? dep.routeId,
      routeId: dep.routeId,
      headsign: dep.headsign || route?.long || '',
      dir: dep.dir,
      timeMs,
      schedMs: dep.schedMs,
      basis,
      ...(delayS !== undefined ? { delayS } : {}),
    });
  }
  out.sort((a, b) => a.timeMs - b.timeMs);
  return { arrivals: out.slice(0, limit), rtLive, rtAgeS };
}
