// Dashboard collections pins: the tier gate (401 signed out, 403 Pro),
// and create/list scoped to the signed-in enterprise customer.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(async () => ({ ok: true, userId: "owner-1", enterprise: true }) as unknown),
  findMany: vi.fn(async () => [] as unknown[]),
  count: vi.fn(async () => 0),
  create: vi.fn(async ({ data }: { data: { userId: string; name: string } }) => ({
    id: "col-new",
    ...data,
    feedTokenHash: null,
    feedHits: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
}));

vi.mock("@/lib/enterprise/access", () => ({ enterpriseAccess: mocks.access }));
vi.mock("@/lib/db", () => ({
  db: {
    cameraCollection: { findMany: mocks.findMany, count: mocks.count, create: mocks.create },
  },
}));

import { GET, POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("https://worldeye.app/api/enterprise/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ ok: true, userId: "owner-1", enterprise: true });
  mocks.findMany.mockResolvedValue([]);
  mocks.count.mockResolvedValue(0);
});

describe("/api/enterprise/collections", () => {
  it("401s signed-out callers", async () => {
    mocks.access.mockResolvedValue({ ok: false });
    expect((await GET()).status).toBe(401);
    expect((await post({ name: "X" })).status).toBe(401);
  });

  it("403s signed-in non-enterprise (Pro) customers", async () => {
    mocks.access.mockResolvedValue({ ok: true, userId: "pro-1", enterprise: false });
    const res = await GET();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("enterprise");
    expect((await post({ name: "X" })).status).toBe(403);
  });

  it("lists only the owner's collections", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "col-1",
        name: "Mine",
        feedTokenHash: "hash",
        feedHits: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { items: 3 },
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.collections).toHaveLength(1);
    expect(body.collections[0]).toMatchObject({ id: "col-1", itemCount: 3, feedActive: true, feedHits: 7 });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "owner-1" } }),
    );
  });

  it("creates a collection for the owner and requires a name", async () => {
    const res = await post({ name: "  Ski cams  " });
    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({ data: { userId: "owner-1", name: "Ski cams" } });
    expect((await post({ name: "   " })).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });
});
