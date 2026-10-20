/**
 * Enterprise feed: resolve the full camera catalogue by id, in-process.
 *
 * Same sources, same precedence as the showcase route's catalogueById
 * (which solved this exact problem for the landing gallery):
 *   complete in-memory payload → on-disk snapshot → a catalogue built
 *   inside this process → partial payload, with the in-repo fast-lane
 *   records merged underneath. The resolved Map is cached briefly at
 *   module level: feed/API/dashboard reads repeat, and the catalogue
 *   itself only rebuilds on a minutes cadence.
 */
import { getPayload, readSnapshot } from "@/lib/cctv-snapshot";
import { buildCatalogueHere } from "@/lib/vision/catalogue-build";
import type { CatalogueRecord } from "./payload";

const CACHE_MS = 5 * 60_000;
/** How long a cold instance's first read may wait for its build to fill. */
const CHASE_MS = 40_000;
const REBUILD_MS = 60_000;

let cache: { at: number; map: Map<string, CatalogueRecord> } | null = null;
let lastBuildAt = 0;
let builtHere = false;

async function fromPayload(): Promise<Map<string, CatalogueRecord> | null> {
  const payload = getPayload();
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload.json.toString("utf8")) as {
      cameras?: CatalogueRecord[];
    };
    if (Array.isArray(parsed.cameras)) {
      return new Map(parsed.cameras.map((c) => [c.id, c]));
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function fromSnapshot(): Promise<Map<string, CatalogueRecord> | null> {
  try {
    const snap = await readSnapshot();
    if (snap) {
      const map = new Map<string, CatalogueRecord>();
      for (const list of Object.values(snap.regions)) {
        for (const cam of list as unknown as CatalogueRecord[]) map.set(cam.id, cam);
      }
      return map;
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

async function fromFastlane(): Promise<Map<string, CatalogueRecord> | null> {
  try {
    const records = await (await fastlaneImport()).fastlaneStatics();
    if (!records.length) return null;
    const map = new Map<string, CatalogueRecord>();
    for (const cam of records as unknown as CatalogueRecord[]) {
      if (cam && typeof cam.id === "string" && cam.id) map.set(cam.id, cam);
    }
    return map.size ? map : null;
  } catch {
    return null;
  }
}

/** `over` wins per id over `under`. */
function mergeUnder(
  under: Map<string, CatalogueRecord> | null,
  over: Map<string, CatalogueRecord> | null,
): Map<string, CatalogueRecord> | null {
  if (!under) return over;
  if (!over) return under;
  const merged = new Map(under);
  for (const [id, cam] of over) merged.set(id, cam);
  return merged;
}

async function buildHere(): Promise<void> {
  if (Date.now() - lastBuildAt < REBUILD_MS) return;
  lastBuildAt = Date.now();
  try {
    await buildCatalogueHere();
    builtHere = true;
  } catch (error) {
    console.warn("[WorldEye] Enterprise feed could not build the camera catalogue:", error);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The cold path (every Vercel instance's first read): build here, chase
 *  the fill while it lands — bounded, like the showcase's cold read. */
async function buildColdCatalogue(): Promise<Map<string, CatalogueRecord> | null> {
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

async function resolveCatalogue(): Promise<Map<string, CatalogueRecord> | null> {
  let payload = getPayload();
  if (payload && !payload.complete && builtHere) {
    await buildHere();
    payload = getPayload();
  }
  if (payload?.complete) {
    const map = await fromPayload();
    if (map) return map;
  }
  const snap = await fromSnapshot();
  if (snap) {
    return mergeUnder(await fromFastlane(), mergeUnder(snap, await fromPayload()));
  }
  if (!payload) return buildColdCatalogue();
  return mergeUnder(await fromFastlane(), await fromPayload());
}

/** The whole catalogue by id, or null when no source could produce one. */
export async function enterpriseCatalogueById(): Promise<Map<string, CatalogueRecord> | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.map;
  const map = await resolveCatalogue();
  if (map) cache = { at: Date.now(), map };
  return map;
}

/** Test seam: drop the module cache. */
export function resetEnterpriseCatalogueCache(): void {
  cache = null;
}
