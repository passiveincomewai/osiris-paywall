import { NextRequest } from "next/server";
import { apiError, apiOk, publicApiGate } from "@/lib/developer/http";
import { clampLimit, latestEarthquakes } from "@/lib/developer/service";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/v1/earthquakes — the site's earthquake layer: USGS M2.5+
 * events from the last 24 hours (US federal public domain data).
 * ?limit=<n> caps the list (default: all of them, max 500).
 */
export async function GET(req: NextRequest) {
  const gate = await publicApiGate(req);
  if (!gate.ok) return gate.response;
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw === null ? undefined : clampLimit(Number(limitRaw), 500, 500);
  const result = await latestEarthquakes(limit);
  if (!result) {
    return apiError(502, "upstream_unavailable", "The USGS earthquake feed is unavailable right now.");
  }
  return apiOk(
    {
      data: result.earthquakes,
      total: result.total,
      generatedAt: result.generatedAt,
      source: result.source,
    },
    gate.auth,
  );
}
