/**
 * Live Wall demo — camera selection.
 *
 * The premium Live Wall (/recording/live) is gated to Pro, so visitors who
 * haven't upgraded used to see only an upgrade screen. The demo shows them
 * the real thing in miniature: a small wall of REAL catalogue cameras,
 * streaming live, view-only. This module is the selection logic, kept out
 * of the route and the component so the rules are testable without a
 * network or a DOM.
 *
 * Honesty rules, enforced here:
 *  - Only cameras the site's own preview machinery can play as video
 *    (HLS / MP4 via lib/camera-preview) are eligible. Snapshot feeds,
 *    YouTube embeds and external-page cameras never enter the demo —
 *    a wall of stills or iframes would not be the premium feature.
 *  - Nothing is minted: every pick is a catalogue record, resolved by
 *    the route against the same catalogue the globe serves. A pick that
 *    has rotated out of the catalogue is dropped, never faked.
 *  - Preferred picks are the catalogue's static in-repo HLS sets (the
 *    Polish Baltic coast and the North Macedonia border crossings):
 *    they ride the catalogue fast lane, so they exist in every build,
 *    and their operators publish stable playlist URLs. Everything else
 *    is a top-up from whatever HLS/MP4 cameras the live catalogue holds,
 *    one per source first so the wall doesn't fill with a single DOT.
 */
import { previewMedia, VIDEO_KINDS, type PreviewSource } from "@/lib/camera-preview";

/** The catalogue fields the demo reads. Same shape as the showcase route's. */
export interface DemoCatalogCamera extends PreviewSource {
  id: string;
  name?: string;
  city?: string;
  country?: string;
  source?: string;
  external_url?: string;
}

/** A demo wall tile, in the exact shape RecordableTile consumes. */
export interface DemoWallCamera {
  id: string;
  name: string;
  group: string;
  cameraData: DemoCatalogCamera;
}

/** Six live tiles: enough to read as a wall, few enough for a phone. */
export const LIVE_WALL_DEMO_LIMIT = 6;

/**
 * Curated first picks, in display order — real catalogue IDs from the
 * static in-repo HLS sets (src/app/api/cctv/poland.ts, macedonia.ts,
 * bulgaria.ts). More are listed than the wall holds so a rotated-out or
 * unplayable pick degrades the list instead of shrinking the wall.
 */
export const LIVE_WALL_DEMO_PREFERRED_IDS: readonly string[] = [
  "pl-nadm-3", // Gdańsk — Stare Miasto, Motława riverfront
  "pl-nadm-32", // Sopot — Molo pier
  "pl-nadm-2", // Gdynia — Orłowo beach
  "mk-tabanovce", // Tabanovce — Preševo border crossing
  "pl-nadm-12", // Gdańsk — Teatr Szekspirowski
  "bg-burgas-center", // Burgas — city center
  "pl-nadm-13", // Gdynia — yacht marina
  "mk-deve-bair", // Deve Bair — Gyueshevo border crossing
  "pl-nadm-27", // Puck — marina & pier
];

/** True when the record is a video stream the wall tile can actually play. */
export function isDemoPlayable(cam: DemoCatalogCamera): boolean {
  // A YouTube/external embed is not a stream, whatever the record claims —
  // the same exclusion RecordableTile applies before offering a tile.
  if (/youtube\.com|youtu\.be/.test(cam.external_url ?? "") || /youtube\.com|youtu\.be/.test(cam.stream_url ?? "")) {
    return false;
  }
  const media = previewMedia(cam);
  return media !== null && VIDEO_KINDS.has(media.kind);
}

function toWallCamera(cam: DemoCatalogCamera): DemoWallCamera {
  const place = [cam.city, cam.country].filter(Boolean).join(", ");
  return {
    id: cam.id,
    name: cam.name ?? cam.id,
    group: place || "Live demo",
    cameraData: cam,
  };
}

/**
 * Pick the demo wall from a catalogue: preferred IDs first (in curated
 * order), then a top-up over the rest of the catalogue — one camera per
 * source until the wall is full or sources run out, then any remaining
 * playable cameras in catalogue order. Deterministic for a given input.
 */
export function selectLiveWallDemoCameras(
  catalogue: Iterable<DemoCatalogCamera>,
  limit: number = LIVE_WALL_DEMO_LIMIT,
): DemoWallCamera[] {
  const all = [...catalogue];
  const byId = new Map(all.map((c) => [c.id, c]));
  const picked: DemoCatalogCamera[] = [];
  const used = new Set<string>();

  for (const id of LIVE_WALL_DEMO_PREFERRED_IDS) {
    if (picked.length >= limit) break;
    const cam = byId.get(id);
    if (cam && !used.has(cam.id) && isDemoPlayable(cam)) {
      picked.push(cam);
      used.add(cam.id);
    }
  }

  if (picked.length < limit) {
    const playable = all.filter((c) => !used.has(c.id) && isDemoPlayable(c));
    const seenSources = new Set(picked.map((c) => c.source ?? ""));
    for (const cam of playable) {
      if (picked.length >= limit) break;
      const src = cam.source ?? "";
      if (seenSources.has(src)) continue;
      seenSources.add(src);
      picked.push(cam);
      used.add(cam.id);
    }
    for (const cam of playable) {
      if (picked.length >= limit) break;
      if (used.has(cam.id)) continue;
      picked.push(cam);
      used.add(cam.id);
    }
  }

  return picked.map(toWallCamera);
}
