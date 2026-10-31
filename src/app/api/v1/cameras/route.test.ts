// REST door pins, end to end through the real route + auth + service
// (only Prisma and the catalogue source are mocked):
//  - flag off → 404, even with a valid key (the platform is dark);
//  - no key → 401 in the documented error shape; enterprise key → 403;
//  - a public key reads ONLY the rights-cleared subset (the Windy
//    fixture never appears), with rate-limit headers;
//  - detail + snapshot behave per contract (302 to the frame route;
//    stream-only snapshot is a clean 404).
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

import { GET } from "./route";
import { GET as GET_CAMERA } from "./[id]/route";
import { GET as GET_SNAPSHOT } from "./[id]/snapshot/route";
import { GET as GET_USAGE } from "../usage/route";
import { generateApiKey, hashSecret } from "@/lib/enterprise/tokens";
import { resetEligibleCache } from "@/lib/developer/service";

const UDOT_STILL: CatalogueRecord = {
  id: "udot-still-1",
  name: "I-15 @ 900 S",
  city: "Salt Lake City",
  country: "United States",
  source: "UDOT",
  lat: 40.75,
  lng: -111.89,
  feed_url: "https://agency.example/still-1.jpg",
  stream_type: "jpg",
};
const UDOT_STREAM: CatalogueRecord = {
  id: "udot-stream-1",
  name: "I-80 @ Parleys Summit",
  city: "Salt Lake City",
  country: "United States",
  source: "UDOT",
  lat: 40.71,
  lng: -111.85,
  stream_url: "https://agency.example/live-1.m3u8",
  stream_type: "hls",
};
const WINDY_CAM: CatalogueRecord = {
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

let ipSeq = 0;
function makeKey(scope = "public"): { row: KeyRow; plaintext: string } {
  const { key, prefix } = generateApiKey();
  return {
    plaintext: key,
    row: {
      id: `key-${++ipSeq}`,
      userId: "user-1",
      name: "Route test",
      keyPrefix: prefix,
      keyHash: hashSecret(key),
      scope,
      hits: 0,
      lastUsedAt: null,
      revokedAt: null,
      rateWindowStart: null,
      rateWindowCount: 0,
      createdAt: new Date(),
    },
  };
}

function req(path: string, key?: string): NextRequest {
  return new NextRequest(`https://worldeye.app${path}`, {
    headers: {
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      "x-forwarded-for": `203.0.113.${ipSeq}`,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetEligibleCache();
  process.env.PUBLIC_API_ENABLED = "1";
  mocks.updateKey.mockResolvedValue({});
  mocks.findSub.mockResolvedValue(null);
  mocks.catalogue.mockResolvedValue(
    new Map([
      [UDOT_STILL.id, UDOT_STILL],
      [UDOT_STREAM.id, UDOT_STREAM],
      [WINDY_CAM.id, WINDY_CAM],
    ]),
  );
});

afterEach(() => {
  delete process.env.PUBLIC_API_ENABLED;
});

describe("GET /api/v1/cameras", () => {
  it("404s while the flag is off — even with a valid key", async () => {
    delete process.env.PUBLIC_API_ENABLED;
    const { row, plaintext } = makeKey();
    mocks.findKey.mockResolvedValue(row);
    const res = await GET(req("/api/v1/cameras", plaintext));
    expect(res.status).toBe(404);
  });

  it("401s without a key, in the documented error shape", async () => {
    const res = await GET(req("/api/v1/cameras"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("api_key_required");
  });

  it("403s an enterprise-scope key", async () => {
    const { row, plaintext } = makeKey("enterprise");
    mocks.findKey.mockResolvedValue(row);
    const res = await GET(req("/api/v1/cameras", plaintext));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("wrong_key_scope");
  });

  it("serves only the cleared subset, with rate-limit headers", async () => {
    const { row, plaintext } = makeKey();
    mocks.findKey.mockResolvedValue(row);
    const res = await GET(req("/api/v1/cameras", plaintext));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-ratelimit-limit")).toBe("100");
    expect(res.headers.get("x-ratelimit-tier")).toBe("free");
    const body = await res.json();
    expect(body.page.total).toBe(2);
    const ids = body.data.map((c: { id: string }) => c.id).sort();
    expect(ids).toEqual(["udot-still-1", "udot-stream-1"]);
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("windy");
    expect(serialized).not.toContain("live-1.m3u8");
  });
});

describe("GET /api/v1/cameras/[id] + snapshot", () => {
  it("detail 404s the non-cleared camera and serves the cleared one", async () => {
    const { row, plaintext } = makeKey();
    mocks.findKey.mockResolvedValue(row);
    const missing = await GET_CAMERA(req("/api/v1/cameras/windy-1", plaintext), {
      params: Promise.resolve({ id: "windy-1" }),
    });
    expect(missing.status).toBe(404);
    const found = await GET_CAMERA(req("/api/v1/cameras/udot-still-1", plaintext), {
      params: Promise.resolve({ id: "udot-still-1" }),
    });
    expect(found.status).toBe(200);
    const body = await found.json();
    expect(body.data.watchUrl).toBe("https://worldeye.app/?camera=udot-still-1");
  });

  it("snapshot 302s to the WorldEye frame route; stream-only is a clean 404", async () => {
    const { row, plaintext } = makeKey();
    mocks.findKey.mockResolvedValue(row);
    const snap = await GET_SNAPSHOT(req("/api/v1/cameras/udot-still-1/snapshot", plaintext), {
      params: Promise.resolve({ id: "udot-still-1" }),
    });
    expect(snap.status).toBe(302);
    expect(snap.headers.get("location")).toBe(
      "https://worldeye.app/api/cctv/frame?id=udot-still-1",
    );
    const none = await GET_SNAPSHOT(req("/api/v1/cameras/udot-stream-1/snapshot", plaintext), {
      params: Promise.resolve({ id: "udot-stream-1" }),
    });
    expect(none.status).toBe(404);
    const body = await none.json();
    expect(body.error.code).toBe("snapshot_unavailable");
  });
});

describe("GET /api/v1/usage", () => {
  it("reports tier + quota without consuming quota", async () => {
    const { row, plaintext } = makeKey();
    mocks.findKey.mockResolvedValue(row);
    const res = await GET_USAGE(req("/api/v1/usage", plaintext));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tier).toBe("free");
    expect(body.usage.usedToday).toBe(0);
    expect(mocks.updateKey).not.toHaveBeenCalled();
  });
});
