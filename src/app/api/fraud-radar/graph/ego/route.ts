import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  getEgoNetwork,
  getGraphsDatasetMeta,
  graphsConfig,
  DEFAULT_GRAPHS_VERSION,
} from "@/lib/fraud-radar/graphs-data";
import { checkGraphRateLimit, clientIp } from "@/lib/fraud-radar/rate-limit";

/**
 * Fraud Radar — ego-network API (Phase 10, §6.6). Flag-gated 404
 * while off. One entity per request; no bulk ego endpoint exists
 * (§7.3). Soft rate limit 60 req/min/IP (§7.3). Unconfigured
 * artifact root ⇒ 503 dataset_not_published (B-3 disposition).
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const rl = checkGraphRateLimit(clientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", limit: rl.limit, resetAt: rl.resetAt },
      { status: 429 },
    );
  }
  const config = graphsConfig();
  if (config === null) {
    return NextResponse.json(
      { error: "dataset_not_published", datasetVersion: DEFAULT_GRAPHS_VERSION },
      { status: 503 },
    );
  }
  const sp = req.nextUrl.searchParams;
  const engine = sp.get("engine") ?? "";
  const key = sp.get("key") ?? "";
  const ego = await getEgoNetwork(engine, key);
  if (!ego) {
    return NextResponse.json(
      { error: "ego_not_published", datasetVersion: config.version },
      { status: 404 },
    );
  }
  const meta = await getGraphsDatasetMeta();
  return NextResponse.json({
    datasetVersion: config.version,
    candidateSentence: meta?.candidateSentence ?? null,
    ego,
  });
}
