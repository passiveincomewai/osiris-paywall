import { appBaseUrl } from './app-url';

/**
 * Camera share links: one canonical deep link per camera —
 * `<base>/?camera=<catalogue id>` — plus the share action itself.
 *
 * The id is the catalogue id exactly as served by /api/cctv (baseline
 * slugs, `occ-…` harvest ids, `faa-…` weather-cam ids), so one resolver
 * covers every source. The globe page reads the param back through
 * `sharedCameraIdFromSearch` + `findCameraById` and opens the camera
 * through the same gated path a map click takes; an id that no loaded
 * record matches simply lands the visitor on the globe.
 */

export const CAMERA_SHARE_PARAM = 'camera';

export interface ShareableCamera {
  id?: string | number | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
}

/** The catalogue id a share link carries; null when the record has none. */
export function cameraShareId(camera: ShareableCamera | null | undefined): string | null {
  if (camera?.id === null || camera?.id === undefined) return null;
  const id = String(camera.id).trim();
  return id ? id : null;
}

function defaultBase(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return appBaseUrl();
}

/**
 * The deep link for a camera, or null when the camera carries no id —
 * callers hide the share affordance rather than mint a link that cannot
 * resolve. `base` is injectable for tests and off-browser callers.
 */
export function buildCameraShareUrl(camera: ShareableCamera | null | undefined, base?: string): string | null {
  const id = cameraShareId(camera);
  if (!id) return null;
  const root = (base ?? defaultBase()).replace(/\/+$/, '');
  return `${root}/?${CAMERA_SHARE_PARAM}=${encodeURIComponent(id)}`;
}

/** Share-sheet title: the camera's name and nothing it can't back up. */
export function cameraShareTitle(camera: ShareableCamera | null | undefined): string {
  const name = camera?.name?.trim();
  return `${name ? name : 'Live camera'} — live on WorldEye`;
}

/** Share-sheet body text: name plus place, when the record carries them. */
export function cameraShareText(camera: ShareableCamera | null | undefined): string {
  const title = cameraShareTitle(camera);
  const place = [camera?.city, camera?.country].map(p => p?.trim()).filter(Boolean).join(', ');
  return place ? `${title} · ${place}` : title;
}

/** Read the camera id out of a query string (`?…` or bare `a=b&…`). */
export function sharedCameraIdFromSearch(search: string | null | undefined): string | null {
  if (!search) return null;
  try {
    const id = new URLSearchParams(search).get(CAMERA_SHARE_PARAM)?.trim();
    return id ? id : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a shared id against the loaded catalogue. Matching is exact on
 * the string form of the id — the same key the catalogue merge dedupes
 * on — so every source's ids resolve and a near-miss never opens the
 * wrong camera.
 */
export function findCameraById<T extends { id: string | number }>(
  cameras: readonly T[] | null | undefined,
  id: string | null | undefined,
): T | undefined {
  if (!cameras || !id) return undefined;
  const wanted = String(id);
  return cameras.find(cam => String(cam.id) === wanted);
}

/* ── Last-opened camera ────────────────────────────────────────────────
 * Remembered on this device whenever the viewer opens a camera, so a
 * visitor who leaves to check out can be offered their way straight
 * back afterwards (the /welcome completion loop links here). It is the
 * same deep link a share produces — no second mechanism, and the globe
 * resolves it through the same gated path: a stale id just lands on the
 * plain globe. Device-local only; nothing is sent anywhere. */

export const LAST_CAMERA_STORAGE_KEY = 'worldeye.lastCamera';

export interface LastCamera {
  id: string;
  name: string | null;
}

/** The slice of Web Storage this needs; injectable for tests. */
export interface KeyValueStore {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Record the camera the viewer just opened. Silent no-op when the
 *  camera carries no shareable id or storage is unavailable. */
export function rememberLastCamera(
  camera: ShareableCamera | null | undefined,
  store: KeyValueStore | null = defaultStore(),
): void {
  const id = cameraShareId(camera);
  if (!id || !store) return;
  try {
    const name = camera?.name?.trim() ? camera.name.trim() : null;
    store.setItem(LAST_CAMERA_STORAGE_KEY, JSON.stringify({ id, name }));
  } catch {
    /* storage full/blocked — the way back is a nicety, never an error */
  }
}

/** Read the remembered camera back; any corruption reads as "none". */
export function readLastCamera(
  store: KeyValueStore | null = defaultStore(),
): LastCamera | null {
  if (!store) return null;
  try {
    const raw = store.getItem(LAST_CAMERA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown; name?: unknown };
    if (!parsed || typeof parsed.id !== 'string' || !parsed.id.trim()) return null;
    return {
      id: parsed.id.trim(),
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : null,
    };
  } catch {
    return null;
  }
}

/** Where "back to your camera" points: the deep link, or the globe root
 *  when nothing is remembered. */
export function lastCameraHref(last: LastCamera | null): string {
  return last ? `/?${CAMERA_SHARE_PARAM}=${encodeURIComponent(last.id)}` : '/';
}

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'unavailable';

/** The slice of the platform the share action needs; injectable for tests. */
export interface ShareEnv {
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
  clipboardWrite?: (text: string) => Promise<void>;
  /** Pre-clipboard-API fallback (hidden textarea + execCommand). */
  legacyCopy?: (text: string) => boolean;
}

function defaultShareEnv(): ShareEnv {
  if (typeof navigator === 'undefined') return {};
  const env: ShareEnv = {};
  if (typeof navigator.share === 'function') {
    env.share = data => navigator.share(data);
  }
  if (typeof navigator.clipboard?.writeText === 'function') {
    env.clipboardWrite = text => navigator.clipboard.writeText(text);
  }
  if (typeof document !== 'undefined') {
    env.legacyCopy = text => {
      try {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(input);
        return ok;
      } catch {
        return false;
      }
    };
  }
  return env;
}

/**
 * Share a camera: the platform share sheet where one exists
 * (navigator.share), the clipboard everywhere else. A dismissed share
 * sheet is its own outcome — the visitor changed their mind, so the
 * link is NOT then copied behind their back. A share sheet that fails
 * for a real error falls through to the clipboard.
 */
export async function shareCamera(
  camera: ShareableCamera | null | undefined,
  env: ShareEnv = defaultShareEnv(),
  base?: string,
): Promise<ShareOutcome> {
  const url = buildCameraShareUrl(camera, base);
  if (!url) return 'unavailable';

  if (env.share) {
    try {
      await env.share({ title: cameraShareTitle(camera), text: cameraShareText(camera), url });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'dismissed';
      /* A genuine share failure falls through to the clipboard. */
    }
  }

  if (env.clipboardWrite) {
    try {
      await env.clipboardWrite(url);
      return 'copied';
    } catch {
      /* fall through to the legacy path */
    }
  }

  if (env.legacyCopy) {
    try {
      if (env.legacyCopy(url)) return 'copied';
    } catch {
      /* nothing left to try */
    }
  }

  return 'unavailable';
}
