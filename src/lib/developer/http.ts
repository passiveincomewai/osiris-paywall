/**
 * Shared HTTP plumbing for the public developer doors (REST + MCP):
 * the flag gate, the error shape, and the rate-limit headers. Every
 * public-API error is `{ error: { code, message } }` — documented on
 * /developers and stable across v1.
 */
import { NextResponse } from "next/server";
import { publicApiEnabled } from "./flag";
import { authenticateApiKey, type ApiAuthResult, type ApiKeyAuth } from "./auth";

export function apiError(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

/** The flag-off answer for every public door: a plain 404. */
export function apiNotFound(): NextResponse {
  return apiError(404, "not_found", "Not found.");
}

export function rateHeaders(auth: ApiKeyAuth): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(auth.limits.dailyRequests),
    "X-RateLimit-Remaining": String(auth.remainingToday),
    "X-RateLimit-Reset": String(Math.floor(new Date(auth.resetsAt).getTime() / 1000)),
    "X-RateLimit-Tier": auth.tier,
  };
}

export function apiOk(body: unknown, auth?: ApiKeyAuth, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, max-age=60",
      ...(auth ? rateHeaders(auth) : {}),
    },
  });
}

export type PublicGateResult =
  | { ok: true; auth: ApiKeyAuth }
  | { ok: false; response: NextResponse };

/**
 * The prelude every authenticated public route runs: flag first (404
 * while dark), then key auth + quota (the failure rendered as-is).
 */
export async function publicApiGate(
  req: Request,
  opts: { countRequest?: boolean } = {},
): Promise<PublicGateResult> {
  if (!publicApiEnabled()) return { ok: false, response: apiNotFound() };
  const result: ApiAuthResult = await authenticateApiKey(req, opts);
  if (!result.ok) {
    const headers: Record<string, string> = {};
    if (result.retryAfterSeconds) headers["Retry-After"] = String(result.retryAfterSeconds);
    return {
      ok: false,
      response: apiError(result.status, result.code, result.message, headers),
    };
  }
  return { ok: true, auth: result.auth };
}
