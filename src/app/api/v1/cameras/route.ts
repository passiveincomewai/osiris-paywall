import { NextRequest } from "next/server";
import { apiError, apiOk, publicApiGate } from "@/lib/developer/http";
import {
  camerasNear,
  clampLimit,
  clampOffset,
  geocodePlace,
  searchCameras,
} from "@/lib/developer/service";
import type { CameraMediaKind } from "@/lib/country-cameras";

export const runtime = "nodejs";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

const KINDS: readonly string[] = ["video", "snapshot", "embed", "link"];

function parseNumber(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * GET /api/v1/cameras — search the redistribution-cleared camera catalogue.
 *
 *   ?q=<text>            name / city / country / source match
 *   ?country=<name|CC>   one country (full name or ISO alpha-2)
 *   ?kind=<video|snapshot|embed|link>
 *   ?near=<lat>,<lng>    sort by distance instead of name (with radius_km)
 *   ?place=<name>        geocode a place, then search around it
 *   ?radius_km=<n>       default 50, max 500 (near/place only)
 *   ?limit=<n>           default 20, max 100
 *   ?offset=<n>          pagination over the filtered set (ignored by near)
 *
 * Auth: a public API key (Authorization: Bearer wek_…). Flag-gated:
 * 404 while PUBLIC_API_ENABLED is off.
 */
export async function GET(req: NextRequest) {
  const gate = await publicApiGate(req);
  if (!gate.ok) return gate.response;

  const params = req.nextUrl.searchParams;
  const origin = new URL(req.url).origin;
  const limit = clampLimit(parseNumber(params.get("limit")));
  const kindRaw = params.get("kind");
  if (kindRaw && !KINDS.includes(kindRaw)) {
    return apiError(
      400,
      "invalid_parameter",
      `kind must be one of: ${KINDS.join(", ")}.`,
    );
  }
  const kind = (kindRaw as CameraMediaKind | null) ?? undefined;

  const nearRaw = params.get("near");
  const place = params.get("place")?.trim();
  if (nearRaw || place) {
    let center: { lat: number; lng: number; label?: string } | null = null;
    if (nearRaw) {
      const [lat, lng] = nearRaw.split(",").map((s) => Number(s.trim()));
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return apiError(400, "invalid_parameter", "near must be \"<lat>,<lng>\" with lat in [-90, 90] and lng in [-180, 180].");
      }
      center = { lat, lng };
    } else if (place) {
      center = await geocodePlace(place);
      if (!center) {
        return apiError(404, "place_not_found", `Could not resolve the place "${place}".`);
      }
    }
    const radiusKm = Math.min(Math.max(parseNumber(params.get("radius_km")) ?? 50, 1), 500);
    const result = await camerasNear(center!, radiusKm, limit, origin);
    if (!result) {
      return apiError(503, "catalogue_unavailable", "The camera catalogue is still loading. Try again in a moment.");
    }
    return apiOk(
      {
        data: result.cameras,
        center: result.center,
        radiusKm,
        total: result.total,
        attribution: "Camera data via WorldEye. Credit each camera's listed source.",
      },
      gate.auth,
    );
  }

  const result = await searchCameras(
    {
      q: params.get("q") ?? undefined,
      country: params.get("country") ?? undefined,
      kind,
      limit,
      offset: clampOffset(parseNumber(params.get("offset"))),
    },
    origin,
  );
  if (!result) {
    return apiError(503, "catalogue_unavailable", "The camera catalogue is still loading. Try again in a moment.");
  }
  return apiOk(
    {
      data: result.cameras,
      page: { limit, offset: clampOffset(parseNumber(params.get("offset"))), total: result.total },
      attribution: "Camera data via WorldEye. Credit each camera's listed source.",
    },
    gate.auth,
  );
}
