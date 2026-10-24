import { NextResponse } from "next/server";
import { getPayload, readSnapshot } from "@/lib/cctv-snapshot";
import { previewMedia } from "@/lib/camera-preview";
import { pickSpotlight, spotlightDateKey } from "@/lib/spotlight";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Wave 2 F13 — today's Daily Spotlight Cam.
 *
 * Catalogue resolution mirrors /api/cctv/showcase exactly (the same
 * sources, in the same order): the in-memory /api/cctv payload, the
 * on-disk snapshot, then the in-repo fast lane — because on Vercel the
 * first two are absent in this function's instance. Only cameras the
 * app's own preview machinery can play (lib/camera-preview) are
 * eligible, and the pick is lib/spotlight's deterministic daily
 * rotation. Viewing the featured camera is gated client-side to
 * signed-in accounts (components/SpotlightCam); this route serves only
 * the catalogue facts (name/place/preview) the homepage gallery
 * already shows anonymously — no feed keys, no new exposure.
 */

interface CatalogueCamera {
  id: string;
  name?: string;
  title?: string;
  city?: string;
  country?: string;
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
    const parsed = JSON.parse(payload.json.toString("utf8")) as { cameras?: CatalogueCamera[] };
    if (Array.isArray(parsed.cameras) && parsed.cameras.length) return parsed.cameras;
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
      if (out.length) return out;
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
    if (Array.isArray(records) && records.length) return records as unknown as CatalogueCamera[];
  } catch {
    /* fast lane unavailable */
  }
  return null;
}

let memo: { at: number; cameras: CatalogueCamera[] } | null = null;
const MEMO_TTL_MS = 30 * 60_000;

async function resolveCatalogue(): Promise<CatalogueCamera[]> {
  if (memo && Date.now() - memo.at < MEMO_TTL_MS) return memo.cameras;
  const cameras = (await fromPayload()) ?? (await fromSnapshot()) ?? (await fromFastlane()) ?? [];
  if (cameras.length) memo = { at: Date.now(), cameras };
  return cameras;
}

export async function GET() {
  const dateKey = spotlightDateKey(new Date());
  const all = await resolveCatalogue();
  const playable = all.filter((c) => {
    try {
      return previewMedia(c) !== null;
    } catch {
      return false;
    }
  });
  const pick = pickSpotlight(playable, dateKey);
  if (!pick) {
    return NextResponse.json(
      { dateKey, camera: null },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  }
  const cam = pick.camera;
  const media = previewMedia(cam);
  return NextResponse.json(
    {
      dateKey,
      camera: {
        id: cam.id,
        name: cam.name || cam.title || "Live camera",
        city: cam.city ?? null,
        country: cam.country ?? null,
        lat: typeof cam.lat === "number" ? cam.lat : null,
        lng: typeof cam.lng === "number" ? cam.lng : null,
        mediaKind: media?.kind ?? null,
        mediaUrl: media?.url ?? null,
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600" } },
  );
}
