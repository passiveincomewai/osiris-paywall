/**
 * WorldEye — Traffic: NDW open data (Netherlands) measured speeds.
 *
 * The Dutch National Road Traffic Data Portal (NDW) publishes the
 * measurements of ~20,600 roadside detector sites as open DATEX II v3
 * — no key, no registration. Two files matter:
 *   • the measurement-site table (…configuratie_meetlocaties): each
 *     site's PointLocation latitude/longitude — sites are directly
 *     geolocated, so the feed's Alert-C/VILD referencing never enters
 *     our path;
 *   • the measurements file (…meetgegevens): per site, indexed
 *     physical quantities; TrafficSpeed entries carry
 *     <com:speed> in km/h (a value of -1 with
 *     numberOfInputValuesUsed=0 is the no-data sentinel and is dropped).
 *
 * What a site does NOT publish is a free-flow reference, so samples
 * carry the measured speed itself; the ratio is computed at match
 * time against the matched OSM road's own class free-flow speed
 * (./flow-samples, ./congestion) — the honest conversion, since the
 * road, not the detector, defines "free flow" in our model.
 *
 * Transport shape: the gzipped files are ~1–2 MB but decompress to
 * tens of MB of XML, refreshed upstream every minute. The route
 * caches aggressively and only pays the parse for Netherlands
 * viewports; the scanners below are linear indexOf walks, no DOM.
 */

import type { PointFlowSample } from './flow-samples';

export const NDW_SITES_URL =
  'https://opendata.ndw.nu/snelheden_en_intensiteiten_configuratie_meetlocaties.xml.gz';
export const NDW_MEASUREMENTS_URL =
  'https://opendata.ndw.nu/snelheden_en_intensiteiten_meetgegevens.xml.gz';

/** Netherlands extent — the route only spends NDW work on NL views. */
export const NL_BBOX = { west: 3.3, south: 50.7, east: 7.3, north: 53.6 };

export interface NdwSiteLocation { lat: number; lng: number }

function numTag(block: string, tag: string): number | null {
  const open = `<${tag}>`;
  const i = block.indexOf(open);
  if (i < 0) return null;
  const j = block.indexOf(`</${tag}>`, i + open.length);
  if (j < 0) return null;
  const n = Number(block.slice(i + open.length, j).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse the measurement-site table: site id → point location.
 * Sites without a parseable PointLocation are omitted — an
 * unplaceable detector must not influence the model.
 */
export function parseNdwSiteLocations(xml: string): Map<string, NdwSiteLocation> {
  const out = new Map<string, NdwSiteLocation>();
  const OPEN = '<roa:measurementSite ';
  const CLOSE = '</roa:measurementSite>';
  let pos = 0;
  for (;;) {
    const start = xml.indexOf(OPEN, pos);
    if (start < 0) break;
    const end = xml.indexOf(CLOSE, start);
    if (end < 0) break;
    const block = xml.slice(start, end);
    pos = end + CLOSE.length;
    const idMatch = / id="([^"]+)"/.exec(block.slice(0, 200));
    if (!idMatch) continue;
    const lat = numTag(block, 'loc:latitude');
    const lng = numTag(block, 'loc:longitude');
    if (lat === null || lng === null) continue;
    out.set(idMatch[1], { lat, lng });
  }
  return out;
}

/** Latest <com:publicationTime> in the document, epoch ms (or null). */
export function ndwPublicationTimeMs(xml: string): number | null {
  const TAG = '<com:publicationTime>';
  let at: number | null = null;
  let pos = 0;
  for (;;) {
    const i = xml.indexOf(TAG, pos);
    if (i < 0) break;
    const j = xml.indexOf('</com:publicationTime>', i + TAG.length);
    if (j < 0) break;
    const t = Date.parse(xml.slice(i + TAG.length, j).trim());
    if (Number.isFinite(t) && (at === null || t > at)) at = t;
    pos = j;
  }
  return at;
}

/**
 * Parse the measurements file into point samples: per site, the mean
 * of its valid TrafficSpeed values (km/h). Sites missing from
 * `locations`, or with no valid speed (all sentinels), are omitted.
 */
export function parseNdwSpeedSamples(
  xml: string,
  locations: Map<string, NdwSiteLocation>,
): PointFlowSample[] {
  const out: PointFlowSample[] = [];
  const OPEN = '<roa:siteMeasurements>';
  const CLOSE = '</roa:siteMeasurements>';
  const SPEED_OPEN = '<roa:basicData xsi:type="roa:TrafficSpeed">';
  let pos = 0;
  for (;;) {
    const start = xml.indexOf(OPEN, pos);
    if (start < 0) break;
    const end = xml.indexOf(CLOSE, start);
    if (end < 0) break;
    const block = xml.slice(start, end);
    pos = end + CLOSE.length;
    const ref = /measurementSiteReference[^>]* id="([^"]+)"/.exec(block);
    if (!ref) continue;
    const loc = locations.get(ref[1]);
    if (!loc) continue;
    const speeds: number[] = [];
    let sp = 0;
    for (;;) {
      const si = block.indexOf(SPEED_OPEN, sp);
      if (si < 0) break;
      const segEnd = block.indexOf('</roa:basicData>', si);
      const seg = block.slice(si, segEnd < 0 ? undefined : segEnd);
      sp = si + SPEED_OPEN.length;
      if (/numberOfInputValuesUsed="0"/.test(seg)) continue;
      const v = numTag(seg, 'com:speed');
      if (v !== null && v > 0) speeds.push(v);
    }
    if (!speeds.length) continue;
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    out.push({ lng: loc.lng, lat: loc.lat, source: 'ndw', speedKmh: Math.round(mean * 10) / 10 });
  }
  return out;
}
