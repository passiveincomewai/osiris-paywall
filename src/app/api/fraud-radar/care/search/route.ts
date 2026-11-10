import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  searchCareProviders,
  careConfig,
  DEFAULT_CARE_VERSION,
} from "@/lib/fraud-radar/care-data";

/**
 * Fraud Radar — Medicare provider search API (Phase 3). Flag-gated
 * like every Fraud Radar route: with FRAUD_RADAR_ENABLED off this is
 * a 404, indistinguishable from the route not existing (AUDIT §13.3).
 * Read-only over the published artifacts. Amounts in results are
 * DERIVED from CMS's published averages; absence means CMS did not
 * publish the provider — never zero activity.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(sp.get("pageSize") ?? "25", 10) || 25),
  );
  if (careConfig() === null) {
    return NextResponse.json(
      { error: "dataset_not_published", datasetVersion: DEFAULT_CARE_VERSION },
      { status: 503 },
    );
  }
  const result = await searchCareProviders(q, { page, pageSize });
  return NextResponse.json({ datasetVersion: DEFAULT_CARE_VERSION, ...result });
}
