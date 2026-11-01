// POST /api/white-label-demo/preview — create a shareable illustrative
// preview for the White Label demo generator.
//
// The server re-derives EVERYTHING from the posted location id: the
// location is looked up in the index built from the eligible camera
// set, and the camera wall is selected here (nearest eligible cameras
// within the preview radius) — a caller can never inject camera ids,
// a location name, or coordinates of their own. The logo URL is only
// accepted when it points at this feature's own blob prefix (uploaded
// through /api/white-label-demo/logo); anything else is rejected, so
// previews can't hotlink third-party images.
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import { publicEmbedCameras } from "@/lib/embed/public";
import {
  getDemoLocations,
  findDemoLocation,
  selectPreviewCameras,
  makePreviewSlug,
  parsePreviewOrgName,
} from "@/lib/white-label-demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

function isOwnLogoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith("/white-label-logos/")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (isRateLimited(`white-label-preview:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many previews from this network. Try again in an hour." },
      { status: 429 },
    );
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const orgName = parsePreviewOrgName(body.orgName);
  if (!orgName) {
    return NextResponse.json(
      { error: "Enter your organisation's name (2–80 characters)." },
      { status: 400 },
    );
  }
  const logoUrlRaw = String(body.logoUrl ?? "").trim();
  if (logoUrlRaw && !isOwnLogoUrl(logoUrlRaw)) {
    return NextResponse.json(
      { error: "That logo didn't come through the upload step — upload it again or skip the logo." },
      { status: 400 },
    );
  }
  const locationId = String(body.locationId ?? "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "worldeye.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const cameras = await publicEmbedCameras(`${proto}://${host}`);
  if (!cameras) {
    return NextResponse.json(
      { error: "The camera catalogue is unavailable right now — try again in a moment." },
      { status: 503 },
    );
  }
  const location = findDemoLocation(getDemoLocations(cameras), locationId);
  if (!location) {
    return NextResponse.json(
      { error: "Pick a location from the search results." },
      { status: 400 },
    );
  }
  const picked = selectPreviewCameras(cameras, location.lat, location.lng);
  if (picked.length === 0) {
    return NextResponse.json(
      { error: "No redistribution-cleared cameras are available near that location right now." },
      { status: 422 },
    );
  }

  // Slug collisions are astronomically unlikely at 79 bits, but a
  // unique-constraint failure should retry, never 500.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = makePreviewSlug();
    try {
      const row = await db.whiteLabelPreview.create({
        data: {
          slug,
          orgName,
          logoUrl: logoUrlRaw || null,
          locationLabel: location.label,
          locationDetail: location.detail || null,
          lat: location.lat,
          lng: location.lng,
          cameraIds: picked.map((c) => c.id),
        },
        select: { slug: true },
      });
      return NextResponse.json({ slug: row.slug, url: `/white-label/demo/${row.slug}` });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== "P2002" || attempt === 2) throw e;
    }
  }
  return NextResponse.json({ error: "Could not create the preview." }, { status: 500 });
}
