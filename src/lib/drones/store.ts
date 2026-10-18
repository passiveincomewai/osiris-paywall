/**
 * WorldEye — Live Drone Tracking: in-memory live store.
 *
 * Holds ONLY sanitized observations (see privacy.ts). State is per warm
 * server instance — the same trade-off the rest of WorldEye's live layers
 * make (see lib/sourceCache): Vercel instances are ephemeral, so a drone
 * is visible to clients of an instance while that instance keeps
 * receiving reports for it. Nothing is written to disk or the database;
 * when the instance dies, the sky it knew dies with it. That is a
 * deliberate privacy property as much as an architectural one.
 *
 * Lifetimes:
 *  - a drone vanishes DRONE_TTL_MS after its last observation;
 *  - a trail keeps at most TRAIL_MAX_POINTS points inside TRAIL_WINDOW_MS;
 *  - a receiver counts as COVERAGE for RECEIVER_ACTIVE_MS after its last
 *    accepted report, and is forgotten after RECEIVER_TTL_MS.
 */

import type { CleanObservation } from './privacy';
import type { PublicDrone, PublicReceiver } from './types';

export const DRONE_TTL_MS = 90_000;
export const RECEIVER_ACTIVE_MS = 10 * 60_000;
export const RECEIVER_TTL_MS = 60 * 60_000;
export const TRAIL_MAX_POINTS = 120;
export const TRAIL_WINDOW_MS = 10 * 60_000;
export const DEFAULT_RECEIVER_RADIUS_M = 2_500;
export const MIN_RECEIVER_RADIUS_M = 100;
export const MAX_RECEIVER_RADIUS_M = 10_000;

interface DroneRecord {
  obs: CleanObservation;
  trail: { lng: number; lat: number; at: number }[];
}

interface ReceiverRecord {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  lastReport: number;
}

const drones = new Map<string, DroneRecord>();
const receivers = new Map<string, ReceiverRecord>();

export function clampReceiverRadius(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : DEFAULT_RECEIVER_RADIUS_M;
  return Math.min(MAX_RECEIVER_RADIUS_M, Math.max(MIN_RECEIVER_RADIUS_M, n));
}

/** Register/refresh the reporting receiver and merge its observations. */
export function ingestReport(
  receiver: { id: string; name?: string; lat: number; lng: number; radiusM?: number },
  clean: CleanObservation[],
  nowMs: number,
): { accepted: number } {
  receivers.set(receiver.id, {
    id: receiver.id,
    name: receiver.name?.slice(0, 60) || receiver.id,
    lat: receiver.lat,
    lng: receiver.lng,
    radiusM: clampReceiverRadius(receiver.radiusM),
    lastReport: nowMs,
  });
  let accepted = 0;
  for (const o of clean) {
    const prev = drones.get(o.publicId);
    if (prev && prev.obs.seenAt > o.seenAt) continue; // out-of-order guard
    const trail = prev ? prev.trail : [];
    const lastPt = trail[trail.length - 1];
    if (!lastPt || lastPt.lng !== o.lng || lastPt.lat !== o.lat) {
      trail.push({ lng: o.lng, lat: o.lat, at: o.seenAt });
    }
    const trimmed = trail
      .filter((p) => o.seenAt - p.at <= TRAIL_WINDOW_MS)
      .slice(-TRAIL_MAX_POINTS);
    drones.set(o.publicId, { obs: o, trail: trimmed });
    accepted++;
  }
  prune(nowMs);
  return { accepted };
}

export function prune(nowMs: number): void {
  for (const [id, rec] of drones) {
    if (nowMs - rec.obs.seenAt > DRONE_TTL_MS) drones.delete(id);
  }
  for (const [id, rec] of receivers) {
    if (nowMs - rec.lastReport > RECEIVER_TTL_MS) receivers.delete(id);
  }
}

/** Current public snapshot — drones sorted freshest first. */
export function snapshot(nowMs: number): { drones: PublicDrone[]; receivers: PublicReceiver[] } {
  prune(nowMs);
  const out: PublicDrone[] = [];
  for (const rec of drones.values()) {
    const o = rec.obs;
    out.push({
      id: o.publicId,
      lat: o.lat,
      lng: o.lng,
      altitudeMslM: o.altitudeMslM,
      heightAglM: o.heightAglM,
      headingDeg: o.headingDeg,
      speedMps: o.speedMps,
      verticalSpeedMps: o.verticalSpeedMps,
      uaType: o.uaType,
      lastSeen: o.seenAt,
      ageS: Math.max(0, Math.round((nowMs - o.seenAt) / 1000)),
      trail: rec.trail.map((p) => [p.lng, p.lat] as [number, number]),
    });
  }
  out.sort((a, b) => b.lastSeen - a.lastSeen);
  const recs: PublicReceiver[] = [...receivers.values()].map((r) => ({
    id: r.id,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    radiusM: r.radiusM,
    lastReport: r.lastReport,
    active: nowMs - r.lastReport <= RECEIVER_ACTIVE_MS,
  }));
  return { drones: out, receivers: recs };
}

/** Receivers whose coverage is live right now. */
export function activeReceivers(nowMs: number): PublicReceiver[] {
  return snapshot(nowMs).receivers.filter((r) => r.active);
}

/** Test seam — clears all live drone state. */
export function clearDroneStore(): void {
  drones.clear();
  receivers.clear();
}

// ── Ingest rate limiting ────────────────────────────────────────────────
// Fixed-window per-key counter. Ingest keys are receiver identities, so a
// misbehaving gateway cannot starve others. In-memory like the store.

const windows = new Map<string, { start: number; count: number }>();
export const INGEST_LIMIT_PER_MIN = 120;

export function rateLimitOk(key: string, nowMs: number, limit = INGEST_LIMIT_PER_MIN): boolean {
  const w = windows.get(key);
  if (!w || nowMs - w.start >= 60_000) {
    windows.set(key, { start: nowMs, count: 1 });
    return true;
  }
  if (w.count >= limit) return false;
  w.count++;
  return true;
}

/** Test seam — clears rate-limit windows. */
export function clearRateLimits(): void {
  windows.clear();
}
