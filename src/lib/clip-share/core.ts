// ── Public clip shares: core rules ───────────────────────────────────
// A clip lives in the owner's browser (IndexedDB) until they share it.
// Sharing uploads the file to Vercel Blob and creates a ClipShare row;
// the public watch page is /watch/<slug>. Everything in this file is
// pure (env is injectable) so the rules are pinned by unit tests.

import { randomBytes } from "crypto";
import { SHARE_PATH_PREFIX } from "./constants";

export { MAX_SHARE_FILE_BYTES, MAX_ACTIVE_SHARES_PER_USER, SHARE_PATH_PREFIX } from "./constants";

type EnvLike = Record<string, string | undefined>;

/**
 * Hosted sharing needs a Vercel Blob store. When the token is absent
 * the whole feature must say so honestly ("sharing isn't available
 * yet") — never mint a link that cannot work.
 */
export function shareStorageConfigured(env: EnvLike = process.env): boolean {
  return !!env.BLOB_READ_WRITE_TOKEN?.trim();
}

/** Unguessable public slug: 16 base64url chars ≈ 96 bits of entropy. */
export function generateShareSlug(): string {
  return randomBytes(12).toString("base64url");
}

export const SHARE_SLUG_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function isShareSlug(value: unknown): value is string {
  return typeof value === "string" && SHARE_SLUG_RE.test(value);
}

export { shareVideoPathname, sharePosterPathname, extForMime } from "./paths";

/**
 * Is this URL one of OUR hosted share files for THIS clip? The create
 * route only accepts blob-storage URLs under the clip's own prefix —
 * a user can never point a share at someone else's upload or an
 * arbitrary external video.
 */
export function isOwnShareBlobUrl(url: unknown, clipId: string): boolean {
  if (typeof url !== "string" || !url.startsWith("https://")) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!parsed.hostname.endsWith(".public.blob.vercel-storage.com")) return false;
  return parsed.pathname.startsWith(`/${SHARE_PATH_PREFIX}${clipId}/`);
}

/** Default share title from clip metadata (camera name + date). */
export function defaultShareTitle(cameraName: string, startedAt: Date): string {
  const when = startedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${cameraName} — ${when}`;
}

/** Catalogue id inside a SavedCamera.cameraData snapshot, if present. */
export function catalogueIdOf(cameraData: unknown): string | null {
  if (!cameraData || typeof cameraData !== "object") return null;
  const id = (cameraData as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}
