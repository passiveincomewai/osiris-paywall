import { NextRequest } from "next/server";
import { apiOk, publicApiGate } from "@/lib/developer/http";

export const runtime = "nodejs";

/**
 * GET /api/v1/usage — the calling key's plan tier, quota and today's
 * usage. Does not itself consume quota (it still passes the burst
 * limits), so clients can poll it to pace themselves.
 */
export async function GET(req: NextRequest) {
  const gate = await publicApiGate(req, { countRequest: false });
  if (!gate.ok) return gate.response;
  const { auth } = gate;
  return apiOk(
    {
      key: { name: auth.keyName, prefix: auth.keyPrefix },
      tier: auth.tier,
      plan: auth.limits.planLabel,
      limits: {
        dailyRequests: auth.limits.dailyRequests,
        requestsPerMinute: auth.limits.requestsPerMinute,
      },
      usage: {
        usedToday: auth.usedToday,
        remainingToday: auth.remainingToday,
        resetsAt: auth.resetsAt,
      },
    },
    auth,
  );
}
