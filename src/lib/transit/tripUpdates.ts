/**
 * OSIRIS — TripUpdates delay index (pure functions over a decoded
 * GTFS-Realtime FeedMessage).
 *
 * The vehicles route used to take the FIRST stopTimeUpdate delay of a
 * trip — the delay at the start of the trip, however far behind the
 * vehicle that now is. Feeds carry a delay per stop, so the honest
 * delay for "how is this bus doing" is the delay at the stop the
 * vehicle is at / heading to. Where the position feed gives a real
 * currentStopSequence that stop is matched directly; where it does
 * not (UTA reports sequence 0 for every vehicle — verified live
 * 2026-10-18), the upcoming stop is derived from the trip's own
 * predicted arrival times instead. The trip's first reported delay
 * remains the last-resort fallback.
 */

export interface TripDelay {
  /** First delay reported for the trip (any stop). */
  first?: number;
  /** stopSequence → delay at that stop. */
  bySeq: Map<number, number>;
  /** Stop predictions in feed order: sequence, delay, predicted
   *  arrival (epoch seconds) — the raw material for finding the
   *  vehicle's upcoming stop when the position feed has no sequence. */
  stops: StopPrediction[];
}

export interface StopPrediction {
  seq: number;
  delay?: number;
  arrTime?: number; // epoch seconds, predicted (delay already applied by the feed)
}

function toEpoch(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  if (typeof v?.toNumber === 'function') return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Index a decoded TripUpdates feed by trip id. First entity per trip
 * wins (mirrors the long-standing behavior of the vehicles route),
 * and within a trip the first delay seen per stop wins.
 */
export function indexTripDelays(msg: any): Map<string, TripDelay> {
  const out = new Map<string, TripDelay>();
  for (const e of msg?.entity ?? []) {
    const tu = e?.tripUpdate;
    const tripId = tu?.trip?.tripId;
    if (!tripId || out.has(tripId)) continue;
    const entry: TripDelay = { bySeq: new Map(), stops: [] };
    for (const stu of tu.stopTimeUpdate ?? []) {
      const d = stu?.arrival?.delay ?? stu?.departure?.delay;
      const seq = typeof stu?.stopSequence === 'number' ? stu.stopSequence : undefined;
      if (typeof d === 'number') {
        if (entry.first === undefined) entry.first = d;
        if (seq != null && !entry.bySeq.has(seq)) entry.bySeq.set(seq, d);
      }
      if (seq != null) {
        const pred: StopPrediction = { seq };
        if (typeof d === 'number') pred.delay = d;
        const at = toEpoch(stu?.arrival?.time) ?? toEpoch(stu?.departure?.time);
        if (at !== undefined) pred.arrTime = at;
        entry.stops.push(pred);
      }
    }
    out.set(tripId, entry);
  }
  return out;
}

/**
 * The stop a trip is heading to, from its TripUpdate predictions:
 * the first stop whose predicted arrival is not yet past (60 s grace
 * for feed/click skew — the prediction already includes the delay,
 * so a just-passed prediction is still that stop until the feed
 * republishes). Returns undefined when every prediction is past:
 * the trip is effectively over and naming a "next" stop would be a
 * guess.
 */
export function upcomingStop(index: Map<string, TripDelay>, tripId: string | undefined, nowS: number): StopPrediction | undefined {
  if (!tripId) return undefined;
  const entry = index.get(tripId);
  if (!entry) return undefined;
  for (const s of entry.stops) {
    if (s.arrTime != null && s.arrTime >= nowS - 60) return s;
  }
  return undefined;
}

/**
 * One-call resolution for a vehicle: the delay to show and the stop
 * sequence it belongs to. Precedence: (1) the vehicle's own stop
 * sequence matched in TripUpdates; (2) the upcoming stop from the
 * trip's predictions (the path UTA needs — its position feed reports
 * currentStopSequence = 0 for every vehicle); (3) the trip's first
 * reported delay, with the vehicle's sequence if it had a valid one.
 */
export function vehicleDelayAndStop(
  index: Map<string, TripDelay>,
  tripId: string | undefined,
  stopSequence: number | undefined,
  nowS: number,
): { delay?: number; stopSeq?: number } {
  if (!tripId) return {};
  const entry = index.get(tripId);
  if (!entry) return {};
  const seqValid = stopSequence != null && stopSequence >= 1;
  if (seqValid && entry.bySeq.has(stopSequence)) {
    return { delay: entry.bySeq.get(stopSequence), stopSeq: stopSequence };
  }
  const up = upcomingStop(index, tripId, nowS);
  if (up) return { delay: up.delay ?? entry.first, stopSeq: up.seq };
  return { delay: entry.first, stopSeq: seqValid ? stopSequence : undefined };
}

/** Delay for a vehicle: its own stop's delay when known, else the trip's first. */
export function delayForTrip(
  index: Map<string, TripDelay>,
  tripId: string | undefined,
  stopSequence: number | undefined,
): number | undefined {
  if (!tripId) return undefined;
  const entry = index.get(tripId);
  if (!entry) return undefined;
  if (stopSequence != null) {
    const atStop = entry.bySeq.get(stopSequence);
    if (atStop !== undefined) return atStop;
  }
  return entry.first;
}
