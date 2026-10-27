/**
 * WorldEye Ambient — catalogue access for the feed + relay APIs.
 *
 * Adapted from the staged WorldEye TV build (#28, ~/workspace/
 * worldeye-tv-mode's /api/tv-scenes route), which solved the same
 * problem for the same reason: on Vercel, the /api/cctv payload lives
 * in THAT function's memory and the on-disk snapshot is never
 * deployed, so a route that needs the camera catalogue must resolve
 * it from, in order —
 *
 *   1. the in-memory payload the /api/cctv route builds;
 *   2. the snapshot saved on disk;
 *   3. the in-repo fast-lane records;
 *   4. a catalogue built inside this process (cold path, bounded).
 *
 * …merging with the showcase's precedence (live payload over snapshot
 * over in-repo records). Ambient needs the whole catalogue (mood
 * filtering scans it), so this returns every camera, not a by-id map.
 */
import { getPayload, readSnapshot } from "@/lib/cctv-snapshot";
import { buildCatalogueHere } from "@/lib/vision/catalogue-build";

export interface CatalogueCamera {
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

async function fromPayload(): Promise<CatalogueCamera[] | null> {
  const payload = getPayload();
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload.json.toString("utf8")) as {
      cameras?: CatalogueCamera[];
    };
    if (Array.isArray(parsed.cameras)) return parsed.cameras;
  } catch {
    /* fall through */
  }
  return null;
}

async function fromSnapshot(): Promise<CatalogueCamera[] | null> {
  try {
    const snap = await readSnapshot();
    if (snap) {
      const out: CatalogueCamera[] = [];
      for (const list of Object.values(snap.regions)) {
        for (const cam of list as unknown as CatalogueCamera[]) out.push(cam);
      }
      return out;
    }
  } catch {
    /* no snapshot available */
  }
  return null;
}

let fastlaneModule: Promise<typeof import("@/lib/vision/catalogue-fastlane")> | null = null;

function fastlaneImport() {
  fastlaneModule ??= import("@/lib/vision/catalogue-fastlane");
  return fastlaneModule;
}

async function fromFastlane(): Promise<CatalogueCamera[] | null> {
  try {
    const records = await (await fastlaneImport()).fastlaneStatics();
    if (!records.length) return null;
    const out = (records as unknown as CatalogueCamera[]).filter(
      (c) => c && typeof c.id === "string" && c.id,
    );
    return out.length ? out : null;
  } catch {
    return null;
  }
}

/** `over` wins per id over `under` — the showcase's merge rule. */
function mergeUnder(
  under: CatalogueCamera[] | null,
  over: CatalogueCamera[] | null,
): CatalogueCamera[] | null {
  if (!under) return over;
  if (!over) return under;
  const merged = new Map(under.map((c) => [c.id, c]));
  for (const cam of over) merged.set(cam.id, cam);
  return [...merged.values()];
}

const CHASE_MS = 40_000;
const REBUILD_MS = 60_000;

let lastBuildAt = 0;
let builtHere = false;

async function buildHere(): Promise<void> {
  if (Date.now() - lastBuildAt < REBUILD_MS) return;
  lastBuildAt = Date.now();
  try {
    await buildCatalogueHere();
    builtHere = true;
  } catch (error) {
    console.warn("[OSIRIS] Ambient could not build the camera catalogue:", error);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function buildColdCatalogue(): Promise<CatalogueCamera[] | null> {
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

/** Every catalogue camera this process can resolve, deduped by id. */
export async function loadCatalogue(): Promise<CatalogueCamera[]> {
  let payload = getPayload();
  if (payload && !payload.complete && builtHere) {
    await buildHere();
    payload = getPayload();
  }
  if (payload?.complete) {
    const list = await fromPayload();
    if (list) return list;
  }
  const snap = await fromSnapshot();
  if (snap) {
    return mergeUnder(await fromFastlane(), mergeUnder(snap, await fromPayload())) ?? [];
  }
  if (!payload) return (await buildColdCatalogue()) ?? [];
  return mergeUnder(await fromFastlane(), await fromPayload()) ?? [];
}
