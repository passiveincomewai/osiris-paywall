/**
 * Marketing Studio — Phase 2 Video Studio seed library.
 *
 * Eleven video templates (MarketingTemplate rows with kind: "video").
 * Personalization is browser-side (see VideoStudioClient): the hook text
 * is burned into the first 5 seconds and a personalized end card (CTA,
 * referral link, QR, discount code when one really exists) is appended.
 * The server only stores the template rows — no video files are rendered
 * or stored server-side.
 *
 * Honesty rules (same as templates-seed):
 *  - Every row points at REAL footage that exists in public/ today.
 *  - `sourceNote` states what the footage actually is. Where a scripted
 *    concept has no dedicated shoot, the footage is the globe cinematic
 *    and sourceNote says exactly that — no fake claims about what was
 *    filmed.
 *  - Hooks/scripts describe verified product facts only (76,000+ live
 *    cameras in 105 countries, recording, Pro OSINT/AI/satellite).
 *
 * Layers shape for video rows: the `layers` Json column stores a single
 * object (NOT the TemplateLayer[] array image templates use):
 *   { videoMeta: { durationSec, hook, script, cta, sourceNote, vertical } }
 * Readers must branch on kind === "video" before touching `layers`.
 *
 * Seeding mirrors templates-seed: idempotent, slug-keyed upserts that
 * refresh design fields but never overwrite an admin's `active` /
 * `featured` flags on existing rows.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { EditableField } from "./types";

export interface VideoMeta {
  durationSec: number;
  hook: string;
  script: string;
  cta: string;
  sourceNote: string;
  vertical: boolean;
}

export interface SeedVideo {
  slug: string;
  title: string;
  category: string;
  width: number;
  height: number;
  assetUrl: string;
  previewUrl: string;
  featured: boolean;
  sortOrder: number;
  meta: VideoMeta;
}

const CINEMATIC = "/worldeye-cinematic.mp4";
const CINEMATIC_POSTER = "/worldeye-cinematic-poster.jpg";
const GLOBE_CINEMATIC_NOTE =
  "Globe cinematic footage (public/worldeye-cinematic.mp4, the landing-page hero). No dedicated shoot exists for this script — the concept is framed over the globe cinematic, and the script copy must not claim otherwise.";

/* ------------------------------------------------------------------ */
/* Seed rows — the ten §8 scripted templates + the weather reel        */
/* ------------------------------------------------------------------ */

export const SEED_VIDEOS: SeedVideo[] = [
  {
    slug: "video-i-found-this-website",
    title: "Video — I Found This Website",
    category: "reel",
    width: 1080,
    height: 1920,
    assetUrl: "/studio-videos/worldeye-viral-reel.mp4",
    previewUrl: "/studio-videos/posters/worldeye-viral-reel.jpg",
    featured: true,
    sortOrder: 101,
    meta: {
      durationSec: 12,
      hook: "I just discovered a website that lets you explore cameras around the world.",
      script:
        "Discovery angle: the hook overlay runs over the opening seconds, then the reel tours the live globe and its camera feeds. Close on the personalized end card with your link.",
      cta: "Explore it through my link.",
      sourceNote:
        "Real worldeye.app footage — the delivered viral reel (live globe + camera exploration, recorded from the actual site).",
      vertical: true,
    },
  },
  {
    slug: "video-stop-using-multiple-camera-apps",
    title: "Video — Stop Using Multiple Camera Apps",
    category: "feature",
    width: 1920,
    height: 1080,
    assetUrl: CINEMATIC,
    previewUrl: CINEMATIC_POSTER,
    featured: false,
    sortOrder: 102,
    meta: {
      durationSec: 10,
      hook: "Still switching between apps just to check your cameras?",
      script:
        "Pain-point angle: name the app-switching frustration in the hook, then let the globe cinematic carry the answer — WorldEye puts 76,000+ live cameras, flights and weather on one map instead of a folder of single-purpose apps.",
      cta: "Try WorldEye.",
      sourceNote: GLOBE_CINEMATIC_NOTE,
      vertical: false,
    },
  },
  {
    slug: "video-your-cameras-one-dashboard",
    title: "Video — Your Cameras, One Dashboard",
    category: "feature",
    width: 1920,
    height: 1080,
    assetUrl: CINEMATIC,
    previewUrl: CINEMATIC_POSTER,
    featured: false,
    sortOrder: 103,
    meta: {
      durationSec: 10,
      hook: "What if all your cameras were in one place?",
      script:
        "One-dashboard angle: the hook poses the question while the cinematic globe spins up; the end card answers it — one live map with every camera feed on it.",
      cta: "Start with WorldEye.",
      sourceNote: GLOBE_CINEMATIC_NOTE,
      vertical: false,
    },
  },
  {
    slug: "video-a-better-way-to-monitor",
    title: "Video — A Better Way to Monitor",
    category: "reel",
    width: 1080,
    height: 1920,
    assetUrl: "/studio-videos/reel_36k-eyes-final.mp4",
    previewUrl: "/studio-videos/posters/reel_36k-eyes-final.jpg",
    featured: false,
    sortOrder: 104,
    meta: {
      durationSec: 12,
      hook: "Here's a different way to manage your camera feeds.",
      script:
        "Monitoring angle: hook over the opening shot, then the reel's wall of live camera feeds makes the case — many feeds, one place, no app-hopping.",
      cta: "Try WorldEye.",
      sourceNote:
        "Real worldeye.app footage — the '36k eyes' reel: the live globe and a wall of real camera feeds from the actual platform.",
      vertical: true,
    },
  },
  {
    slug: "video-worldeye-premium",
    title: "Video — WorldEye Premium",
    category: "reel",
    width: 1080,
    height: 1920,
    assetUrl: "/studio-videos/worldeye-ad-30s.mp4",
    previewUrl: "/studio-videos/posters/worldeye-ad-30s.jpg",
    featured: true,
    sortOrder: 105,
    meta: {
      durationSec: 30,
      hook: "Here's what you can unlock with WorldEye Premium.",
      script:
        "Premium angle: the full 30-second ad — the free live globe first, then what Pro unlocks: the OSINT toolkit, AI analyst briefs, satellite map view and camera recording. End card carries your link (and your discount code if you have one).",
      cta: "Go Premium.",
      sourceNote:
        "Real worldeye.app footage — the delivered 30-second cinematic ad, recorded from the actual site (no fictional interfaces).",
      vertical: true,
    },
  },
  {
    slug: "video-global-camera-exploration",
    title: "Video — Global Camera Exploration",
    category: "reel",
    width: 1080,
    height: 1920,
    assetUrl: "/studio-videos/reel_36k-eyes-final.mp4",
    previewUrl: "/studio-videos/posters/reel_36k-eyes-final.jpg",
    featured: false,
    sortOrder: 106,
    meta: {
      durationSec: 12,
      hook: "Explore the world through this interactive camera platform.",
      script:
        "Exploration angle: hook first, then the reel sweeps across live feeds from around the planet — cities, coasts and landmarks streaming in real time.",
      cta: "Explore WorldEye.",
      sourceNote:
        "Real worldeye.app footage — the '36k eyes' reel: the live globe and a wall of real camera feeds from the actual platform.",
      vertical: true,
    },
  },
  {
    slug: "video-affiliate-discount",
    title: "Video — Affiliate Discount",
    category: "reel",
    width: 1080,
    height: 1920,
    assetUrl: "/studio-videos/worldeye-ad-15s-hook.mp4",
    previewUrl: "/studio-videos/posters/worldeye-ad-15s-hook.jpg",
    featured: false,
    sortOrder: 107,
    meta: {
      durationSec: 15.07,
      hook: "Want to try WorldEye? Here's my link.",
      script:
        "Direct-offer angle: the fast 15-second hook cut, then your personalized end card. The end card carries your real discount code and % off ONLY when you actually have one — when you don't, it shows just your link and QR, and this template makes no discount claim.",
      cta: "Use my link.",
      sourceNote:
        "Real worldeye.app footage — the delivered 15-second hook ad recorded from the actual site. Discount copy comes solely from the affiliate's own verified code on the end card.",
      vertical: true,
    },
  },
  {
    slug: "video-how-worldeye-works",
    title: "Video — How WorldEye Works",
    category: "reel",
    width: 1080,
    height: 1920,
    assetUrl: "/studio-videos/worldeye-ad-15s-hook.mp4",
    previewUrl: "/studio-videos/posters/worldeye-ad-15s-hook.jpg",
    featured: false,
    sortOrder: 108,
    meta: {
      durationSec: 15.07,
      hook: "Here's how to get started with WorldEye in seconds.",
      script:
        "Getting-started angle: the 15-second cut shows the globe opening and a camera feed loading — no signup needed to explore the free map, which is the whole pitch: open the link, you're looking at the live world.",
      cta: "Try it free.",
      sourceNote:
        "Real worldeye.app footage — the delivered 15-second hook ad recorded from the actual site.",
      vertical: true,
    },
  },
  {
    slug: "video-multi-camera-recording",
    title: "Video — Multi-Camera Recording",
    category: "feature",
    width: 1920,
    height: 1080,
    assetUrl: CINEMATIC,
    previewUrl: CINEMATIC_POSTER,
    featured: false,
    sortOrder: 109,
    meta: {
      durationSec: 10,
      hook: "Need to manage recordings from multiple cameras?",
      script:
        "Recording angle: WorldEye's recording dashboard is real — press record on any live camera and the moment is saved as a clip, across as many feeds as you watch. The script copy describes that dashboard; the visuals are the globe cinematic (see sourceNote), so don't narrate specific UI steps as if they were on screen.",
      cta: "Start recording.",
      sourceNote: GLOBE_CINEMATIC_NOTE,
      vertical: false,
    },
  },
  {
    slug: "video-the-tech-discovery",
    title: "Video — The Tech Discovery",
    category: "reel",
    width: 1080,
    height: 1920,
    assetUrl: "/studio-videos/worldeye-viral-reel.mp4",
    previewUrl: "/studio-videos/posters/worldeye-viral-reel.jpg",
    featured: false,
    sortOrder: 110,
    meta: {
      durationSec: 12,
      hook: "This is one of the most interesting camera platforms I've tried.",
      script:
        "CAVEAT (from the template spec): use this hook ONLY when genuinely sharing your own experience with the platform — it is a first-person endorsement and must be true for you. If it isn't, use the neutral alternate hook instead: “Here's a camera platform worth a look.” The reel itself is the discovery tour: live globe, real camera feeds, your end card at the close.",
      cta: "See it for yourself.",
      sourceNote:
        "Real worldeye.app footage — the delivered viral reel (live globe + camera exploration, recorded from the actual site).",
      vertical: true,
    },
  },
  {
    slug: "video-weather-tracker",
    title: "Video — Weather Tracker",
    category: "feature",
    width: 1080,
    height: 1920,
    assetUrl: "/studio-videos/reel_weather-app-final.mp4",
    previewUrl: "/studio-videos/posters/reel_weather-app-final.jpg",
    featured: false,
    sortOrder: 111,
    meta: {
      durationSec: 12,
      hook: "Track storms and weather live, anywhere on Earth.",
      script:
        "Weather angle: hook over the opening, then the reel shows WorldEye's live weather layer — radar and storm systems moving over the globe in real time, alongside the camera network.",
      cta: "Track the weather.",
      sourceNote:
        "Real worldeye.app footage — the delivered weather reel showing the platform's live weather/radar layer on the actual site.",
      vertical: true,
    },
  },
];

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

function editableFieldsFor(meta: VideoMeta): EditableField[] {
  return [
    { key: "hook", label: "Hook overlay text", type: "text", maxLen: 90, default: meta.hook },
  ];
}

/**
 * Idempotent upsert of every seed video, keyed by slug.
 * Returns the number of videos processed.
 *
 * On update only the design fields are refreshed (title, format,
 * dimensions, asset/preview URLs, editableFields, layers, tags,
 * sortOrder) — an admin's `active` / `featured` flags and scheduling
 * are never overwritten.
 */
export async function seedStudioVideos(): Promise<number> {
  let count = 0;
  for (const v of SEED_VIDEOS) {
    // layers is a Json column; for video rows it stores { videoMeta }
    // (documented in the module header) rather than a TemplateLayer[].
    const layers = { videoMeta: v.meta } as unknown as Prisma.InputJsonValue;
    const design = {
      title: v.title,
      format: "mp4",
      width: v.width,
      height: v.height,
      svgBody: null,
      assetUrl: v.assetUrl,
      previewUrl: v.previewUrl,
      editableFields: editableFieldsFor(v.meta) as unknown as Prisma.InputJsonValue,
      layers,
      tags: ["video", v.category],
      sortOrder: v.sortOrder,
    };
    await db.marketingTemplate.upsert({
      where: { slug: v.slug },
      create: {
        slug: v.slug,
        category: v.category,
        kind: "video",
        carouselGroup: null,
        slideIndex: null,
        featured: v.featured,
        ...design,
      },
      update: design,
    });
    count++;
  }
  return count;
}

let seedAttempted = false;

/**
 * Seed the video library once per process (module-level once-guard).
 * seedStudioVideos() itself is idempotent, so a fresh process re-running
 * it is safe; the guard just avoids repeating eleven upserts per request.
 */
export async function ensureStudioVideos(): Promise<void> {
  if (seedAttempted) return;
  seedAttempted = true;
  await seedStudioVideos();
}
