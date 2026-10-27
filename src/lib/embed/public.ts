/**
 * Public single-camera embed — the free partner/blog door.
 *
 * ELIGIBILITY RULE (the whole point of this module): a camera may be
 * embedded publicly only when the enterprise rights registry
 * (src/lib/enterprise/rights.ts) clears its SOURCE for redistribution
 * — the exact verdict that gates the paid feed. On top of the rights
 * verdict, the camera must have something playable (a live stream or a
 * snapshot the frame route serves). Everything else — Windy, YouTube
 * broadcasts, commercial aggregators, conditional/unreviewed sources —
 * is out, by the registry's default-exclude design. When in doubt, a
 * camera is NOT embeddable.
 *
 * What the free embed deliberately is NOT: it carries one camera, the
 * agency attribution and WorldEye branding on every render. It is not
 * the Enterprise product — no collections, no multi-camera walls, no
 * data feed, no API keys, and it is never white-label.
 */
import { enterpriseCatalogueById } from "@/lib/enterprise/catalogue";
import {
  toFeedCamera,
  type CatalogueRecord,
  type FeedCamera,
} from "@/lib/enterprise/payload";
import { feedEligibility } from "@/lib/enterprise/rights";

/* The pure snippet/URL helpers live in ./snippet (client-safe); they
 * are re-exported here so server surfaces have one import home. */
export {
  buildEmbedSnippet,
  embedSizePreset,
  publicEmbedUrl,
  watchOnWorldEyeUrl,
  DEFAULT_EMBED_SIZE,
  EMBED_SIZE_PRESETS,
  type EmbedSizePreset,
} from "./snippet";

export interface PublicEmbedCamera extends FeedCamera {
  /** The registry basis the eligibility verdict rests on. */
  basis: string;
}

const CACHE_MS = 5 * 60_000;
let eligibleCache: { at: number; list: PublicEmbedCamera[] } | null = null;

/**
 * The single-camera resolution every public-embed surface shares: the
 * registry verdict first, then the playable check. Exported for tests —
 * this function IS the eligibility rule, so it is tested directly.
 */
export function toPublicEmbedCamera(
  raw: CatalogueRecord,
  origin: string,
): PublicEmbedCamera | null {
  const verdict = feedEligibility(raw);
  if (!verdict.eligible) return null;
  const cam = toFeedCamera(raw, origin);
  if (!cam.streamUrl && !cam.snapshotUrl) return null;
  return { ...cam, basis: verdict.basis };
}

/**
 * Every currently embeddable camera. The catalogue map is already
 * cached in-process by lib/enterprise/catalogue; the filtered list is
 * cached here on the same cadence. `origin` only shapes snapshot URLs
 * (they point back at this deployment's frame route).
 */
export async function publicEmbedCameras(
  origin: string,
): Promise<PublicEmbedCamera[] | null> {
  if (eligibleCache && Date.now() - eligibleCache.at < CACHE_MS) {
    return eligibleCache.list;
  }
  const byId = await enterpriseCatalogueById();
  if (!byId) return null;
  const list: PublicEmbedCamera[] = [];
  for (const raw of byId.values()) {
    const cam = toPublicEmbedCamera(raw, origin);
    if (cam) list.push(cam);
  }
  list.sort((a, b) =>
    `${a.country} ${a.city} ${a.name}`.localeCompare(
      `${b.country} ${b.city} ${b.name}`,
    ),
  );
  eligibleCache = { at: Date.now(), list };
  return list;
}

/** One camera's public-embed view, or null when it isn't embeddable. */
export async function publicEmbedCamera(
  id: string,
  origin: string,
): Promise<PublicEmbedCamera | null> {
  const byId = await enterpriseCatalogueById();
  if (!byId) return null;
  const raw = byId.get(id);
  if (!raw) return null;
  return toPublicEmbedCamera(raw, origin);
}

export interface EmbedSourceSummary {
  source: string;
  upstream: string;
  count: number;
}

/** Source breakdown of the embeddable set, biggest first. */
export function embedSourceSummaries(
  cameras: PublicEmbedCamera[],
): EmbedSourceSummary[] {
  const bySource = new Map<string, EmbedSourceSummary>();
  for (const cam of cameras) {
    const existing = bySource.get(cam.source);
    if (existing) {
      existing.count += 1;
    } else {
      bySource.set(cam.source, {
        source: cam.source,
        upstream: cam.attribution.replace(/ via WorldEye$/, ""),
        count: 1,
      });
    }
  }
  return [...bySource.values()].sort((a, b) => b.count - a.count);
}

/** Free-text + source filtering for the picker. */
export function filterEmbedCameras(
  cameras: PublicEmbedCamera[],
  q: string,
  source: string,
): PublicEmbedCamera[] {
  const needle = q.trim().toLowerCase();
  return cameras.filter((cam) => {
    if (source && cam.source !== source) return false;
    if (!needle) return true;
    return `${cam.name} ${cam.city} ${cam.country} ${cam.source}`
      .toLowerCase()
      .includes(needle);
  });
}
