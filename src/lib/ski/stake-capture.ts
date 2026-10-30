import { createHash } from "node:crypto";

/**
 * Powder #5 (rescoped): pure helpers for the snow-stake overnight
 * capture. A "night" runs 16:00 → 10:00 America/Denver and is keyed by
 * the Denver calendar date it STARTED on, so the frames a skier checks
 * in the morning belong to the night that just ended. The cron fetches
 * each operator stake still hourly inside the window and stores only
 * frames whose signature changed — a still that hasn't refreshed (a
 * pre-season or stuck feed) is stored at most once per night.
 */

export const STAKE_CAPTURE_START_HOUR = 16; // Denver, inclusive
export const STAKE_CAPTURE_END_HOUR = 10; // Denver, exclusive (next morning)
export const STAKE_MAX_FRAMES_PER_NIGHT = 20; // hourly window is 18h; headroom
export const STAKE_RETENTION_DAYS = 2; // keep last night + the one before

export interface StakeFrame {
  /** ISO timestamp the frame was captured. */
  t: string;
  /** Public Blob URL of the stored frame. */
  url: string;
  /** Frame signature (see frameSignature). */
  sig: string;
}

interface DenverParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

function denverParts(now: Date): DenverParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find(p => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
  };
}

function dateKey(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * The stake-night key for `now`, or null outside the capture window.
 * Evening (hour ≥ 16) keys to today's Denver date; the small hours
 * (hour < 10) key to yesterday's — the night that started yesterday.
 */
export function stakeNightKey(now: Date): string | null {
  const p = denverParts(now);
  if (p.hour >= STAKE_CAPTURE_START_HOUR) return dateKey(p.year, p.month, p.day);
  if (p.hour < STAKE_CAPTURE_END_HOUR) {
    const prev = new Date(Date.UTC(p.year, p.month - 1, p.day) - 86_400_000);
    return dateKey(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
  }
  return null;
}

/** Denver HH:mm for a timestamp, for Blob paths and frame labels. */
export function denverClock(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(now)
    .replace("24:", "00:");
}

/** Short content signature — dedupes unchanged frames within a night. */
export function frameSignature(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

/** True when the bytes start with the JPEG SOI marker (FF D8 FF). */
export function isJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.length > 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

/**
 * Store a frame only when it differs from the night's latest frame and
 * the night still has room. An unchanged feed (stuck / pre-season still)
 * therefore costs one frame per night, never eighteen copies.
 */
export function shouldStoreFrame(frames: StakeFrame[], sig: string): boolean {
  if (frames.length >= STAKE_MAX_FRAMES_PER_NIGHT) return false;
  const last = frames[frames.length - 1];
  return !last || last.sig !== sig;
}

/** Night keys older than the retention window, for the purge step. */
export function isExpiredNight(nightKey: string, now: Date): boolean {
  const p = denverParts(now);
  const cutoff = new Date(
    Date.UTC(p.year, p.month - 1, p.day) - STAKE_RETENTION_DAYS * 86_400_000,
  );
  const cutoffKey = dateKey(
    cutoff.getUTCFullYear(),
    cutoff.getUTCMonth() + 1,
    cutoff.getUTCDate(),
  );
  return nightKey < cutoffKey;
}
