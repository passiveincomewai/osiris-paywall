// Key-management pins: dark with the platform (404 while the flag is
// off), session-gated, and a created key is stored hashed + scoped
// "public" with the plaintext returned exactly once (in the POST).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string } } | null),
  findMany: vi.fn(async () => [] as unknown[]),
  count: vi.fn(async () => 0),
  create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
    id: "key-new",
    name: args.data.name,
    keyPrefix: args.data.keyPrefix,
    createdAt: new Date(),
  })),
  updateMany: vi.fn(
    async (_args: { where: Record<string, unknown>; data: Record<string, unknown> }) => ({
      count: 1,
    }),
  ),
  findSub: vi.fn(async () => null as null | {
    status: string;
    currentPeriodEnd: Date;
    stripePriceId: string;
  }),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    enterpriseApiKey: {
      findMany: mocks.findMany,
      count: mocks.count,
      create: mocks.create,
      updateMany: mocks.updateMany,
    },
    subscription: { findUnique: mocks.findSub },
  },
}));

import { GET, POST } from "./route";
import { DELETE } from "./[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PUBLIC_API_ENABLED = "1";
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.findMany.mockResolvedValue([]);
  mocks.count.mockResolvedValue(0);
  mocks.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    id: "key-new",
    name: args.data.name,
    keyPrefix: args.data.keyPrefix,
    createdAt: new Date(),
  }));
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.findSub.mockResolvedValue(null);
});

afterEach(() => {
  delete process.env.PUBLIC_API_ENABLED;
});

describe("/api/developer/keys", () => {
  it("404s while the flag is off", async () => {
    delete process.env.PUBLIC_API_ENABLED;
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("401s without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST creates a hashed, public-scoped key and returns the plaintext once", async () => {
    const req = new NextRequest("https://worldeye.app/api/developer/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My dashboard" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.key).toBe("string");
    expect(body.key.startsWith("wek_")).toBe(true);

    expect(mocks.create).toHaveBeenCalledTimes(1);
    const stored = mocks.create.mock.calls[0][0].data;
    expect(stored.scope).toBe("public");
    expect(stored.userId).toBe("user-1");
    // Stored value is the hash, never the plaintext.
    expect(stored.keyHash).not.toBe(body.key);
    expect(String(stored.keyHash)).toHaveLength(64);
  });

  it("DELETE revokes only the caller's own public key", async () => {
    const req = new NextRequest("https://worldeye.app/api/developer/keys/key-9", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "key-9" }) });
    expect(res.status).toBe(200);
    const where = mocks.updateMany.mock.calls[0][0].where as Record<string, unknown>;
    expect(where).toMatchObject({ id: "key-9", userId: "user-1", scope: "public" });
  });
});
