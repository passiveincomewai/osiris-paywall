import { NextResponse } from "next/server";
import { getPayload, readSnapshot } from "@/lib/cctv-snapshot";
import { previewMedia } from "@/lib/camera-preview";
import { landingCategory } from "@/lib/landing-cameras";
import { buildCatalogueHere } from "@/lib/vision/catalogue-build";

/**
 * Read-only showcase feed for the homepage camera gallery.
 *
 * Resolves the curated manifest (src/lib/landing-cameras.ts) against the
 * camera catalogue — no second catalogue, no catalogue of its own. Only
 * cameras whose media the app's own preview machinery can actually play
 * (lib/camera-preview) are returned, with the resolved media URL, so the
 * gallery never renders a card it cannot show. Cameras that have rotated
 * out of the catalogue are dropped silently; the gallery's own in-session
 * load check is the final word on the LIVE badge.
 *
 * Where the catalogue comes from, in order — the same sources, in the
 * same order, as the vision frame catalogue (lib/vision/frames):
 *
 *   1. the in-memory payload the /api/cctv route builds;
 *   2. the snapshot saved on disk;
 *   3. a catalogue built inside this process.
 *
 * The third source exists because on Vercel the first two are absent in
 * this function's instance, permanently: the payload lives in the
 * /api/cctv function's memory, not this one's, and the snapshot is
 * git-ignored and never deployed. Reading only those two, this route
 * answered an empty gallery for every visitor. The catalogue is
 * assembled from loaders in this repo, so an instance that holds nothing
 * builds it here, exactly as the frame route does — and the in-repo
 * loaders (the fast lane) ride underneath the built payload, whose own
 * record wins wherever both hold the same camera.
 */

/* A cold build waits, bounded, for the catalogue to finish filling (see
   buildColdCatalogue); the frame route gives its own wait the same
   maxDuration for the same reason. */
export const maxDuration = 60;

interface CatalogueCamera {
  id: string;
  name?: string;
  city?: string;
  country?: string;
  source?: string;
  lat?: number;
  lng?: number;
  feed_url?: string;
  stream_url?: string;
  stream_type?: string;
  external_url?: string;
  preview_url?: string;
}

async function fromPayload(): Promise<Map<string, CatalogueCamera> | null> {
  const payload = getPayload();
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload.json.toString("utf8")) as {
      cameras?: CatalogueCamera[];
    };
    if (Array.isArray(parsed.cameras)) {
      return new Map(parsed.cameras.map((c) => [c.id, c]));
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function fromSnapshot(): Promise<Map<string, CatalogueCamera> | null> {
  try {
    const snap = await readSnapshot();
    if (snap) {
      const map = new Map<string, CatalogueCamera>();
      for (const list of Object.values(snap.regions)) {
        for (const cam of list as unknown as CatalogueCamera[]) map.set(cam.id, cam);
      }
      return map;
    }
  } catch {
    /* no snapshot available */
  }
  return null;
}

let fastlaneModule: Promise<typeof import("@/lib/vision/catalogue-fastlane")> | null = null;

/** The fast lane (lib/vision/catalogue-fastlane), imported on demand, as
 *  in frames: its module graph is the in-repo catalogue data, which only
 *  a process resolving cameras from it should have to load. */
function fastlaneImport() {
  fastlaneModule ??= import("@/lib/vision/catalogue-fastlane");
  return fastlaneModule;
}

/** The in-repo loaders' records, indexed by id — the catalogue's fast lane. */
async function fromFastlane(): Promise<Map<string, CatalogueCamera> | null> {
  try {
    const records = await (await fastlaneImport()).fastlaneStatics();
    if (!records.length) return null;
    const map = new Map<string, CatalogueCamera>();
    for (const cam of records as unknown as CatalogueCamera[]) {
      if (cam && typeof cam.id === "string" && cam.id) map.set(cam.id, cam);
    }
    return map.size ? map : null;
  } catch {
    return null;
  }
}

/** `over` wins per id over `under` — frames' merge rule for the same pair. */
function mergeUnder(
  under: Map<string, CatalogueCamera> | null,
  over: Map<string, CatalogueCamera> | null,
): Map<string, CatalogueCamera> | null {
  if (!under) return over;
  if (!over) return under;
  const merged = new Map(under);
  for (const [id, cam] of over) merged.set(id, cam);
  return merged;
}

/** How long a cold instance's first read may wait for the build it
 *  triggered to finish filling (see buildColdCatalogue). */
const CHASE_MS = 40_000;
const REBUILD_MS = 60_000;

let lastBuildAt = 0;
/** True once this process has built the catalogue itself (see below). */
let builtHere = false;

/**
 * Build the catalogue in this process, at most once a minute: a cold
 * instance pays for it once, and one whose build keeps failing is not
 * retried on every request.
 */
async function buildHere(): Promise<void> {
  if (Date.now() - lastBuildAt < REBUILD_MS) return;
  lastBuildAt = Date.now();
  try {
    await buildCatalogueHere();
    builtHere = true;
  } catch (error) {
    console.warn("[OSIRIS] Showcase could not build the camera catalogue:", error);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The cold path: no payload in memory, no snapshot on disk — the state
 * every showcase instance is in on Vercel. Build the catalogue here (the
 * build the vision code uses, via lib/vision/catalogue-build), waiting —
 * bounded — while it finishes filling: a cold build answers with
 * whatever regions landed inside its budget and lets the rest finish
 * behind it, and answering from that partial catalogue would report
 * curated cameras that exist as rotated out. The wait ends when the
 * catalogue is whole, when it stops growing (what is left is backed off
 * or hung, and this request should not wait on it), or at the deadline.
 * The in-repo loaders ride underneath whatever the build produced.
 */
async function buildColdCatalogue(): Promise<Map<string, CatalogueCamera> | null> {
  await buildHere();
  const deadline = Date.now() + CHASE_MS;
  let lastTotal = getPayload()?.total ?? -1;
  let stalls = 0;
  while (!getPayload()?.complete && Date.now() < deadline) {
    await sleep(1_500);
    try {
      await buildCatalogueHere();
    } catch {
      /* a failed fill leaves the partial catalogue in place */
    }
    const total = getPayload()?.total ?? -1;
    if (total !== lastTotal) {
      lastTotal = total;
      stalls = 0;
    } else if (++stalls >= 3) break;
  }
  if (getPayload()) builtHere = true;
  lastBuildAt = Date.now();
  return mergeUnder(await fromFastlane(), await fromPayload());
}

async function catalogueById(): Promise<Map<string, CatalogueCamera> | null> {
  let payload = getPayload();
  if (payload && !payload.complete && builtHere) {
    /* A catalogue this process built for itself may have started partial
       (regions still landing); advance the fill before reading again, so
       the late regions join this index instead of waiting for a rebuild
       nobody else will trigger in this process. */
    await buildHere();
    payload = getPayload();
  }
  // The in-memory payload is built progressively (regions land over the
  // first minutes after boot) and is only authoritative once complete —
  // before that, the on-disk snapshot is the fuller catalogue. Prefer:
  // complete payload → snapshot → built-here → partial payload.
  if (payload?.complete) {
    const map = await fromPayload();
    if (map) return map;
  }
  const snap = await fromSnapshot();
  if (snap) {
    /* The snapshot is not always a finished catalogue: a build this
       process is still running writes it region by region as they land,
       so mid-build it is partial in the same way the payload is — and
       the payload, which is that same build's live state, is fresher.
       Merge with the precedence used everywhere else (the live payload
       over the snapshot, the snapshot over the in-repo records) instead
       of letting a mid-build snapshot shadow both: read alone, it made
       the gallery shrink below what the cold read had just served
       until the build completed. */
    return mergeUnder(await fromFastlane(), mergeUnder(snap, await fromPayload()));
  }
  if (!payload) return buildColdCatalogue();
  // Partial payload: the in-repo records ride underneath it, as in frames.
  return mergeUnder(await fromFastlane(), await fromPayload());
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = landingCategory(url.searchParams.get("category"));
  const byId = await catalogueById();

  const cameras: Array<{
    id: string;
    name: string;
    city: string;
    country: string;
    source: string;
    media: { kind: string; url: string };
  }> = [];

  if (byId) {
    for (const id of category.cameraIds) {
      const cam = byId.get(id);
      if (!cam) continue;
      const media = previewMedia(cam);
      if (!media) continue;
      cameras.push({
        id: cam.id,
        name: cam.name ?? cam.id,
        city: cam.city ?? "",
        country: cam.country ?? "",
        source: cam.source ?? "",
        media,
      });
    }
  }

  return NextResponse.json(
    { category: category.slug, label: category.label, href: category.href, cameras },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
