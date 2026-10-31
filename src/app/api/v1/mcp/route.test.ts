// MCP door pins, over real HTTP-shaped requests through the route:
// flag-dark 404, key-less 401 as a JSON-RPC error, then the full
// client flow — initialize → notifications/initialized (202) →
// tools/list → tools/call — against the rights-cleared fixture
// catalogue (the Windy camera must not surface).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { CatalogueRecord } from "@/lib/enterprise/payload";

interface KeyRow {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scope: string;
  hits: number;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  rateWindowStart: Date | null;
  rateWindowCount: number;
  createdAt: Date;
}

const mocks = vi.hoisted(() => ({
  findKey: vi.fn(async () => null as KeyRow | null),
  updateKey: vi.fn(async (_args: unknown) => ({})),
  findSub: vi.fn(async () => null as null | {
    status: string;
    currentPeriodEnd: Date;
    stripePriceId: string;
  }),
  catalogue: vi.fn(async () => null as Map<string, CatalogueRecord> | null),
}));

vi.mock("@/lib/db", () => ({
  db: {
    enterpriseApiKey: { findUnique: mocks.findKey, update: mocks.updateKey },
    subscription: { findUnique: mocks.findSub },
  },
}));
vi.mock("@/lib/enterprise/catalogue", () => ({
  enterpriseCatalogueById: mocks.catalogue,
}));

import { GET, POST } from "./route";
import { generateApiKey, hashSecret } from "@/lib/enterprise/tokens";
import { resetEligibleCache } from "@/lib/developer/service";

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

let seq = 0;
function setupKey() {
  const { key, prefix } = generateApiKey();
  mocks.findKey.mockResolvedValue({
    id: `mcp-key-${++seq}`,
    userId: "user-1",
    name: "MCP test",
    keyPrefix: prefix,
    keyHash: hashSecret(key),
    scope: "public",
    hits: 0,
    lastUsedAt: null,
    revokedAt: null,
    rateWindowStart: null,
    rateWindowCount: 0,
    createdAt: new Date(),
  });
  return key;
}

function post(body: unknown, key?: string): NextRequest {
  return new NextRequest("https://worldeye.app/api/v1/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      "x-forwarded-for": `198.51.100.${seq}`,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetEligibleCache();
  process.env.PUBLIC_API_ENABLED = "1";
  mocks.updateKey.mockResolvedValue({});
  mocks.findSub.mockResolvedValue(null);
  mocks.catalogue.mockResolvedValue(new Map([[UDOT.id, UDOT], [WINDY.id, WINDY]]));
});

afterEach(() => {
  delete process.env.PUBLIC_API_ENABLED;
});

describe("POST /api/v1/mcp", () => {
  it("404s while the flag is off", async () => {
    delete process.env.PUBLIC_API_ENABLED;
    const key = setupKey();
    const res = await POST(post({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, key));
    expect(res.status).toBe(404);
  });

  it("401s without a key, as a JSON-RPC error body", async () => {
    const res = await POST(post({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.jsonrpc).toBe("2.0");
    expect(body.error.message).toContain("api_key_required");
  });

  it("runs the full client flow: initialize → initialized → list → call", async () => {
    const key = setupKey();

    const init = await POST(
      post(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } },
        },
        key,
      ),
    );
    expect(init.status).toBe(200);
    const initBody = await init.json();
    expect(initBody.result.protocolVersion).toBe("2025-06-18");
    expect(initBody.result.serverInfo.name).toBe("worldeye-api");

    const notif = await POST(
      post({ jsonrpc: "2.0", method: "notifications/initialized" }, key),
    );
    expect(notif.status).toBe(202);

    const list = await POST(post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, key));
    const listBody = await list.json();
    expect(listBody.result.tools).toHaveLength(5);

    const callRes = await POST(
      post(
        { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "search_cameras", arguments: {} } },
        key,
      ),
    );
    expect(callRes.status).toBe(200);
    const callBody = await callRes.json();
    expect(callBody.result.structuredContent.total).toBe(1);
    expect(callBody.result.structuredContent.cameras[0].id).toBe("udot-1");
    // The counted call wrote the quota window exactly once.
    expect(mocks.updateKey).toHaveBeenCalledTimes(1);
  });

  it("GET is 405 while live (no server-initiated stream)", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
