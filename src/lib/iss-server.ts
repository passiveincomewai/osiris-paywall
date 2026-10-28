/**
 * OSIRIS — the ISS's current TLE, server-side (for /iss-over pages).
 *
 * The same element set the globe itself flies on: CelesTrak's
 * stations group, the source /api/satellites already fetches, matched
 * by NORAD catalogue number 25544 so a renamed entry can never swap
 * the station (the rule lib/sky-today applies to the payload).
 *
 * Resolution order: this module's memory cache → the disk cache the
 * satellites route maintains (shared, avoids a second CelesTrak hit —
 * CelesTrak rate-limits, and /api/satellites/orbit reads the same
 * file) → a fresh stations-group fetch. Any failure returns null and
 * the pages degrade to their honest no-prediction state; a page must
 * never fail to build because a TLE fetch did.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { stealthFetch } from "./stealthFetch";

export interface IssTle {
  line1: string;
  line2: string;
  /** The TLE's own epoch — printed on the pages so a prediction is
   *  never presented as fresher than the elements behind it. */
  epoch: Date;
}

const ISS_NORAD = "25544";
const STATIONS_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle";
const CACHE_FILE = join(
  process.cwd(),
  ".next",
  "cache",
  "satellites-tle-cache.json",
);
const MEM_TTL_MS = 30 * 60_000;

let mem: { tle: IssTle; at: number } | null = null;

/** NORAD id lives in columns 3–7 of line 1. */
function noradOf(line1: string): string {
  return line1.substring(2, 7).trim();
}

/** Epoch from line 1: two-digit year (cols 19–20) + day-of-year with
 *  fraction (cols 21–32). Years < 57 are 20xx, else 19xx (NORAD rule). */
export function tleEpoch(line1: string): Date | null {
  if (!line1.startsWith("1 ") || line1.length < 32) return null;
  const yyRaw = line1.substring(18, 20);
  const dayRaw = line1.substring(20, 32);
  if (!/^\d{2}$/.test(yyRaw) || !/^\d+(\.\d+)?$/.test(dayRaw.trim())) return null;
  const yy = Number(yyRaw);
  const dayOfYear = Number(dayRaw);
  if (!Number.isFinite(yy) || !Number.isFinite(dayOfYear) || dayOfYear < 1) {
    return null;
  }
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  const ms = Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86_400_000;
  const d = new Date(ms);
  return Number.isFinite(d.getTime()) ? d : null;
}

function toIssTle(line1: string, line2: string): IssTle | null {
  if (noradOf(line1) !== ISS_NORAD) return null;
  const epoch = tleEpoch(line1);
  if (!epoch) return null;
  return { line1, line2, epoch };
}

function fromDiskCache(): IssTle | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const parsed = JSON.parse(readFileSync(CACHE_FILE, "utf8")) as {
      sats?: { line1?: string; line2?: string }[];
    };
    for (const sat of parsed.sats ?? []) {
      if (sat?.line1 && sat?.line2) {
        const tle = toIssTle(sat.line1, sat.line2);
        if (tle) return tle;
      }
    }
  } catch {
    // A corrupt cache means no prediction, not a broken page.
  }
  return null;
}

function parseStationsText(text: string): IssTle | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  for (let i = 0; i + 1 < lines.length; i++) {
    if (lines[i].startsWith("1 ") && lines[i + 1].startsWith("2 ")) {
      const tle = toIssTle(lines[i], lines[i + 1]);
      if (tle) return tle;
    }
  }
  return null;
}

export async function getIssTle(): Promise<IssTle | null> {
  if (mem && Date.now() - mem.at < MEM_TTL_MS) return mem.tle;

  const disk = fromDiskCache();
  if (disk) {
    mem = { tle: disk, at: Date.now() };
    return disk;
  }

  try {
    const res = await stealthFetch(STATIONS_URL);
    if (res.ok) {
      const tle = parseStationsText(await res.text());
      if (tle) {
        mem = { tle, at: Date.now() };
        return tle;
      }
    }
  } catch {
    // Fall through to null — the pages render their fallback state.
  }
  return null;
}
