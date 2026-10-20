/**
 * Client side of the /api/flights delta protocol.
 *
 * The globe polls flights every 30 s. A full payload is ~2.35 MB; the
 * sky barely changes between polls, so the client holds the token of
 * the last completed snapshot it applied and sends it back as
 * ?since=<token>. The server answers with a delta (see the route):
 * upserts per bucket — field patches for aircraft already held, full
 * records for new or re-bucketed ones — the identity keys that
 * vanished, and the small whole-payload fields (jamming, totals,
 * provider health). This module is the merge — pure, so the protocol
 * can be tested end to end without a map.
 *
 * Invariants the merge must keep, because the render blend
 * (lib/flights/motion.ts) is built on them:
 *  - received == rendered: every record the server says exists is in
 *    exactly one bucket exactly once after the merge; no sampling, no
 *    caps, no silent drops.
 *  - an upsert is authoritative placement: the record leaves whichever
 *    bucket it was in before (a re-classified aircraft must not draw
 *    twice), and a removed key leaves every bucket.
 *  - fresh bucket arrays out: the blend keys motion state off the
 *    payload it is handed, so a merged delta produces new arrays whose
 *    feed timestamp (payload.timestamp, stamped from the delta) drives
 *    the same dedupe a full payload's would.
 */

export const FLIGHT_BUCKET_KEYS = [
  'commercial_flights', 'private_flights', 'private_jets', 'military_flights',
] as const;
export type FlightBucketKey = (typeof FLIGHT_BUCKET_KEYS)[number];

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FlightsPayloadLike {
  commercial_flights: any[];
  private_flights: any[];
  private_jets: any[];
  military_flights: any[];
  gps_jamming?: any[];
  total?: number;
  source?: string;
  providers?: unknown;
  diagnostics?: unknown;
  partial?: boolean;
  timestamp?: string;
  token?: string;
  [key: string]: unknown;
}

export interface FlightsDelta {
  delta: true;
  base: string;
  token: string;
  unchanged?: boolean;
  upserts?: Partial<Record<FlightBucketKey, any[]>>;
  removed?: string[];
  gps_jamming?: any[];
  total?: number;
  source?: string;
  providers?: unknown;
  diagnostics?: unknown;
  partial?: boolean;
  timestamp?: string;
}

/** The same identity the server fingerprints by: transponder code, or
 *  callsign + position for the rare record classified without one. */
export function flightRecordKey(record: any): string {
  const hex = typeof record?.icao24 === 'string' ? record.icao24.trim() : '';
  if (hex) return hex;
  return `${record?.callsign ?? ''}|${record?.lat ?? ''}|${record?.lng ?? ''}`;
}

/**
 * Merge a delta into the currently held payload. Returns the new
 * payload, or null when the delta does not belong to `current` (its
 * base is not the held snapshot's token, or it carries no token): the
 * caller must drop its token and let the next poll re-base on a full
 * payload rather than guess.
 */
export function applyFlightsDelta(
  current: FlightsPayloadLike,
  delta: FlightsDelta,
): FlightsPayloadLike | null {
  if (!current || delta?.delta !== true) return null;
  if (typeof delta.token !== 'string' || !delta.token) return null;
  if (delta.base !== current.token) return null;

  if (delta.unchanged) {
    return {
      ...current,
      token: delta.token,
      total: delta.total ?? current.total,
      source: delta.source ?? current.source,
      partial: false,
      timestamp: delta.timestamp ?? current.timestamp,
    };
  }

  const upserts = delta.upserts ?? {};
  const byKey = new Map<string, { bucket: FlightBucketKey; record: any }>();
  for (const bucket of FLIGHT_BUCKET_KEYS) {
    for (const record of current[bucket] ?? []) {
      byKey.set(flightRecordKey(record), { bucket, record });
    }
  }
  for (const key of delta.removed ?? []) byKey.delete(key);
  for (const bucket of FLIGHT_BUCKET_KEYS) {
    for (const record of upserts[bucket] ?? []) {
      const key = flightRecordKey(record);
      const existing = byKey.get(key);
      /* An upsert for a held aircraft is a field patch (the server sends
         full records only for new or re-bucketed aircraft): spread it
         over the held record so untouched fields survive. For a full
         record the same spread is a plain replace. */
      byKey.set(key, {
        bucket,
        record: existing ? { ...existing.record, ...record } : record,
      });
    }
  }

  /* Rebuild the buckets: records that stayed in their bucket keep their
     relative order; bucket-changers and new arrivals append in upsert
     order. Every key lands exactly once. */
  const next = {} as Record<FlightBucketKey, any[]>;
  const placed = new Set<string>();
  for (const bucket of FLIGHT_BUCKET_KEYS) {
    next[bucket] = [];
    for (const record of current[bucket] ?? []) {
      const key = flightRecordKey(record);
      const entry = byKey.get(key);
      if (entry && entry.bucket === bucket && !placed.has(key)) {
        next[bucket].push(entry.record);
        placed.add(key);
      }
    }
  }
  for (const bucket of FLIGHT_BUCKET_KEYS) {
    for (const record of upserts[bucket] ?? []) {
      const key = flightRecordKey(record);
      const entry = byKey.get(key);
      if (entry && !placed.has(key)) {
        next[bucket].push(entry.record);
        placed.add(key);
      }
    }
  }

  return {
    ...current,
    ...next,
    gps_jamming: delta.gps_jamming ?? current.gps_jamming,
    total: delta.total ?? current.total,
    source: delta.source ?? current.source,
    providers: delta.providers ?? current.providers,
    diagnostics: delta.diagnostics ?? current.diagnostics,
    partial: false,
    timestamp: delta.timestamp ?? current.timestamp,
    token: delta.token,
  };
}
