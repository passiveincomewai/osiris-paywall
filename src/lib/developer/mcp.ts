/**
 * WorldEye developer API as an MCP server (Model Context Protocol,
 * Streamable HTTP, stateless) — the second door over the exact service
 * the REST API serves (src/lib/developer/service), with the same
 * public keys, the same quota, and the same rights-cleared catalogue.
 *
 * NOT the OI MCP (src/lib/oi/mcp, /api/mcp): that is a different
 * product surface with a different credential. This module borrows its
 * protocol conventions only.
 *
 * Tools are read-only. The API key rides on the connection headers
 * (Authorization: Bearer wek_… or X-Api-Key), never in tool arguments.
 */
import {
  camerasNear,
  clampLimit,
  clampOffset,
  geocodePlace,
  getCamera,
  latestEarthquakes,
  searchCameras,
  type PublicCamera,
} from "./service";
import type { ApiKeyAuth } from "./auth";
import type { CameraMediaKind } from "@/lib/country-cameras";

export const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
export const MCP_LATEST_PROTOCOL = MCP_PROTOCOL_VERSIONS[0];
export const MCP_SERVER_VERSION = "1.0.0";

export interface McpApiContext {
  auth: ApiKeyAuth;
  origin: string;
}

type Id = string | number | null;

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: Id;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export const MCP_ERR = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
};

const INSTRUCTIONS = `WorldEye's public developer API: a catalogue of live public cameras that are cleared for redistribution (each record names the operating agency in "attribution" — keep that credit wherever the data is shown), plus the USGS earthquake feed (magnitude 2.5+, last 24 hours, US federal public-domain data).
Use search_cameras to find cameras by text, country or media kind; get_camera for one camera by id; cameras_near for a radius search around coordinates or a named place; latest_earthquakes for recent quakes; get_usage to check the calling key's plan tier and remaining daily quota.
Camera records carry metadata, a snapshotUrl (the current still, served by WorldEye) and a watchUrl that opens the camera live on the WorldEye globe — there is no video stream in this API. A camera id that returns "not found" is outside the cleared catalogue.`;

const CAMERA_KINDS = ["video", "snapshot", "embed", "link"] as const;

export const MCP_TOOLS = [
  {
    name: "search_cameras",
    title: "Search cameras",
    description:
      "Search WorldEye's redistribution-cleared live camera catalogue by free text (name, city, country, source), one country (full name or ISO alpha-2 code), and/or media kind. Returns camera metadata, snapshot URLs and watch links, paginated.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Text match over name, city, country and source." },
        country: { type: "string", description: 'One country: full name ("Japan") or ISO alpha-2 code ("JP").' },
        kind: { type: "string", enum: [...CAMERA_KINDS], description: "Media kind filter." },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Page size. Default 20." },
        offset: { type: "integer", minimum: 0, description: "Pagination offset. Default 0." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "get_camera",
    title: "Get one camera",
    description:
      "One camera by id from the cleared catalogue: metadata, snapshot URL and the watch link that opens it on the WorldEye globe. An id outside the cleared catalogue answers 'not found'.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The camera id (from search_cameras or cameras_near)." },
      },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "cameras_near",
    title: "Cameras near a point",
    description:
      "Cameras within a radius of a place: give either lat+lng or a place name to geocode. Nearest first, each with its distance in km.",
    inputSchema: {
      type: "object",
      properties: {
        lat: { type: "number", minimum: -90, maximum: 90, description: "Latitude (with lng)." },
        lng: { type: "number", minimum: -180, maximum: 180, description: "Longitude (with lat)." },
        place: { type: "string", description: 'A place name instead of coordinates, e.g. "Reykjavik".' },
        radius_km: { type: "number", minimum: 1, maximum: 500, description: "Search radius. Default 50." },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Max cameras. Default 20." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "latest_earthquakes",
    title: "Latest earthquakes",
    description:
      "The USGS earthquake feed as served on WorldEye: magnitude 2.5+ events from the last 24 hours, with place, magnitude, depth and event time.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 500, description: "Cap the list. Default: all events." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "get_usage",
    title: "API usage",
    description:
      "The calling API key's plan tier, daily quota and today's usage. (This call itself consumed one request of quota, like every tools/call.)",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
] as const;

/* ── Tool results ────────────────────────────────────────────────── */

interface ToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

const ok = (summary: string, data: Record<string, unknown>): ToolResult => ({
  content: [{ type: "text", text: `${summary}\n\n${JSON.stringify(data, null, 2)}` }],
  structuredContent: data,
});

const toolError = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

const cameraLine = (c: PublicCamera) =>
  `${c.name} — ${[c.city, c.country].filter(Boolean).join(", ")} (${c.source})`;

async function callTool(
  name: string,
  args: Record<string, unknown>,
  ctx: McpApiContext,
): Promise<ToolResult> {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

  switch (name) {
    case "search_cameras": {
      const kindRaw = str(args.kind);
      if (kindRaw && !(CAMERA_KINDS as readonly string[]).includes(kindRaw)) {
        return toolError(`kind must be one of: ${CAMERA_KINDS.join(", ")}.`);
      }
      const result = await searchCameras(
        {
          q: str(args.q),
          country: str(args.country),
          kind: kindRaw as CameraMediaKind | undefined,
          limit: clampLimit(num(args.limit)),
          offset: clampOffset(num(args.offset)),
        },
        ctx.origin,
      );
      if (!result) return toolError("The camera catalogue is still loading. Try again in a moment.");
      return ok(
        `${result.total} cleared cameras match; showing ${result.cameras.length}.`,
        { total: result.total, cameras: result.cameras },
      );
    }
    case "get_camera": {
      const id = str(args.id);
      if (!id) return toolError("id is required.");
      const camera = await getCamera(id, ctx.origin);
      if (!camera) {
        return toolError(
          "Camera not found in the public catalogue (it may exist on WorldEye without redistribution clearance).",
        );
      }
      return ok(cameraLine(camera), { camera });
    }
    case "cameras_near": {
      let center: { lat: number; lng: number; label?: string } | null = null;
      const lat = num(args.lat);
      const lng = num(args.lng);
      const place = str(args.place);
      if (lat !== undefined && lng !== undefined) {
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return toolError("lat must be in [-90, 90] and lng in [-180, 180].");
        }
        center = { lat, lng };
      } else if (place) {
        center = await geocodePlace(place);
        if (!center) return toolError(`Could not resolve the place "${place}".`);
      } else {
        return toolError("Give either lat+lng or a place name.");
      }
      const radiusKm = Math.min(Math.max(num(args.radius_km) ?? 50, 1), 500);
      const result = await camerasNear(center, radiusKm, clampLimit(num(args.limit)), ctx.origin);
      if (!result) return toolError("The camera catalogue is still loading. Try again in a moment.");
      return ok(
        `${result.total} cleared cameras within ${radiusKm} km of ${result.center.label ?? `${center.lat}, ${center.lng}`}.`,
        {
          center: result.center,
          radiusKm,
          total: result.total,
          cameras: result.cameras,
        },
      );
    }
    case "latest_earthquakes": {
      const limit = num(args.limit);
      const result = await latestEarthquakes(
        limit !== undefined ? clampLimit(limit, 500, 500) : undefined,
      );
      if (!result) return toolError("The USGS earthquake feed is unavailable right now.");
      return ok(`${result.earthquakes.length} earthquakes (USGS M2.5+, last 24 hours).`, {
        total: result.total,
        generatedAt: result.generatedAt,
        source: result.source,
        earthquakes: result.earthquakes,
      });
    }
    case "get_usage": {
      const { auth } = ctx;
      return ok(
        `${auth.limits.planLabel} plan: ${auth.usedToday} of ${auth.limits.dailyRequests} requests used today.`,
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
      );
    }
  }
  throw Object.assign(new Error(`Unknown tool: ${name}`), { rpc: MCP_ERR.invalidParams });
}

/* ── The protocol ────────────────────────────────────────────────── */

const isObj = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** True for a notification or a response: something that gets no reply. */
export function mcpExpectsNoReply(msg: unknown): boolean {
  return isObj(msg) && (msg.id === undefined || typeof msg.method !== "string");
}

/** True when the message is a tools/call (the quota-counting kind). */
export function mcpIsToolCall(msg: unknown): boolean {
  return isObj(msg) && msg.method === "tools/call";
}

const rpcError = (id: Id, code: number, message: string): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

/** Handles one JSON-RPC message. Null when it was a notification or a response. */
export async function handleMcpMessage(
  msg: unknown,
  ctx: McpApiContext,
): Promise<JsonRpcResponse | null> {
  if (!isObj(msg) || msg.jsonrpc !== "2.0") {
    return rpcError(null, MCP_ERR.invalidRequest, "Not a JSON-RPC 2.0 message.");
  }
  const id = typeof msg.id === "string" || typeof msg.id === "number" ? msg.id : null;
  if (mcpExpectsNoReply(msg)) return null;
  const method = msg.method as string;
  const params = isObj(msg.params) ? msg.params : {};

  try {
    switch (method) {
      case "initialize": {
        const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSIONS.includes(asked) ? asked : MCP_LATEST_PROTOCOL,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "worldeye-api", title: "WorldEye Developer API", version: MCP_SERVER_VERSION },
            instructions: INSTRUCTIONS,
          },
        };
      }
      case "ping":
        return { jsonrpc: "2.0", id, result: {} };
      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } };
      case "resources/list":
        return { jsonrpc: "2.0", id, result: { resources: [] } };
      case "prompts/list":
        return { jsonrpc: "2.0", id, result: { prompts: [] } };
      case "tools/call": {
        const name = typeof params.name === "string" ? params.name : "";
        if (!MCP_TOOLS.some((t) => t.name === name)) {
          return rpcError(id, MCP_ERR.invalidParams, `Unknown tool: ${name || "(none)"}`);
        }
        const args = isObj(params.arguments) ? params.arguments : {};
        try {
          return { jsonrpc: "2.0", id, result: await callTool(name, args, ctx) };
        } catch (err) {
          return {
            jsonrpc: "2.0",
            id,
            result: toolError(
              `The tool failed: ${err instanceof Error ? err.message.slice(0, 200) : "unknown error"}`,
            ),
          };
        }
      }
      default:
        return rpcError(id, MCP_ERR.methodNotFound, `Method not found: ${method}`);
    }
  } catch {
    return rpcError(id, MCP_ERR.internal, "Internal error.");
  }
}
