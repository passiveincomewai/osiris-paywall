import { createHash } from 'node:crypto';

/**
 * Camera expansion — generation-time feed verification.
 *
 * An independent implementation of the health-check METHOD the Stage A
 * audit documented from Ora's sweep (audit §2.4): fingerprint each snapshot
 * with a small Range request (~1–2 KB instead of a full frame), and treat
 * identical bytes served by ≥3 different cameras as an agency placeholder
 * rather than three working cameras. No Ora code or data is used — the
 * method is an idea, re-implemented here against the audit's own probe
 * criteria (probe2.py): images need HTTP 200/206 + an image content-type or
 * image magic bytes; HLS needs a body starting #EXTM3U; pages need
 * reachability. Datacenter-IP probing underestimates browser-side liveness
 * for hosts that block bots, so a `dead` verdict here is a floor, and the
 * dry-run report says so.
 */

export type ProbeKind = 'image' | 'hls' | 'iframe' | 'mjpeg' | 'mp4';

export type ProbeStatus = 'alive' | 'dead' | 'placeholder';

export interface ProbeResult {
  url: string;
  kind: ProbeKind;
  status: ProbeStatus;
  httpStatus?: number;
  contentType?: string;
  /** sha1 of the first ≤1024 body bytes (snapshots only) — placeholder key. */
  fingerprint?: string;
  /** Machine-readable reason for a dead verdict. */
  detail?: string;
  /** ISO timestamp of the probe that produced this result. */
  probedAt: string;
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export const PROBE_TIMEOUT_MS = 8_000;
const RANGE_BYTES = 2047;

/** The slice of fetch the prober needs — narrow so tests can fake it. */
export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

async function readPrefix(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const out = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const take = Math.min(chunk.byteLength, out.byteLength - offset);
    if (take <= 0) break;
    out.set(chunk.subarray(0, take), offset);
    offset += take;
  }
  return out;
}

/** JPEG / PNG / GIF / WebP / BMP magic bytes. */
export function hasImageMagic(bytes: Uint8Array): boolean {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true; // JPEG
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true; // PNG
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true; // GIF
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return true; // WebP
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return true; // BMP
  return false;
}

export function fingerprintOf(bytes: Uint8Array): string {
  return createHash('sha1').update(bytes.subarray(0, 1024)).digest('hex');
}

function dead(url: string, kind: ProbeKind, detail: string, extra?: Partial<ProbeResult>): ProbeResult {
  return { url, kind, status: 'dead', detail, probedAt: new Date().toISOString(), ...extra };
}

/**
 * Probe one feed URL. Never throws — every failure is a `dead` verdict with
 * a reason, so a bad host cannot abort a harvest run.
 */
export async function probeFeed(
  url: string,
  kind: ProbeKind,
  fetchImpl: FetchImpl = fetch,
): Promise<ProbeResult> {
  const headers: Record<string, string> = { 'User-Agent': BROWSER_UA, Accept: '*/*' };
  if (kind === 'image' || kind === 'mjpeg' || kind === 'mp4') headers.Range = `bytes=0-${RANGE_BYTES}`;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch (error) {
    return dead(url, kind, error instanceof Error ? `network: ${error.message}` : 'network error');
  }

  const contentType = res.headers.get('content-type') ?? undefined;
  const base: Partial<ProbeResult> = { httpStatus: res.status, contentType };

  if (kind === 'iframe') {
    // Embeddability varies by provider and cannot be proven from here; the
    // audit's criterion for pages is reachability (its embed checks happen
    // in the viewer, via the existing resolve/status routes).
    if (res.status >= 200 && res.status < 400) {
      return { url, kind, status: 'alive', detail: 'reachable', probedAt: new Date().toISOString(), ...base };
    }
    return dead(url, kind, `http ${res.status}`, base);
  }

  if (res.status !== 200 && res.status !== 206) {
    return dead(url, kind, `http ${res.status}`, base);
  }

  if (kind === 'hls') {
    let text = '';
    try {
      text = new TextDecoder().decode(await readPrefix(res, 4096));
    } catch {
      return dead(url, kind, 'playlist read failed', base);
    }
    if (!text.startsWith('#EXTM3U')) return dead(url, kind, 'playlist does not start with #EXTM3U', base);
    if (!/#EXTINF|#EXT-X-STREAM-INF/.test(text)) return dead(url, kind, 'playlist has no segments or variants', base);
    return { url, kind, status: 'alive', probedAt: new Date().toISOString(), ...base };
  }

  // image / mjpeg / mp4
  let bytes: Uint8Array;
  try {
    bytes = await readPrefix(res, RANGE_BYTES + 1);
  } catch {
    return dead(url, kind, 'body read failed', base);
  }
  if (!bytes.length) return dead(url, kind, 'empty body', base);
  if (kind === 'mp4') {
    const isFtyp = bytes.length >= 8 && String.fromCharCode(...bytes.subarray(4, 8)) === 'ftyp';
    if (!(contentType ?? '').toLowerCase().includes('video') && !isFtyp) {
      return dead(url, kind, `not an mp4 (content-type: ${contentType ?? 'none'})`, base);
    }
    return { url, kind, status: 'alive', fingerprint: fingerprintOf(bytes), probedAt: new Date().toISOString(), ...base };
  }
  const typeOk = (contentType ?? '').toLowerCase().includes('image') || (kind === 'mjpeg' && (contentType ?? '').toLowerCase().includes('multipart'));
  if (!typeOk && !hasImageMagic(bytes)) {
    return dead(url, kind, `not an image (content-type: ${contentType ?? 'none'})`, base);
  }
  return {
    url,
    kind,
    status: 'alive',
    fingerprint: fingerprintOf(bytes),
    probedAt: new Date().toISOString(),
    ...base,
  };
}

/**
 * The placeholder pass (Ora's method): one fingerprint served for ≥3
 * distinct cameras is an agency "camera offline" image, not three working
 * feeds. Mutates and returns the results map (keyed by camera id).
 */
export function applyPlaceholderPass<T extends { probe: ProbeResult; probeUrl: string }>(
  entries: Map<string, T>,
): Map<string, T> {
  const byFingerprint = new Map<string, string[]>();
  for (const [id, entry] of entries) {
    const fp = entry.probe.fingerprint;
    if (entry.probe.status === 'alive' && fp) {
      const list = byFingerprint.get(fp);
      if (list) list.push(id);
      else byFingerprint.set(fp, [id]);
    }
  }
  for (const ids of byFingerprint.values()) {
    if (ids.length < 3) continue;
    // Same bytes from the same camera listed twice is not a placeholder;
    // the pass counts distinct probe URLs.
    const distinctUrls = new Set(ids.map(id => entries.get(id)!.probeUrl));
    if (distinctUrls.size < 3) continue;
    for (const id of ids) {
      const entry = entries.get(id)!;
      entry.probe = { ...entry.probe, status: 'placeholder', detail: `identical first bytes served by ${distinctUrls.size} cameras` };
    }
  }
  return entries;
}
