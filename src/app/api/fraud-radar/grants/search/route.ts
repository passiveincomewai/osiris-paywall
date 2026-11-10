import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  searchGrantRecipients,
  grantsConfig,
  DEFAULT_GRANTS_VERSION,
} from "@/lib/fraud-radar/grants-data";

/**
 * Fraud Radar — grant recipient search API (Phase 4). Flag-gated
 * like every Fraud Radar route: with FRAUD_RADAR_ENABLED off this
 * is a 404, indistinguishable from the route not existing (AUDIT
 * §13.3). Read-only over the published artifacts. Amounts in
 * results are AWARD-CUMULATIVE snapshot totals; absence means the
 * recipient does not appear in the published award files — never
 * zero activity.
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
  if (grantsConfig() === null) {
    return NextResponse.json(
      { error: "dataset_not_published", datasetVersion: DEFAULT_GRANTS_VERSION },
      { status: 503 },
    );
  }
  const result = await searchGrantRecipients(q, { page, pageSize });
  return NextResponse.json({ datasetVersion: DEFAULT_GRANTS_VERSION, ...result });
}
