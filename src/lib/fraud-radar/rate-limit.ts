/**
 * Fraud Radar Phase 10 — in-process per-IP soft rate limit (§7.3),
 * mirroring the OI runs pattern (src/lib/oi/runs.ts LIMITS
 * precedent): 60 requests/minute/IP on the graph API families.
 * Process-local by design (a soft abuse brake for a scrape-shaped
 * surface, not a security boundary); the response states the limit
 * and the reset (Phase 9 §10 pattern).
 */

export const GRAPH_RATE_LIMIT = 60;
export const GRAPH_RATE_WINDOW_MS = 60_000;

const buckets = new Map<string, { count: number; windowStart: number }>();

export function checkGraphRateLimit(
  ip: string,
  now: number = Date.now(),
): { ok: boolean; limit: number; remaining: number; resetAt: number } {
  const b = buckets.get(ip);
  if (!b || now - b.windowStart >= GRAPH_RATE_WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return {
      ok: true,
      limit: GRAPH_RATE_LIMIT,
      remaining: GRAPH_RATE_LIMIT - 1,
      resetAt: now + GRAPH_RATE_WINDOW_MS,
    };
  }
  b.count += 1;
  return {
    ok: b.count <= GRAPH_RATE_LIMIT,
    limit: GRAPH_RATE_LIMIT,
    remaining: Math.max(0, GRAPH_RATE_LIMIT - b.count),
    resetAt: b.windowStart + GRAPH_RATE_WINDOW_MS,
  };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? "unknown").trim() || "unknown";
}
