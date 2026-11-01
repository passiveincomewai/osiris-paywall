// Shareable collections API pins: the sign-in gate (any account,
// free included — no tier), create validation, and the list shape.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(async () => ({ ok: true, userId: "owner-1" }) as unknown),
  count: vi.fn(async () => 0),
  create: vi.fn(),
  findMany: vi.fn(async () => [] as unknown[]),
}));

vi.mock("@/lib/collections/access", () => ({
  sharedCollectionsAccess: mocks.access,
}));
vi.mock("@/lib/db", () => ({
  db: {
    sharedCollection: {
      count: mocks.count,
      create: mocks.create,
      findMany: mocks.findMany,
    },
    sharedCollectionItem: {},
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));
vi.mock("@/lib/enterprise/catalogue", () => ({
  enterpriseCatalogueById: vi.fn(async () => null),
}));

import { GET, POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("https://worldeye.app/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ ok: true, userId: "owner-1" });
  mocks.count.mockResolvedValue(0);
  mocks.findMany.mockResolvedValue([]);
  mocks.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "col-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }));
});

describe("/api/collections", () => {
  it("401s signed-out callers on every verb", async () => {
    mocks.access.mockResolvedValue({ ok: false });
    expect((await GET()).status).toBe(401);
    expect((await post({ title: "X" })).status).toBe(401);
  });

  it("lists the caller's collections", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ collections: [] });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "owner-1" } }),
    );
  });

  it("creates with a minted slug and answers 201", async () => {
    const res = await post({ title: "Tokyo Live Views", description: "City cams" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.collection.title).toBe("Tokyo Live Views");
    expect(body.collection.slug).toMatch(/^tokyo-live-views-[a-z0-9]{6}$/);
  });

  it("maps a missing title to a 400, not a 500", async () => {
    const res = await post({ title: "   " });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("title_required");
  });
});
