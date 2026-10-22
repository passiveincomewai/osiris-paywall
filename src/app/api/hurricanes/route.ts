import { NextResponse } from "next/server";
import { getStormFeatures } from "@/lib/events/hurricanes-data";

/**
 * OSIRIS — Hurricanes: active tropical cyclones from NOAA's National
 * Hurricane Center. The fetch pipeline lives in lib/events/hurricanes-data
 * (CurrentStorms.json + the NHC tropical MapServer, one cached source)
 * so the server-rendered storm pages read the identical data. This route
 * keeps its long-standing response shape for the globe and sky panel:
 * { features, storms, count, source }. Source: NOAA / NHC —
 * https://www.nhc.noaa.gov/
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const features = await getStormFeatures();
    const storms = features
      .filter((f) => f.properties.kind === "current")
      .map((f) => f.properties);
    return NextResponse.json(
      { features, storms, count: storms.length, source: "NOAA NHC" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { features: [], storms: [], count: 0, source: "NOAA NHC" },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
