import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
  share: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  deletedUrls: [] as string[],
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => mocks.session) }));
vi.mock("@vercel/blob", () => ({
  del: vi.fn(async (urls: string | string[]) => {
    mocks.deletedUrls.push(...(Array.isArray(urls) ? urls : [urls]));
  }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    clipShare: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) =>
        mocks.share && mocks.share.id === where.id && mocks.share.userId === where.userId ? mocks.share : null,
      ),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        mocks.updates.push(data);
        return { ...mocks.share, ...data };
      }),
    },
  },
}));

import { PATCH, DELETE } from "./route";

const SHARE = {
  id: "share-1",
  userId: "user-1",
  title: "Old title",
  blobUrl: "https://store.public.blob.vercel-storage.com/clip-shares/clip-1/video.webm",
  posterUrl: "https://store.public.blob.vercel-storage.com/clip-shares/clip-1/poster.jpg",
  revokedAt: null,
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/api/share/clips/share-1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
  mocks.session = { user: { id: "user-1" } };
  mocks.share = { ...SHARE };
  mocks.updates = [];
  mocks.deletedUrls = [];
});
afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

describe("PATCH /api/share/clips/[id]", () => {
  it("lets the owner retitle their share", async () => {
    const res = await PATCH(req("PATCH", { title: "New title" }), params("share-1"));
    expect(res.status).toBe(200);
    expect(mocks.updates[0].title).toBe("New title");
  });

  it("404s for a non-owner (existence is never confirmed)", async () => {
    mocks.share = { ...SHARE, userId: "someone-else" };
    const res = await PATCH(req("PATCH", { title: "Hijack" }), params("share-1"));
    expect(res.status).toBe(404);
    expect(mocks.updates).toHaveLength(0);
  });

  it("401s signed-out", async () => {
    mocks.session = null;
    expect((await PATCH(req("PATCH", { title: "X" }), params("share-1"))).status).toBe(401);
  });
});

describe("DELETE /api/share/clips/[id] (revoke)", () => {
  it("stamps revokedAt and deletes the hosted files", async () => {
    const res = await DELETE(req("DELETE"), params("share-1"));
    expect(res.status).toBe(200);
    expect(mocks.updates[0].revokedAt).toBeInstanceOf(Date);
    expect(mocks.deletedUrls).toEqual([SHARE.blobUrl, SHARE.posterUrl]);
  });

  it("refuses non-owners and deletes nothing", async () => {
    mocks.share = { ...SHARE, userId: "someone-else" };
    const res = await DELETE(req("DELETE"), params("share-1"));
    expect(res.status).toBe(404);
    expect(mocks.updates).toHaveLength(0);
    expect(mocks.deletedUrls).toHaveLength(0);
  });

  it("is idempotent on an already-revoked share", async () => {
    mocks.share = { ...SHARE, revokedAt: new Date() };
    const res = await DELETE(req("DELETE"), params("share-1"));
    expect(res.status).toBe(200);
    expect(mocks.updates).toHaveLength(0);
    expect(mocks.deletedUrls).toHaveLength(0);
  });
});
