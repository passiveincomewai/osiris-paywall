import { NextRequest } from "next/server";
import { apiNotFound } from "@/lib/developer/http";
import { publicApiEnabled } from "@/lib/developer/flag";
import { authenticateApiKey } from "@/lib/developer/auth";
import {
  MCP_ERR,
  handleMcpMessage,
  mcpIsToolCall,
  type JsonRpcResponse,
} from "@/lib/developer/mcp";

/**
 * WorldEye developer MCP server — Streamable HTTP, stateless JSON.
 *
 *   POST /api/v1/mcp   one JSON-RPC message (or a batch)
 *   GET  /api/v1/mcp   405: this server opens no server-initiated streams
 *
 * The second door over the public API service: same flag
 * (PUBLIC_API_ENABLED — 404 while dark), same public keys
 * (Authorization: Bearer wek_… or X-Api-Key), same daily quota — a
 * tools/call counts one request; initialize / tools/list / ping pass
 * the burst limits but do not consume quota. NOT the OI MCP at
 * /api/mcp, which is a different product and is untouched.
 */
export const runtime = "nodejs";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

function rpcResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Browsers send Origin; servers and agents do not. A browser page may
 * only talk to this endpoint from this site or a local tool. Nothing
 * here rides on cookies, so this is defence in depth (mirrors /api/mcp).
 */
function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
      .split(",")[0]
      .trim();
    if (o.host === host) return true;
    if (o.hostname === "localhost" || o.hostname === "127.0.0.1" || o.hostname === "[::1]") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!publicApiEnabled()) return apiNotFound();
  if (!originAllowed(req)) {
    return rpcResponse(
      { jsonrpc: "2.0", id: null, error: { code: MCP_ERR.invalidRequest, message: "Origin not allowed." } },
      403,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return rpcResponse(
      { jsonrpc: "2.0", id: null, error: { code: MCP_ERR.parse, message: "Parse error: body must be JSON." } },
      400,
    );
  }
  const messages = Array.isArray(body) ? body : [body];
  if (messages.length === 0) {
    return rpcResponse(
      { jsonrpc: "2.0", id: null, error: { code: MCP_ERR.invalidRequest, message: "Empty batch." } },
      400,
    );
  }

  const countsQuota = messages.some((m) => mcpIsToolCall(m));
  const authResult = await authenticateApiKey(req, { countRequest: countsQuota });
  if (!authResult.ok) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    };
    if (authResult.retryAfterSeconds) headers["Retry-After"] = String(authResult.retryAfterSeconds);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32001, message: `${authResult.code}: ${authResult.message}` },
      }),
      { status: authResult.status, headers },
    );
  }

  const ctx = { auth: authResult.auth, origin: new URL(req.url).origin };
  const responses: JsonRpcResponse[] = [];
  for (const msg of messages) {
    const res = await handleMcpMessage(msg, ctx);
    if (res) responses.push(res);
  }
  // Notifications only: accepted, no body (Streamable HTTP convention).
  if (responses.length === 0) return new Response(null, { status: 202 });
  return rpcResponse(Array.isArray(body) ? responses : responses[0]);
}

export async function GET() {
  if (!publicApiEnabled()) return apiNotFound();
  return rpcResponse(
    {
      jsonrpc: "2.0",
      id: null,
      error: { code: MCP_ERR.invalidRequest, message: "This MCP server is stateless: POST JSON-RPC messages; it opens no GET stream." },
    },
    405,
  );
}
