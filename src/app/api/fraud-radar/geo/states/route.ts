import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  getGeoLayer,
  geoConfig,
  DEFAULT_GEO_VERSION,
} from "@/lib/fraud-radar/geo-data";

/**
 * Fraud Radar — geo state cells API (Phase 10, §6.6). Flag-gated
 * 404 while off. Layers are returned separately keyed, exactly as
 * published — recipient and place-of-performance are never
 * blended (§5.3). Cacheable artifact reads: no rate limiter (§7.3).
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
  const sp = req.nextUrl.searchParams;
  const engine = sp.get("engine") ?? "";
  const layer = sp.get("measure") ?? sp.get("layer") ?? sp.get("field") ?? "";
  const data = await getGeoLayer(engine, layer);
  if (!data) {
    return NextResponse.json(
      { error: "layer_not_published", datasetVersion: config.version },
      { status: 404 },
    );
  }
  return NextResponse.json({ datasetVersion: config.version, ...data });
}
