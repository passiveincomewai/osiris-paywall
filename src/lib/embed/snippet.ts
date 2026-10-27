/**
 * The pure, client-safe half of the public embed: URLs, size presets
 * and the copy-paste snippet builder. No catalogue or registry imports
 * live here, so client components (the snippet box, the player) can use
 * it without dragging server modules into the browser bundle. The
 * eligibility rule itself lives in lib/embed/public.
 */
import { PRODUCTION_APP_URL } from "@/lib/app-url";

/** The public player URL for one camera, on the production origin —
 *  snippets must point at production wherever they are generated. */
export function publicEmbedUrl(id: string): string {
  return `${PRODUCTION_APP_URL}/embed/camera/${encodeURIComponent(id)}`;
}

/** The "Watch on WorldEye" backlink target: the camera on the globe
 *  (the /?camera=<id> deep link lib/camera-share resolves). */
export function watchOnWorldEyeUrl(id: string): string {
  return `${PRODUCTION_APP_URL}/?camera=${encodeURIComponent(id)}`;
}

export interface EmbedSizePreset {
  id: string;
  label: string;
  /** Pixel width, or null for the responsive (100%) preset. */
  width: number | null;
  /** Pixel height, or null for the responsive (aspect-ratio) preset. */
  height: number | null;
}

export const EMBED_SIZE_PRESETS: EmbedSizePreset[] = [
  { id: "responsive", label: "Responsive — fills its container", width: null, height: null },
  { id: "large", label: "Large — 800 × 450", width: 800, height: 450 },
  { id: "medium", label: "Medium — 640 × 360", width: 640, height: 360 },
  { id: "small", label: "Small — 480 × 270", width: 480, height: 270 },
  { id: "compact", label: "Compact — 400 × 225", width: 400, height: 225 },
];

export const DEFAULT_EMBED_SIZE = "medium";

export function embedSizePreset(id: string | undefined): EmbedSizePreset {
  return (
    EMBED_SIZE_PRESETS.find((p) => p.id === id) ??
    EMBED_SIZE_PRESETS.find((p) => p.id === DEFAULT_EMBED_SIZE)!
  );
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * The copy-paste iframe snippet for one embeddable camera. Pure and
 * deterministic so the picker, the viewer panel and the tests all see
 * the identical string.
 */
export function buildEmbedSnippet(args: {
  embedUrl: string;
  name: string;
  sizeId?: string;
}): string {
  const preset = embedSizePreset(args.sizeId);
  const title = escapeAttr(`${args.name} — live camera via WorldEye`);
  if (preset.width === null || preset.height === null) {
    return `<iframe src="${args.embedUrl}" width="100%" style="border:0;max-width:100%;aspect-ratio:16/9" loading="lazy" allowfullscreen title="${title}"></iframe>`;
  }
  return `<iframe src="${args.embedUrl}" width="${preset.width}" height="${preset.height}" style="border:0;max-width:100%" loading="lazy" allowfullscreen title="${title}"></iframe>`;
}
