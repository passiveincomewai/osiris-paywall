import { describe, expect, it } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './middleware';
import { version as maplibreVersion } from 'maplibre-gl/package.json';

const vendorDir = fileURLToPath(new URL('../public/vendor/maplibre/', import.meta.url));
const workerPath = `/vendor/maplibre/${maplibreVersion}/maplibre-gl-worker.mjs`;

/* PR #330 moved the MapLibre worker out of the bundle and onto a self-hosted
   public/ path. When that file is not retrievable the canvas and the
   main-thread entity layers still draw, but no vector tile can be parsed, so
   the basemap never arrives and startup times out into "The map couldn't
   finish loading" — the production failure that forced the revert to fac8d1b.
   Both halves of that path are asserted here: the file has to ship, and the
   analytics matcher has to leave it alone. */
describe('map runtime assets', () => {
  const matches = (path: string) => config.matcher.some(m => new RegExp(`^${m}$`).test(path));

  it('ships the worker the bundle actually asks for', () => {
    expect(existsSync(`${vendorDir}${maplibreVersion}/maplibre-gl-worker.mjs`)).toBe(true);
    // The worker is a module that imports this sibling by relative path.
    expect(existsSync(`${vendorDir}${maplibreVersion}/maplibre-gl-shared.mjs`)).toBe(true);
  });

  it('keeps exactly one vendored version, so local cannot pass while a clean deploy fails', () => {
    expect(readdirSync(vendorDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name)).toEqual([maplibreVersion]);
  });

  it('does not put analytics in front of the map worker, its sibling, or the basemap style', () => {
    expect(matches(workerPath)).toBe(false);
    expect(matches(`/vendor/maplibre/${maplibreVersion}/maplibre-gl-shared.mjs`)).toBe(false);
    expect(matches('/dark-matter-style.json')).toBe(false);
  });

  it('still counts page views', () => {
    expect(matches('/')).toBe(true);
    expect(matches('/merch')).toBe(true);
  });

  it('lets premium data APIs enter the middleware so freemium can gate them', () => {
    // /api/* is deliberately matched now; the middleware itself decides
    // which API prefixes are premium vs open.
    expect(matches('/api/cctv')).toBe(true);
    expect(matches('/api/flights')).toBe(true);
    expect(matches('/api/webhooks/stripe')).toBe(true);
  });
});

/* Tier-split gate pins (scope H3b): the OSINT intel layers (cyber,
   maritime, GDELT/conflict, live news) are VIP-only; the rest of the
   premium APIs stay Pro; vip ⊃ pro everywhere. */
import { apiGate } from './middleware';

const vip = { sub: 'u1', subscriptionStatus: 'active', planTier: 'vip' };
const pro = { sub: 'u1', subscriptionStatus: 'active', planTier: 'pro' };
const legacyPro = { sub: 'u1', subscriptionStatus: 'active' };
const free = { sub: 'u1', subscriptionStatus: 'none', planTier: 'free' };

describe('apiGate — intel layers are VIP-only', () => {
  const intel = [
    '/api/cyber-threats', '/api/cyber-attacks', '/api/malware',
    '/api/gdelt', '/api/gdelt-events', '/api/conflicts', '/api/frontlines',
    '/api/maritime', '/api/live-news', '/api/news',
  ];

  it('VIP opens every intel API', () => {
    for (const p of intel) expect(apiGate(p, vip)).toBe('open');
  });

  it('Pro is denied with the VIP upsell decision (incl. legacy tokens that cannot prove VIP)', () => {
    for (const p of intel) {
      expect(apiGate(p, pro)).toBe('vip');
      expect(apiGate(p, legacyPro)).toBe('vip');
    }
  });

  it('free / signed-out are denied as before', () => {
    for (const p of intel) {
      expect(apiGate(p, free)).toBe('vip');
      expect(apiGate(p, null)).toBe('vip');
      expect(apiGate(p, {})).toBe('vip');
    }
  });

  it('sub-paths of intel APIs are gated too', () => {
    expect(apiGate('/api/gdelt/events', pro)).toBe('vip');
    expect(apiGate('/api/maritime/vessels', vip)).toBe('open');
  });
});

describe('apiGate — everything else premium stays Pro', () => {
  const proApis = ['/api/oi', '/api/osint', '/api/ai', '/api/markets', '/api/region-dossier'];

  it('Pro and VIP both open Pro APIs (vip ⊃ pro)', () => {
    for (const p of proApis) {
      expect(apiGate(p, pro)).toBe('open');
      expect(apiGate(p, vip)).toBe('open');
      expect(apiGate(p, legacyPro)).toBe('open');
    }
  });

  it('free is denied at the Pro gate; open APIs stay open for everyone', () => {
    for (const p of proApis) expect(apiGate(p, free)).toBe('pro');
    expect(apiGate('/api/flights', free)).toBe('open');
    expect(apiGate('/api/cameras/bonus', null)).toBe('open');
    expect(apiGate('/api/checkout', null)).toBe('open');
  });
});

/* TEMPORARY (Jameson, 2026-10-31): the ArcGIS tools are open without a
   subscription while ARCGIS_PUBLIC_TEST_ACCESS (lib/arcgis/public-access)
   is on, so the owner can test them. /api/arcgis stays in
   PREMIUM_API_PREFIXES; when the switch is flipped back to false, these
   expectations invert to 'pro' for free / signed-out callers — update
   this block in the same push as the flip. */
describe('apiGate — ArcGIS tools under temporary public test access', () => {
  it('opens /api/arcgis to free and signed-out callers while the switch is on', () => {
    expect(apiGate('/api/arcgis', free)).toBe('open');
    expect(apiGate('/api/arcgis', null)).toBe('open');
    expect(apiGate('/api/arcgis', {})).toBe('open');
  });

  it('opens ArcGIS sub-paths too, and Pro/VIP as before', () => {
    expect(apiGate('/api/arcgis/search', free)).toBe('open');
    expect(apiGate('/api/arcgis', pro)).toBe('open');
    expect(apiGate('/api/arcgis', vip)).toBe('open');
  });

  it('leaves every other gate exactly as it was', () => {
    expect(apiGate('/api/osint', free)).toBe('pro');
    expect(apiGate('/api/osint', null)).toBe('pro');
    expect(apiGate('/api/maritime', pro)).toBe('vip');
    expect(apiGate('/api/flights', null)).toBe('open');
  });
});
