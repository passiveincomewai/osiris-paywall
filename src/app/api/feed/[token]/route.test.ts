// Feed route pins: the token is the credential (hash lookup); a token
// that was regenerated away is dead; a lapsed Enterprise subscription
// turns the feed off; payload passes through from the shared service.
import { describe, it, expect, vi, beforeEach } from "vitest";

const COLLECTION = {
  id: "col-1",
  userId: "owner-1",
  name: "Ski cams",
  feedTokenHash: "stored-hash",
  feedHits: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mocks = vi.hoisted(() => ({
  byHash: vi.fn(async (_hash: string) => null as null | typeof COLLECTION),
  payload: vi.fn(async () => ({
    ok: true as const,
    payload: { cameras: [{ id: "fdot-1" }], excluded: [{ id: "x", name: "x", reason: "Windy" }] },
  })),
  liveEnt: vi.fn(async () => true),
  hit: vi.fn(async () => undefined),
}));

vi.mock("@/lib/enterprise/service", () => ({
  collectionByTokenHash: mocks.byHash,
  collectionPayload: mocks.payload,
  recordFeedHit: mocks.hit,
}));
vi.mock("@/lib/enterprise/access", () => ({ userHasLiveEnterprise: mocks.liveEnt }));
// The token the route receives must hash to the stored value: pin the
// hash function to a marker so the test controls the mapping.
vi.mock("@/lib/enterprise/tokens", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/enterprise/tokens")>();
  return { ...actual, hashSecret: (s: string) => `H(${s})` };
});

import { GET } from "./route";
import { generateFeedToken } from "@/lib/enterprise/tokens";

let ipSeq = 0;
const get = (token: string) =>
  GET(
    new Request(`https://worldeye.app/api/feed/${token}`, {
      headers: { "x-forwarded-for": `10.1.0.${++ipSeq}` },
    }) as never,
    { params: Promise.resolve({ token }) },
  );

const TOKEN = generateFeedToken();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.byHash.mockImplementation(async (hash: string) =>
    hash === `H(${TOKEN})` ? { ...COLLECTION, feedTokenHash: hash } : null,
  );
  mocks.liveEnt.mockResolvedValue(true);
  mocks.payload.mockResolvedValue({
    ok: true,
    payload: { cameras: [{ id: "fdot-1" }], excluded: [{ id: "x", name: "x", reason: "Windy" }] },
  });
});

describe("GET /api/feed/[token]", () => {
  it("serves the payload for a valid token and counts the hit", async () => {
    const res = await get(TOKEN);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.collection).toEqual({ id: "col-1", name: "Ski cams" });
    expect(body.count).toBe(1);
    expect(body.excludedCount).toBe(1);
    expect(mocks.hit).toHaveBeenCalledWith("col-1");
    expect(res.headers.get("Cache-Control")).toContain("max-age=60");
  });

  it("404s an unknown token", async () => {
    const res = await get(generateFeedToken());
    expect(res.status).toBe(404);
    expect(mocks.hit).not.toHaveBeenCalled();
  });

  it("404s the OLD token after regeneration (the stored hash moved on)", async () => {
    // Simulate regeneration: the collection now stores a different hash.
    mocks.byHash.mockImplementation(async (hash: string) =>
      hash === "H(wef_newtoken)" ? { ...COLLECTION, feedTokenHash: hash } : null,
    );
    const res = await get(TOKEN);
    expect(res.status).toBe(404);
  });

  it("403s when the owner's Enterprise subscription has lapsed", async () => {
    mocks.liveEnt.mockResolvedValue(false);
    const res = await get(TOKEN);
    expect(res.status).toBe(403);
    expect(mocks.payload).not.toHaveBeenCalled();
  });

  it("404s a malformed token without touching the database", async () => {
    const res = await get("not-a-token");
    expect(res.status).toBe(404);
    expect(mocks.byHash).not.toHaveBeenCalled();
  });
});
