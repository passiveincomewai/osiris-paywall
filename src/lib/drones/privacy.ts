/**
 * WorldEye — Live Drone Tracking: ingest normalizer + PRIVACY FILTER.
 *
 * This module is the trust boundary of the drone layer. Everything a
 * receiver posts passes through `sanitizeObservation` before it can reach
 * the store, and the store only ever holds the sanitized shape:
 *
 *  - The OpenDroneID System message carries the OPERATOR's latitude and
 *    longitude (where the pilot is standing). It is dropped here and
 *    never stored or served — a drone's position is public broadcast
 *    data; its pilot's position is a person's location.
 *  - Operator IDs and Self-ID free text (frequently a pilot name or
 *    phone number) are dropped for the same reason.
 *  - The drone's persistent identifier (serial number, Basic ID) is
 *    replaced by a session-scoped SHA-256 hash: stable within a 6-hour
 *    window so a flight renders as one track, different across windows
 *    and useless for following a specific airframe long-term.
 *  - Authentication message pages are dropped (no client needs them).
 *
 * The stored record deliberately has NO field that could carry operator
 * data, so later code cannot leak what was never kept.
 */

import { createHash } from 'node:crypto';
import type { RawObservation } from './types';

/** Sanitized observation — the only shape the store accepts. */
export interface CleanObservation {
  /** Session-scoped public id (hash of the persistent id). */
  publicId: string;
  lat: number;
  lng: number;
  altitudeMslM: number | null;
  heightAglM: number | null;
  headingDeg: number | null;
  speedMps: number | null;
  verticalSpeedMps: number | null;
  uaType: number | null;
  /** Epoch ms when the receiver observed the drone. */
  seenAt: number;
}

const ID_WINDOW_MS = 6 * 60 * 60 * 1000; // 6-hour session window for ids

/**
 * Process-local fallback salt. When DRONE_ID_SALT is unset the public ids
 * still rotate on every deploy/restart — privacy-safe by default, at the
 * cost of tracks splitting across restarts. Operators who run receivers
 * should set DRONE_ID_SALT so ids are stable within the window.
 */
const PROCESS_SALT = createHash('sha256')
  .update(`worldeye-drone-${process.pid}-${Date.now()}`)
  .digest('hex');

function idSalt(): string {
  return process.env.DRONE_ID_SALT || PROCESS_SALT;
}

/** Session-scoped public id for a persistent drone identifier. */
export function publicDroneId(persistentId: string, nowMs: number): string {
  const window = Math.floor(nowMs / ID_WINDOW_MS);
  const h = createHash('sha256')
    .update(`we-drone:${idSalt()}:${window}:${persistentId}`)
    .digest('hex');
  return `drn_${h.slice(0, 16)}`;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function parseTimestamp(v: number | string | undefined, nowMs: number): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Accept epoch seconds as well as ms; anything before 2020 is junk.
    const ms = v < 1e12 ? v * 1000 : v;
    return ms > 1577836800000 ? ms : null;
  }
  if (typeof v === 'string') {
    const ms = Date.parse(v);
    return Number.isFinite(ms) && ms > 1577836800000 ? ms : null;
  }
  return nowMs; // receivers may omit it — receipt time is the fallback
}

/**
 * Normalize one raw observation and strip everything sensitive.
 * Returns null when the observation has no usable identity or position —
 * a position report we cannot attribute to a (hashed) airframe, or with
 * out-of-range coordinates, is not stored.
 */
export function sanitizeObservation(
  raw: RawObservation,
  nowMs: number,
): CleanObservation | null {
  if (!raw || typeof raw !== 'object') return null;

  // Identity: flat `id`, or the UASID of a nested BasicID message. The
  // persistent value is used ONLY as hash input and never stored.
  const persistentId =
    (typeof raw.id === 'string' && raw.id.trim()) ||
    (typeof raw.BasicID?.UASID === 'string' && raw.BasicID.UASID.trim()) ||
    '';
  if (!persistentId) return null;

  // Position: flat fields, or a nested Location message.
  const lat = num(raw.lat) ?? num(raw.Location?.Latitude);
  const lng = num(raw.lng) ?? num(raw.Location?.Longitude);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null; // ODID "invalid/no value" sentinel

  const heading = num(raw.headingDeg) ?? num(raw.Location?.Direction);
  const seenAt = parseTimestamp(raw.timestamp, nowMs);
  if (seenAt === null) return null;
  // Refuse observations from the future beyond clock-skew tolerance, and
  // anything already older than the live window (a replayed log is not a
  // live detection).
  if (seenAt > nowMs + 5 * 60_000) return null;
  if (nowMs - seenAt > 10 * 60_000) return null;

  return {
    publicId: publicDroneId(persistentId, seenAt),
    lat,
    lng,
    altitudeMslM: num(raw.altitudeMslM) ?? num(raw.Location?.AltitudeGeodetic),
    heightAglM: num(raw.heightAglM) ?? num(raw.Location?.Height),
    // ODID direction 361+ means "unknown"; clamp nonsense to unknown too.
    headingDeg: heading !== null && heading >= 0 && heading <= 360 ? heading : null,
    speedMps: num(raw.speedMps) ?? num(raw.Location?.SpeedHorizontal),
    verticalSpeedMps: num(raw.verticalSpeedMps) ?? num(raw.Location?.SpeedVertical),
    uaType: num(raw.uaType) ?? num(raw.BasicID?.UAType),
    seenAt,
  };
  // NOTE: raw.operatorLat / raw.operatorLng / raw.System / raw.operatorId /
  // raw.selfId / raw.authentication are intentionally never read into the
  // result. They end here.
}
