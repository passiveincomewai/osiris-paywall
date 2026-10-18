import type { CctvCamera } from '../../app/api/cctv/types';

/**
 * Camera expansion — generation-time duplicate detection.
 *
 * A TypeScript port of the Stage A audit's matcher
 * (~/workspace/worldeye-camera-expansion/work/match.py), extended with the
 * provider-id matcher the expansion brief lists first and the audit's
 * calibration finding. The catalogue route concatenates regions WITHOUT
 * deduping (route.ts), so this is the only duplicate defence a generated
 * source has — it runs against the current served catalogue at generation
 * time, and again against the harvest's own accepted set (two OpenCCTV
 * families can carry the same physical camera under different ids).
 *
 * Matchers, in order (audit §3.1, residual duplicate rate 0.25%):
 *   0. identical catalogue id (same provider + upstream id);
 *   1. normalized URL, full form (host + path + query);
 *   2. normalized URL, host/path form (query differences forgiven);
 *   3. same location: ≤10 m away, whatever the names say — the audit's
 *      calibration pass found the proximity residue is dominated by the
 *      same physical camera under a generic name ("probably existing" in
 *      the brief's classes — never auto-imported);
 *   4. geographic + name: ≤120 m away with name-token containment ≥ 0.5.
 * A record ≤120 m away whose name does NOT match is `near-distinct`: a
 * different camera near an existing one (an intersection legitimately has
 * several). It is never merged into the existing record; it is reported
 * separately so the import decision on that class stays visible.
 */

export type DupMethod = 'id' | 'url-full' | 'url-hostpath' | 'same-location' | 'geo-name';

export type ClassifyResult =
  | { cls: 'duplicate'; method: DupMethod; matchedId: string }
  | { cls: 'near-distinct'; matchedId: string; distanceM: number }
  | { cls: 'new' };

/** Lowercase host, collapse duplicate slashes, strip trailing slash. */
export function normalizeUrlHostPath(url: string): string {
  const unwrapped = unwrapProxyUrl(url);
  try {
    const parsed = new URL(unwrapped.trim());
    const host = parsed.host.toLowerCase();
    const path = parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '');
    return `${host}${path}`;
  } catch {
    return unwrapped.trim().toLowerCase();
  }
}

/** Host/path + query — the strict URL form. */
export function normalizeUrlFull(url: string): string {
  const unwrapped = unwrapProxyUrl(url);
  try {
    const parsed = new URL(unwrapped.trim());
    const host = parsed.host.toLowerCase();
    const path = parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '');
    return parsed.search ? `${host}${path}${parsed.search}` : `${host}${path}`;
  } catch {
    return unwrapped.trim().toLowerCase();
  }
}

/**
 * Snapshot URLs the catalogue serves through /api/cctv/proxy must compare
 * equal to the same URL at the source — unwrap before normalizing (both
 * sides of the comparison pass through here).
 */
export function unwrapProxyUrl(url: string): string {
  if (!url.startsWith('/api/cctv/proxy?')) return url;
  try {
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    return params.get('url') ?? url;
  } catch {
    return url;
  }
}

const STOPWORDS = new Set([
  'camera', 'cam', 'cctv', 'traffic', 'live', 'at', 'the', 'of', 'on',
  'nr', 'rd', 'st', 'ave', 'blvd', 'hwy',
  'north', 'south', 'east', 'west', 'nb', 'sb', 'eb', 'wb',
]);

export function nameTokens(name: string): Set<string> {
  const tokens = new Set<string>();
  for (const token of (name || '').toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (token.length > 1 && !STOPWORDS.has(token)) tokens.add(token);
  }
  return tokens;
}

/** Containment similarity — |A∩B| / min(|A|,|B|), as in the audit matcher. */
export function nameSimilarity(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const token of ta) if (tb.has(token)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const CELL = 0.0016; // ~150–175 m — the audit matcher's grid

interface IndexedCamera {
  camera: CctvCamera;
  name: string;
}

/**
 * A searchable index over a camera set (the served catalogue, or the
 * harvest's accepted records). `add` supports the incremental second pass:
 * candidates are classified against baseline + everything accepted so far.
 */
export class CameraIndex {
  private ids = new Set<string>();
  private urlFull = new Map<string, string>();
  private urlHostPath = new Map<string, string>();
  private grid = new Map<string, IndexedCamera[]>();

  constructor(cameras: Iterable<CctvCamera> = []) {
    for (const camera of cameras) this.add(camera);
  }

  add(camera: CctvCamera): void {
    this.ids.add(camera.id);
    for (const url of [camera.feed_url, camera.stream_url, camera.external_url]) {
      if (!url) continue;
      const full = normalizeUrlFull(url);
      if (full && !this.urlFull.has(full)) this.urlFull.set(full, camera.id);
      const hostPath = normalizeUrlHostPath(url);
      if (hostPath && !this.urlHostPath.has(hostPath)) this.urlHostPath.set(hostPath, camera.id);
    }
    const key = `${Math.round(camera.lat / CELL)},${Math.round(camera.lng / CELL)}`;
    const cell = this.grid.get(key);
    if (cell) cell.push({ camera, name: camera.name });
    else this.grid.set(key, [{ camera, name: camera.name }]);
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  private nearby(lat: number, lng: number): IndexedCamera[] {
    const gx = Math.round(lat / CELL);
    const gy = Math.round(lng / CELL);
    const out: IndexedCamera[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = this.grid.get(`${gx + dx},${gy + dy}`);
        if (cell) out.push(...cell);
      }
    }
    return out;
  }

  classify(candidate: CctvCamera): ClassifyResult {
    if (this.ids.has(candidate.id)) {
      return { cls: 'duplicate', method: 'id', matchedId: candidate.id };
    }
    const urls = [candidate.feed_url, candidate.stream_url, candidate.external_url].filter(
      (u): u is string => typeof u === 'string' && u.length > 0,
    );
    for (const url of urls) {
      const hit = this.urlFull.get(normalizeUrlFull(url));
      if (hit) return { cls: 'duplicate', method: 'url-full', matchedId: hit };
    }
    for (const url of urls) {
      const hit = this.urlHostPath.get(normalizeUrlHostPath(url));
      if (hit) return { cls: 'duplicate', method: 'url-hostpath', matchedId: hit };
    }

    let near: { id: string; distanceM: number } | undefined;
    for (const other of this.nearby(candidate.lat, candidate.lng)) {
      const distance = haversineM(candidate.lat, candidate.lng, other.camera.lat, other.camera.lng);
      if (distance <= 10) {
        return { cls: 'duplicate', method: 'same-location', matchedId: other.camera.id };
      }
      if (distance <= 120) {
        if (nameSimilarity(candidate.name, other.name) >= 0.5) {
          return { cls: 'duplicate', method: 'geo-name', matchedId: other.camera.id };
        }
        if (!near || distance < near.distanceM) near = { id: other.camera.id, distanceM: distance };
      }
    }
    if (near) return { cls: 'near-distinct', matchedId: near.id, distanceM: near.distanceM };
    return { cls: 'new' };
  }
}
