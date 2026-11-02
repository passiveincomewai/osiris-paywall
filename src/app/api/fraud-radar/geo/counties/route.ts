import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  getGeoCounties,
  geoConfig,
  DEFAULT_GEO_VERSION,
} from "@/lib/fraud-radar/geo-data";

/**
 * Fraud Radar — geo county-name table API (Phase 10, §6.6).
 * Flag-gated 404 while off. County is a name-keyed TABLE grain
 * (§5.1): no geometry, no FIPS joins, names as reported.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!fraudRadarEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const config = geoConfig();
  if (config === null) {
    return NextResponse.json(
      { error: "dataset_not_published", datasetVersion: DEFAULT_GEO_VERSION },
      { status: 503 },
    );
  }
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const data = await getGeoCounties(state);
  if (!data) {
    return NextResponse.json(
      { error: "counties_not_published", datasetVersion: config.version },
      { status: 404 },
    );
  }
  return NextResponse.json({ datasetVersion: config.version, ...data });
}
