// MCP protocol pins: the developer MCP negotiates like the OI one,
// lists its five tools, and a tools/call runs over the same
// rights-cleared service as REST (the Windy fixture must not surface).
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CatalogueRecord } from "@/lib/enterprise/payload";

const mocks = vi.hoisted(() => ({
  catalogue: vi.fn(async () => null as Map<string, CatalogueRecord> | null),
}));

vi.mock("@/lib/enterprise/catalogue", () => ({
  enterpriseCatalogueById: mocks.catalogue,
}));

import { handleMcpMessage, MCP_TOOLS, type McpApiContext } from "./mcp";
import { resetEligibleCache } from "./service";
import { API_TIER_LIMITS } from "./limits";

const ctx: McpApiContext = {
  origin: "https://worldeye.app",
  auth: {
    keyId: "key-1",
    userId: "user-1",
    keyName: "Test",
    keyPrefix: "wek_test",
    tier: "free",
    limits: API_TIER_LIMITS.free,
    usedToday: 1,
    remainingToday: API_TIER_LIMITS.free.dailyRequests - 1,
    resetsAt: new Date(Date.now() + 3600_000).toISOString(),
  },
};

const UDOT: CatalogueRecord = {
  id: "udot-1",
  name: "I-15 @ 900 S",
  city: "Salt Lake City",
  country: "United States",
  source: "UDOT",
  lat: 40.75,
  lng: -111.89,
  feed_url: "https://agency.example/still.jpg",
  stream_type: "jpg",
};
const WINDY: CatalogueRecord = {
  id: "windy-1",
  name: "South Beach",
  city: "Miami",
  country: "United States",
  source: "Windy Webcams",
  lat: 25.79,
  lng: -80.13,
  feed_url: "https://windy.example/still.jpg",
  stream_type: "jpg",
};

const call = (method: string, params?: unknown, id: string | number = 1) =>
  handleMcpMessage({ jsonrpc: "2.0", id, method, params }, ctx);

beforeEach(() => {
  vi.clearAllMocks();
  resetEligibleCache();
  mocks.catalogue.mockResolvedValue(new Map([[UDOT.id, UDOT], [WINDY.id, WINDY]]));
});

describe("handleMcpMessage — protocol", () => {
  it("initialize negotiates a supported version and names the server", async () => {
    const res = await call("initialize", { protocolVersion: "2025-03-26" });
    const result = res!.result as { protocolVersion: string; serverInfo: { name: string } };
    expect(result.protocolVersion).toBe("2025-03-26");
    expect(result.serverInfo.name).toBe("worldeye-api");
  });

  it("initialize falls back to the latest version for an unknown ask", async () => {
    const res = await call("initialize", { protocolVersion: "1999-01-01" });
    const result = res!.result as { protocolVersion: string };
    expect(result.protocolVersion).toBe("2025-06-18");
  });

  it("tools/list returns the five tools", async () => {
    const res = await call("tools/list");
    const result = res!.result as { tools: { name: string }[] };
    expect(result.tools.map((t) => t.name)).toEqual([
      "search_cameras",
      "get_camera",
      "cameras_near",
      "latest_earthquakes",
      "get_usage",
    ]);
    expect(MCP_TOOLS).toHaveLength(5);
  });

  it("ping answers empty; unknown methods are -32601", async () => {
    await expect(call("ping")).resolves.toMatchObject({ result: {} });
    const res = await call("nope/nope");
    expect(res!.error?.code).toBe(-32601);
  });

  it("notifications get no reply", async () => {
    await expect(
      handleMcpMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, ctx),
    ).resolves.toBeNull();
  });

  it("an unknown tool is a params error, not a crash", async () => {
    const res = await call("tools/call", { name: "oi_predict", arguments: {} });
    expect(res!.error?.code).toBe(-32602);
  });
});

describe("handleMcpMessage — tools/call over the cleared service", () => {
  it("search_cameras returns only the cleared camera", async () => {
    const res = await call("tools/call", { name: "search_cameras", arguments: {} });
    const result = res!.result as { structuredContent: { total: number; cameras: { id: string }[] } };
    expect(result.structuredContent.total).toBe(1);
    expect(result.structuredContent.cameras[0].id).toBe("udot-1");
  });

  it("get_camera on a non-cleared id is a tool-level not-found", async () => {
    const res = await call("tools/call", { name: "get_camera", arguments: { id: "windy-1" } });
    const result = res!.result as { isError?: boolean; content: { text: string }[] };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not found");
  });

  it("get_usage reports the context key's tier and quota", async () => {
    const res = await call("tools/call", { name: "get_usage", arguments: {} });
    const result = res!.result as { structuredContent: { tier: string; usage: { usedToday: number } } };
    expect(result.structuredContent.tier).toBe("free");
    expect(result.structuredContent.usage.usedToday).toBe(1);
  });
});
