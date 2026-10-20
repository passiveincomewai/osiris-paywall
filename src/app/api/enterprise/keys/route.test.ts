// API key management pins: creation returns the plaintext ONCE and
// stores only its hash; lists carry prefixes, never secrets; revoking
// another customer's key is a 404.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(async () => ({ ok: true, userId: "owner-1", enterprise: true }) as unknown),
  findMany: vi.fn(async () => [] as unknown[]),
  count: vi.fn(async () => 0),
  create: vi.fn(async ({ data }: { data: Record<string, string> }) => ({
    id: "key-1",
    name: data.name,
    keyPrefix: data.keyPrefix,
    createdAt: new Date(),
  })),
  findFirst: vi.fn(async () => null as null | { id: string; userId: string; revokedAt: Date | null }),
  update: vi.fn(async () => ({})),
}));

vi.mock("@/lib/enterprise/access", () => ({ enterpriseAccess: mocks.access }));
vi.mock("@/lib/db", () => ({
  db: {
    enterpriseApiKey: {
      findMany: mocks.findMany,
      count: mocks.count,
      create: mocks.create,
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}));

import { GET, POST } from "./route";
import { DELETE as REVOKE } from "./[id]/route";
import { hashSecret, looksLikeApiKey } from "@/lib/enterprise/tokens";

const post = (body: unknown) =>
  POST(
    new Request("https://worldeye.app/api/enterprise/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ ok: true, userId: "owner-1", enterprise: true });
  mocks.count.mockResolvedValue(0);
  mocks.findMany.mockResolvedValue([]);
});

describe("/api/enterprise/keys", () => {
  it("creates a key: plaintext once, hash at rest", async () => {
    const res = await post({ name: "production" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(looksLikeApiKey(body.key)).toBe(true);
    const stored = (mocks.create.mock.calls[0] as [{ data: { keyHash: string; keyPrefix: string } }])[0].data;
    expect(stored.keyHash).toBe(hashSecret(body.key));
    expect(stored.keyHash).not.toBe(body.key);
    expect(body.key.startsWith(stored.keyPrefix)).toBe(true);
  });

  it("lists prefixes and usage only — no hashes, no secrets", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "key-1",
        name: "production",
        keyPrefix: "wek_Ab3dEf7h",
        hits: 12,
        lastUsedAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      },
    ]);
    const res = await GET();
    const body = await res.json();
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0].keyPrefix).toBe("wek_Ab3dEf7h");
    expect(JSON.stringify(body)).not.toContain("keyHash");
  });

  it("revokes the owner's key; another customer's key is a 404", async () => {
    mocks.findFirst.mockImplementation(async ({ where }: { where: { id: string; userId: string } }) =>
      where.id === "key-1" && where.userId === "owner-1"
        ? { id: "key-1", userId: "owner-1", revokedAt: null }
        : null,
    );
    const ok = await REVOKE(new Request("https://worldeye.app") as never, {
      params: Promise.resolve({ id: "key-1" }),
    });
    expect(ok.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "key-1" } }),
    );
    const notMine = await REVOKE(new Request("https://worldeye.app") as never, {
      params: Promise.resolve({ id: "key-of-someone-else" }),
    });
    expect(notMine.status).toBe(404);
  });
});
