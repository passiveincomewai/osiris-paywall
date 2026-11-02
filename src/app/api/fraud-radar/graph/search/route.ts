import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  searchGraphEntities,
  graphsConfig,
  DEFAULT_GRAPHS_VERSION,
} from "@/lib/fraud-radar/graphs-data";
import { checkGraphRateLimit, clientIp } from "@/lib/fraud-radar/rate-limit";

/**
 * Fraud Radar — graph entity search API (Phase 10, §6.6).
 * Flag-gated 404 while off; pageSize capped at 100 (house
 * pattern); soft rate limit 60 req/min/IP (§7.3). The designed
 * idx/ stub tree was not published by G4, so until it exists this
 * reports index_not_published honestly (503) rather than scanning
 * the ego corpus at request time.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!fraudRadarEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const rl = checkGraphRateLimit(clientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", limit: rl.limit, resetAt: rl.resetAt },
      { status: 429 },
    );
  }
  if (graphsConfig() === null) {
    return NextResponse.json(
      { error: "dataset_not_published", datasetVersion: DEFAULT_GRAPHS_VERSION },
      { status: 503 },
    );
  }
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(sp.get("pageSize") ?? "25", 10) || 25),
  );
  const result = await searchGraphEntities(q, { page, pageSize });
  if (result.error === "index_not_published") {
    return NextResponse.json(
      { error: "index_not_published", datasetVersion: DEFAULT_GRAPHS_VERSION },
      { status: 503 },
    );
  }
  return NextResponse.json({ datasetVersion: DEFAULT_GRAPHS_VERSION, ...result });
}
