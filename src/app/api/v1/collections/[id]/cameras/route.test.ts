// API door pins: Bearer wek_ keys authenticate; revoked keys die at
// once; a key reads ONLY its owner's collections (anyone else's is a
// 404); successful reads count against the key.
import { describe, it, expect, vi, beforeEach } from "vitest";

const KEY_ROW = {
  id: "key-1",
  userId: "owner-1",
  name: "prod",
  keyPrefix: "wek_Ab3dEf7h",
  keyHash: "stored",
  hits: 0,
  lastUsedAt: null,
  revokedAt: null as Date | null,
  createdAt: new Date(),
};
const COLLECTION = { id: "col-1", userId: "owner-1", name: "Ski cams" };

const mocks = vi.hoisted(() => ({
  findKey: vi.fn(
    async (_args: { where: { keyHash: string } }) => null as null | typeof KEY_ROW,
  ),
  findCollection: vi.fn(async () => null as null | typeof COLLECTION),
  updateKey: vi.fn(async () => ({})),
  payload: vi.fn(async () => ({
    ok: true as const,
    payload: { cameras: [{ id: "fdot-1" }], excluded: [] as unknown[] },
  })),
  liveEnt: vi.fn(async () => true),
}));

vi.mock("@/lib/db", () => ({
  db: {
    enterpriseApiKey: { findUnique: mocks.findKey, update: mocks.updateKey },
    cameraCollection: { findFirst: mocks.findCollection },
  },
}));
vi.mock("@/lib/enterprise/service", () => ({ collectionPayload: mocks.payload }));
vi.mock("@/lib/enterprise/access", () => ({ userHasLiveEnterprise: mocks.liveEnt }));
vi.mock("@/lib/enterprise/tokens", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/enterprise/tokens")>();
  return { ...actual, hashSecret: (s: string) => `H(${s})` };
});

import { GET } from "./route";
import { generateApiKey } from "@/lib/enterprise/tokens";

const { key: API_KEY } = generateApiKey();
let ipSeq = 0;
const get = (id: string, headers: Record<string, string> = {}) =>
  GET(
    new Request(`https://worldeye.app/api/v1/collections/${id}/cameras`, {
      headers: { "x-forwarded-for": `10.2.0.${++ipSeq}`, ...headers },
    }) as never,
    { params: Promise.resolve({ id }) },
  );
const bearer = { Authorization: `Bearer ${API_KEY}` };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findKey.mockImplementation(async ({ where }: { where: { keyHash: string } }) =>
    where.keyHash === `H(${API_KEY})` ? { ...KEY_ROW, keyHash: where.keyHash } : null,
  );
  mocks.findCollection.mockResolvedValue({ ...COLLECTION });
  mocks.liveEnt.mockResolvedValue(true);
  mocks.payload.mockResolvedValue({
    ok: true,
    payload: { cameras: [{ id: "fdot-1" }], excluded: [] },
  });
});

describe("GET /api/v1/collections/[id]/cameras", () => {
  it("serves the payload for a valid key and counts the hit", async () => {
    const res = await get("col-1", bearer);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(mocks.updateKey).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "key-1" } }),
    );
  });

  it("also accepts X-Api-Key", async () => {
    const res = await get("col-1", { "X-Api-Key": API_KEY });
    expect(res.status).toBe(200);
  });

  it("401s with no key, a malformed key, and an unknown key", async () => {
    expect((await get("col-1")).status).toBe(401);
    expect((await get("col-1", { Authorization: "Bearer nope" })).status).toBe(401);
    expect((await get("col-1", { Authorization: `Bearer ${generateApiKey().key}` })).status).toBe(401);
  });

  it("401s a revoked key", async () => {
    mocks.findKey.mockImplementation(async ({ where }: { where: { keyHash: string } }) =>
      where.keyHash === `H(${API_KEY})`
        ? { ...KEY_ROW, keyHash: where.keyHash, revokedAt: new Date() }
        : null,
    );
    const res = await get("col-1", bearer);
    expect(res.status).toBe(401);
    expect(mocks.payload).not.toHaveBeenCalled();
  });

  it("404s another owner's collection (the lookup is owner-scoped)", async () => {
    mocks.findCollection.mockResolvedValue(null); // scoped findFirst finds nothing for owner-1
    const res = await get("col-of-someone-else", bearer);
    expect(res.status).toBe(404);
    expect(mocks.findCollection).toHaveBeenCalledWith({
      where: { id: "col-of-someone-else", userId: "owner-1" },
    });
  });

  it("403s when the key owner's Enterprise subscription has lapsed", async () => {
    mocks.liveEnt.mockResolvedValue(false);
    const res = await get("col-1", bearer);
    expect(res.status).toBe(403);
  });
});
