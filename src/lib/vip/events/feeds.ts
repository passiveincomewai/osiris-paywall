/**
 * Event-alert feeds — server-side fetchers for the checker and brief.
 *
 * Each fetcher fails soft (null / empty) — an upstream outage means
 * "no alerts this cycle", never a crash and never a fabricated event.
 */
import type { QuakeInput } from "./logic";

const USGS_DAY_FEED =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

/** The same USGS M2.5+ day feed the globe's earthquake layer reads. */
export async function fetchQuakes(): Promise<QuakeInput[]> {
  try {
    const res = await fetch(USGS_DAY_FEED, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: unknown[] };
    const out: QuakeInput[] = [];
    for (const f of data.features ?? []) {
      const feat = f as {
        id?: string;
        properties?: Record<string, unknown>;
        geometry?: { coordinates?: number[] };
      };
      const props = feat.properties ?? {};
      const coords = feat.geometry?.coordinates ?? [];
      const mag = typeof props.mag === "number" ? props.mag : NaN;
      const time = typeof props.time === "number" ? props.time : NaN;
      if (!feat.id || !Number.isFinite(mag) || !Number.isFinite(time)) continue;
      if (typeof coords[0] !== "number" || typeof coords[1] !== "number") continue;
      out.push({
        id: String(feat.id),
        mag,
        place: typeof props.place === "string" ? props.place : "Unknown location",
        timeMs: time,
        lat: coords[1],
        lng: coords[0],
        depthKm: typeof coords[2] === "number" ? coords[2] : null,
        url: typeof props.url === "string" ? props.url : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/* ───────────────────────── ISS TLE (CelesTrak) ──────────────────────── */

export interface IssTle {
  line1: string;
  line2: string;
  fetchedAt: number;
}

const ISS_TTL_MS = 2 * 60 * 60_000;
let issCache: IssTle | null = null;

/** Parse a TLE text block and return the entry for one NORAD id. */
export function tleForNorad(text: string, noradId: string): { line1: string; line2: string } | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i + 1 < lines.length; i++) {
    if (lines[i].startsWith("1 ") && lines[i].substring(2, 7).trim() === noradId) {
      const line2 = lines[i + 1];
      if (line2?.startsWith("2 ")) return { line1: lines[i], line2 };
    }
  }
  return null;
}

/** The ISS (NORAD 25544) TLE from CelesTrak's stations group, cached 2h. */
export async function fetchIssTle(nowMs: number = Date.now()): Promise<IssTle | null> {
  if (issCache && nowMs - issCache.fetchedAt < ISS_TTL_MS) return issCache;
  try {
    const res = await fetch(
      "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return issCache;
    const text = await res.text();
    const tle = tleForNorad(text, "25544");
    if (!tle) return issCache;
    issCache = { ...tle, fetchedAt: nowMs };
    return issCache;
  } catch {
    return issCache;
  }
}
