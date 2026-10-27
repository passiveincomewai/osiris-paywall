/**
 * WorldEye Ambient — feed selection (pure core).
 *
 * Turns catalogue cameras into one mood's shuffled playlist: mood
 * filter (lib/ambient/moods) → playable-media filter
 * (lib/camera-preview's previewMedia — the exact resolver the map
 * tiles and the viewer use, so a feed camera is a camera the web
 * player can actually play) → dedupe → video-first sampling.
 *
 * Sampling prefers true video (hls/mp4/mjpeg) over jpg snapshots:
 * Slow TV is motion first. Snapshots fill only when a mood's video
 * pool runs short. Randomness is injected (`rng`) so tests pin the
 * selection; the route passes Math.random, reshuffled per call.
 */
import { previewMedia, type PreviewKind } from "@/lib/camera-preview";
import {
  cameraMatchesMood,
  preferUrbanNight,
  type MoodCamera,
  type MoodContext,
  type MoodSlug,
} from "./moods";

export interface AmbientFeedCamera extends MoodCamera {
  id: string;
  /** The stream fields lib/camera-preview resolves (catalogue shape). */
  feed_url?: string;
  stream_url?: string;
  stream_type?: string;
}

export interface AmbientScene {
  id: string;
  name: string;
  city: string;
  country: string;
  /** The resolved playable media — the URL the client player loads
   *  DIRECTLY from the source (no WorldEye bandwidth in between). */
  media: { kind: PreviewKind; url: string };
  /** Spec-shaped mirrors of media, for API consumers. */
  streamUrl: string;
  streamType: PreviewKind;
}

const KIND_RANK: Record<PreviewKind, number> = {
  hls: 0,
  mp4: 1,
  mjpeg: 2,
  jpg: 3,
};

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function selectAmbientScenes(input: {
  cameras: readonly AmbientFeedCamera[];
  mood: MoodSlug;
  count: number;
  ctx?: MoodContext;
  rng?: () => number;
  /** Relay mode: only stream kinds ffmpeg can pull (no jpg stills). */
  videoOnly?: boolean;
}): AmbientScene[] {
  const rng = input.rng ?? Math.random;
  const ctx = input.ctx ?? {};
  const seen = new Set<string>();
  let pool: AmbientFeedCamera[] = [];

  for (const cam of input.cameras) {
    if (!cam.id || seen.has(cam.id)) continue;
    if (!cameraMatchesMood(cam, input.mood, ctx)) continue;
    seen.add(cam.id);
    pool.push(cam);
  }

  if (input.mood === "night-views") {
    pool = preferUrbanNight(pool, input.count);
  }

  const playable: AmbientScene[] = [];
  for (const cam of pool) {
    const media = previewMedia(cam);
    if (!media) continue;
    if (input.videoOnly && media.kind === "jpg") continue;
    playable.push({
      id: cam.id,
      name: cam.name ?? cam.id,
      city: cam.city ?? "",
      country: cam.country ?? "",
      media,
      streamUrl: media.url,
      streamType: media.kind,
    });
  }

  // Video first, shuffled within each kind band.
  const byKind = new Map<PreviewKind, AmbientScene[]>();
  for (const s of playable) {
    const list = byKind.get(s.media.kind) ?? [];
    list.push(s);
    byKind.set(s.media.kind, list);
  }
  const ordered: AmbientScene[] = [];
  for (const kind of (Object.keys(KIND_RANK) as PreviewKind[]).sort(
    (a, b) => KIND_RANK[a] - KIND_RANK[b],
  )) {
    const list = byKind.get(kind);
    if (list) ordered.push(...shuffle(list, rng));
  }
  return ordered.slice(0, Math.max(0, input.count));
}
