/**
 * OSIRIS — ADS-B feed response parsing.
 *
 * The tar1090 / ADSBexchange-v2 family of feeds has shipped TWO response
 * shapes for point queries, and confusing them is silent: the HTTP status is
 * 200 either way, so a parser reading the wrong key sees "quiet airspace"
 * instead of an error.
 *
 *   Current shape (adsb.fi /v3 point endpoint, /v2 type feeds such as /mil):
 *     { ac: [...], total, msg, now, ctime, ptime }
 *
 *   Deprecated shape (adsb.fi /v2 point endpoint, retired in favour of /v3 —
 *   its own README says it "returned data in a different format than other
 *   v2 endpoints"): { aircraft: [...], resultCount, now, ptime }
 *
 * WorldEye's /api/flights read only `ac` while its regional sweep still
 * pointed at the deprecated /v2 point endpoint, so the sweep ingested zero
 * aircraft from every region even though the provider was returning hundreds
 * per region (measured 2026-10-18: London 725, Tokyo 203, NYC 71 — parsed
 * as 0). extractAircraft() accepts both shapes so a future drift degrades
 * into the provider counts the route reports, not into an empty map.
 */
export function extractAircraft(data: unknown): any[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.ac)) return d.ac;
  if (Array.isArray(d.aircraft)) return d.aircraft;
  return [];
}

/** The Mode-S hex a record carries, normalised the way the route dedupes on. */
export function aircraftHex(ac: any): string {
  return typeof ac?.hex === 'string' ? ac.hex.toLowerCase().trim() : '';
}

/**
 * Append records whose hex has not been seen, preserving first-seen order.
 * Returns how many were added. Shared by every multi-feed merge in the
 * flights route so dedupe behaviour is identical across providers.
 */
export function ingestAircraft(raw: any[], into: any[], seen: Set<string>): number {
  let added = 0;
  for (const ac of raw || []) {
    const hex = aircraftHex(ac);
    if (hex && !seen.has(hex)) {
      seen.add(hex);
      into.push(ac);
      added++;
    }
  }
  return added;
}
