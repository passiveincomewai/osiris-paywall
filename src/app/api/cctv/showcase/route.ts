import { NextResponse } from "next/server";
import { getPayload, readSnapshot } from "@/lib/cctv-snapshot";
import { previewMedia } from "@/lib/camera-preview";
import { landingCategory } from "@/lib/landing-cameras";

/**
 * Read-only showcase feed for the homepage camera gallery.
 *
 * Resolves the curated manifest (src/lib/landing-cameras.ts) against the
 * same catalogue snapshot that backs /api/cctv — no second catalogue
 * fetch, no new upstream traffic. Only cameras whose media the app's own
 * preview machinery can actually play (lib/camera-preview) are returned,
 * with the resolved media URL, so the gallery never renders a card it
 * cannot show. Cameras that have rotated out of the catalogue are dropped
 * silently; the gallery's own in-session load check is the final word on
 * the LIVE badge.
 */

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

async function catalogueById(): Promise<Map<string, CatalogueCamera> | null> {
  // The in-memory payload is built progressively (regions land over the
  // first minutes after boot) and is only authoritative once complete —
  // before that, the on-disk snapshot is the fuller catalogue. Prefer:
  // complete payload → snapshot → partial payload → nothing.
  const payload = getPayload();
  if (payload?.complete) {
    const map = await fromPayload();
    if (map) return map;
  }
  const snap = await fromSnapshot();
  if (snap) return snap;
  if (payload) return fromPayload();
  return null;
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
