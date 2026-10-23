import { NextResponse } from "next/server";
import { getPayload, readSnapshot } from "@/lib/cctv-snapshot";
import { buildCatalogueHere } from "@/lib/vision/catalogue-build";
import {
  selectLiveWallDemoCameras,
  type DemoCatalogCamera,
} from "@/lib/recording/live-wall-demo";

/**
 * Live Wall demo feed — the real cameras behind the demo wall on
 * /recording/live.
 *
 * Read-only and public, like the catalogue it resolves from: the demo is
 * for visitors who have not upgraded (including signed-out visitors), so
 * it cannot sit behind the Pro-gated recording APIs. It grants nothing —
 * no saved-camera rows, no recording capability, only the stream URLs of
 * a handful of catalogue cameras the site already serves publicly via
 * /api/cctv, chosen by lib/recording/live-wall-demo.
 *
 * The catalogue comes from the same sources, in the same order, as the
 * showcase route (src/app/api/cctv/showcase): the in-memory /api/cctv
 * payload, the on-disk snapshot, the in-repo fast lane riding underneath,
 * and — on a cold instance that holds none of those — a catalogue built
 * inside this process, waited on with a bound.
 */

export const maxDuration = 60;

async function fromPayload(): Promise<Map<string, DemoCatalogCamera> | null> {
  const payload = getPayload();
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload.json.toString("utf8")) as {
      cameras?: DemoCatalogCamera[];
    };
    if (Array.isArray(parsed.cameras)) {
      return new Map(parsed.cameras.map((c) => [c.id, c]));
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function fromSnapshot(): Promise<Map<string, DemoCatalogCamera> | null> {
  try {
    const snap = await readSnapshot();
    if (snap) {
      const map = new Map<string, DemoCatalogCamera>();
      for (const list of Object.values(snap.regions)) {
        for (const cam of list as unknown as DemoCatalogCamera[]) map.set(cam.id, cam);
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

/** The in-repo loaders' records, indexed by id — the catalogue's fast lane. */
async function fromFastlane(): Promise<Map<string, DemoCatalogCamera> | null> {
  try {
    const records = await (await fastlaneImport()).fastlaneStatics();
    if (!records.length) return null;
    const map = new Map<string, DemoCatalogCamera>();
    for (const cam of records as unknown as DemoCatalogCamera[]) {
      if (cam && typeof cam.id === "string" && cam.id) map.set(cam.id, cam);
    }
    return map.size ? map : null;
  } catch {
    return null;
  }
}

/** `over` wins per id over `under` — the merge rule the showcase uses. */
function mergeUnder(
  under: Map<string, DemoCatalogCamera> | null,
  over: Map<string, DemoCatalogCamera> | null,
): Map<string, DemoCatalogCamera> | null {
  if (!under) return over;
  if (!over) return under;
  const merged = new Map(under);
  for (const [id, cam] of over) merged.set(id, cam);
  return merged;
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
    console.warn("[OSIRIS] Live Wall demo could not build the camera catalogue:", error);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The cold path, bounded exactly as the showcase's: build here, chase
 *  the fill until the catalogue is whole, stops growing, or time is up. */
async function buildColdCatalogue(): Promise<Map<string, DemoCatalogCamera> | null> {
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

async function catalogueById(): Promise<Map<string, DemoCatalogCamera> | null> {
  let payload = getPayload();
  if (payload && !payload.complete && builtHere) {
    await buildHere();
    payload = getPayload();
  }
  // Same precedence as the showcase: complete payload → snapshot →
  // built-here → partial payload, fast lane underneath throughout.
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

export async function GET() {
  const byId = await catalogueById();
  const cameras = byId ? selectLiveWallDemoCameras(byId.values()) : [];
  return NextResponse.json(
    { cameras },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
