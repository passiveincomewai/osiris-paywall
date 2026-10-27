// ── Submit-a-camera: duplicate detection against the catalogue ─────────
// Pure matching logic (no I/O) so it unit-tests without the catalogue on
// disk. The server route feeds it the directory dataset the site itself
// serves (src/lib/camera-directory-lookup) mapped to CatalogueEntry.
//
// Two verdicts matter at intake:
//  - "exact":    the submitted address IS a feed address already listed.
//                The submission is a duplicate, full stop — the route
//                refuses it and tells the submitter which camera it is.
//  - "possible": same/near-same name AND (close coordinates OR the same
//                city). A human decides — the submission is queued and
//                the match is flagged for the reviewer and shown to the
//                submitter as a possible duplicate.
// Anything else is "none". Name similarity alone, without a place signal,
// is never enough: the world is full of "Main Street Cam"s.

export interface CatalogueEntry {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Every address the catalogue record carries (feed/stream/page). */
  urls: string[];
}

export interface DuplicateCandidate {
  name: string;
  url: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

export interface DuplicateMatch {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  reason: string;
}

export type DuplicateVerdict = "exact" | "possible" | "none";

export interface DuplicateCheck {
  verdict: DuplicateVerdict;
  matches: DuplicateMatch[];
}

/** Two pins closer than this, with matching names, are the same camera
 *  until a reviewer says otherwise. */
export const NEAR_DUPLICATE_METERS = 250;
const MAX_MATCHES = 3;

/**
 * Canonical form of a feed address for equality checks: scheme ignored
 * (http/https serve the same feeds), host lowercased without a leading
 * "www.", default ports dropped, trailing path slash and fragment
 * dropped, tracking parameters removed, remaining query sorted. Returns
 * null when the string isn't a parseable absolute URL — an unparseable
 * catalogue address simply can't exact-match.
 */
export function normalizeFeedUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const port = u.port && u.port !== "80" && u.port !== "443" ? `:${u.port}` : "";
  const path = u.pathname.replace(/\/+$/, "") || "/";
  const params = [...u.searchParams.entries()]
    .filter(([k]) => !/^utm_/i.test(k) && k.toLowerCase() !== "ref")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const query = params.length
    ? `?${params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")}`
    : "";
  return `${host}${port}${path}${query}`;
}

/** Names compare without case, punctuation or extra whitespace. */
export function normalizeCameraName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function nameTokens(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter(Boolean));
}

/** Token-set Jaccard similarity of two already-normalized names. */
export function nameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Check one submission against catalogue entries. Exact URL matches win
 * outright (a single one settles the verdict); otherwise name+place
 * near-matches are collected, strongest first.
 */
export function findCatalogueDuplicates(
  entries: readonly CatalogueEntry[],
  sub: DuplicateCandidate,
): DuplicateCheck {
  const targetUrl = normalizeFeedUrl(sub.url);
  if (targetUrl) {
    for (const e of entries) {
      for (const u of e.urls) {
        if (u && normalizeFeedUrl(u) === targetUrl) {
          return {
            verdict: "exact",
            matches: [
              {
                id: e.id,
                name: e.name,
                city: e.city ?? null,
                country: e.country ?? null,
                reason: "same feed address",
              },
            ],
          };
        }
      }
    }
  }

  const subName = normalizeCameraName(sub.name);
  const subCity = normalizeCameraName(sub.city);
  const possible: DuplicateMatch[] = [];
  for (const e of entries) {
    const entryName = normalizeCameraName(e.name ?? "");
    if (!entryName || !subName) continue;
    const sim = nameSimilarity(subName, entryName);
    const containment =
      subName.length >= 6 && entryName.length >= 6 &&
      (subName.includes(entryName) || entryName.includes(subName));
    if (sim < 0.8 && !containment) continue;

    // Name signal alone is not enough — require a place signal too.
    let reason: string | null = null;
    if (
      sub.lat != null && sub.lng != null &&
      typeof e.lat === "number" && typeof e.lng === "number"
    ) {
      const d = haversineMeters(sub.lat, sub.lng, e.lat, e.lng);
      if (d <= NEAR_DUPLICATE_METERS) {
        reason = `same name, ${Math.max(1, Math.round(d))} m apart`;
      }
    }
    if (!reason && subCity && e.city && normalizeCameraName(e.city) === subCity) {
      reason = "same name in the same city";
    }
    if (reason) {
      possible.push({
        id: e.id,
        name: e.name,
        city: e.city ?? null,
        country: e.country ?? null,
        reason,
      });
      if (possible.length >= MAX_MATCHES) break;
    }
  }
  return possible.length
    ? { verdict: "possible", matches: possible }
    : { verdict: "none", matches: [] };
}
