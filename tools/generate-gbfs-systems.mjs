#!/usr/bin/env node
/**
 * Generate public/data/gbfs-systems.json — the GBFS micromobility systems
 * directory snapshot the globe loads when the Bike & Scooter Share layer
 * is switched on.
 *
 * Source of truth: MobilityData's GBFS systems.csv (the canonical
 * directory of GBFS feeds — https://github.com/MobilityData/gbfs).
 * For every keyless system we resolve its GBFS auto-discovery document,
 * then its station_information feed (or free_bike_status for dockless
 * systems), and record the network's centroid + size. Systems that need
 * authentication, fail to resolve, or publish no station locations are
 * skipped — the snapshot only lists systems the globe can actually draw.
 *
 * Run: node tools/generate-gbfs-systems.mjs
 */

import { writeFile } from 'node:fs/promises';

const CSV_URL = 'https://raw.githubusercontent.com/MobilityData/gbfs/master/systems.csv';
const OUT = process.env.GBFS_OUT
  ? new URL('file://' + process.env.GBFS_OUT)
  : new URL('../public/data/gbfs-systems.json', import.meta.url);
const CONCURRENCY = 24;
const TIMEOUT_MS = 20000;
const UA = { 'User-Agent': 'WorldEye-OSIRIS/1.0 (gbfs-systems-snapshot)' };

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body
    .filter(r => r.length >= head.length - 2)
    .map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

async function getJson(url) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function feedMap(discovery) {
  const data = discovery?.data;
  if (!data) return {};
  const feeds = Array.isArray(data.feeds) ? data.feeds : data.en?.feeds ?? Object.values(data)[0]?.feeds ?? [];
  const map = {};
  for (const f of feeds) if (f?.name && f?.url) map[f.name] = f.url;
  return map;
}

async function resolveSystem(row) {
  const discoveryUrl = row['Auto-Discovery URL'];
  const discovery = await getJson(discoveryUrl);
  const feeds = feedMap(discovery);
  let type = null, feedUrl = null;
  if (feeds.station_information) { type = 'station'; feedUrl = feeds.station_information; }
  else if (feeds.free_bike_status) { type = 'free'; feedUrl = feeds.free_bike_status; }
  if (!feedUrl) return null;
  const feed = await getJson(feedUrl);
  const items = type === 'station' ? feed?.data?.stations : feed?.data?.bikes;
  if (!Array.isArray(items) || items.length === 0) return null;
  let latSum = 0, lngSum = 0, n = 0;
  for (const it of items) {
    const lat = it.lat ?? it.latitude, lng = it.lon ?? it.lng ?? it.longitude;
    if (typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
      latSum += lat; lngSum += lng; n++;
    }
  }
  if (n === 0) return null;
  return {
    id: row['System ID'],
    name: row['Name'],
    city: row['Location'],
    country: row['Country Code'],
    lat: Math.round((latSum / n) * 10000) / 10000,
    lng: Math.round((lngSum / n) * 10000) / 10000,
    n: items.length,
    type,
    url: discoveryUrl,
  };
}

const csv = await (await fetch(CSV_URL, { headers: UA })).text();
const allRows = parseCsv(csv).filter(r =>
  r['Auto-Discovery URL']?.startsWith('http') &&
  !r['Authentication Type'] &&
  r['System ID'] && r['Name'],
);
// Optional slicing for chunked runs in flaky environments:
// GBFS_OFFSET / GBFS_LIMIT select a window of the candidate list.
const OFFSET = Number(process.env.GBFS_OFFSET ?? 0);
const LIMIT = Number(process.env.GBFS_LIMIT ?? allRows.length);
const rows = allRows.slice(OFFSET, OFFSET + LIMIT);
console.log(`systems.csv: ${allRows.length} keyless candidates; this run: ${rows.length} (offset ${OFFSET})`);

const out = [];
let done = 0, failed = 0;
const queue = [...rows];
async function worker() {
  while (queue.length) {
    const row = queue.shift();
    try {
      const sys = await resolveSystem(row);
      if (sys) out.push(sys); else failed++;
    } catch { failed++; }
    if (++done % 150 === 0) console.log(`  ${done}/${rows.length} processed, ${out.length} resolved`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

out.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
const payload = {
  generated: new Date().toISOString(),
  source: 'MobilityData GBFS systems directory (github.com/MobilityData/gbfs)',
  count: out.length,
  systems: out,
};
await writeFile(OUT, JSON.stringify(payload));
console.log(`wrote ${out.length} systems (${failed} skipped) → ${OUT.pathname}`);
