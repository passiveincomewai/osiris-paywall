import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
  clip: null as Record<string, unknown> | null,
  activeCount: 0,
  created: [] as Record<string, unknown>[],
  shareCode: { code: "jameson", kind: "affiliate" } as { code: string; kind: string } | null,
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => mocks.session) }));
vi.mock("@/lib/share/identity", () => ({
  getShareCodeForUser: vi.fn(async () => mocks.shareCode),
}));
vi.mock("@/lib/db", () => ({
  db: {
    clipMeta: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) =>
        mocks.clip && mocks.clip.id === where.id && mocks.clip.userId === where.userId ? mocks.clip : null,
      ),
    },
    clipShare: {
      count: vi.fn(async () => mocks.activeCount),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: "share-1",
          posterUrl: null,
          views: 0,
          revokedAt: null,
          createdAt: new Date("2026-10-21T12:00:00Z"),
          ...data,
        };
        mocks.created.push(row);
        return row;
      }),
    },
  },
}));

import { GET, POST } from "./route";

const BLOB = "https://store.public.blob.vercel-storage.com/clip-shares/clip-1/video.webm";
const CLIP = {
  id: "clip-1",
  userId: "user-1",
  cameraName: "Beach Cam",
  startedAt: new Date("2026-10-20T10:00:00Z"),
  durationSec: 42,
  sizeBytes: 5_000_000,
  mimeType: "video/webm",
};

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/share/clips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
  mocks.session = { user: { id: "user-1" } };
  mocks.clip = { ...CLIP };
  mocks.activeCount = 0;
  mocks.created = [];
  mocks.shareCode = { code: "jameson", kind: "affiliate" };
});
afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

describe("POST /api/share/clips", () => {
  it("creates a share for the owner's clip and captures their referral code", async () => {
    const res = await post({ clipId: "clip-1", blobUrl: BLOB, title: "Storm watch" });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.share.title).toBe("Storm watch");
    expect(j.share.url).toContain("/watch/");
    expect(mocks.created).toHaveLength(1);
    expect(mocks.created[0].refCode).toBe("jameson");
    expect(mocks.created[0].userId).toBe("user-1");
  });

  it("defaults the title from clip metadata", async () => {
    const res = await post({ clipId: "clip-1", blobUrl: BLOB });
    const j = await res.json();
    expect(j.share.title).toContain("Beach Cam");
  });

  it("refuses signed-out callers", async () => {
    mocks.session = null;
    const res = await post({ clipId: "clip-1", blobUrl: BLOB });
    expect(res.status).toBe(401);
    expect(mocks.created).toHaveLength(0);
  });

  it("refuses a clip the caller does not own", async () => {
    mocks.clip = { ...CLIP, userId: "someone-else" };
    const res = await post({ clipId: "clip-1", blobUrl: BLOB });
    expect(res.status).toBe(404);
    expect(mocks.created).toHaveLength(0);
  });

  it("fails honestly when blob storage is not configured", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = await post({ clipId: "clip-1", blobUrl: BLOB });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("sharing_unavailable");
    expect(mocks.created).toHaveLength(0);
  });

  it("rejects blob URLs that are not this clip's own upload", async () => {
    const res = await post({
      clipId: "clip-1",
      blobUrl: "https://store.public.blob.vercel-storage.com/clip-shares/clip-999/video.webm",
    });
    expect(res.status).toBe(400);
    const res2 = await post({ clipId: "clip-1", blobUrl: "https://evil.example.com/x.mp4" });
    expect(res2.status).toBe(400);
    expect(mocks.created).toHaveLength(0);
  });

  it("rejects clips over the hosted-share size cap", async () => {
    mocks.clip = { ...CLIP, sizeBytes: 250_000_000 };
    const res = await post({ clipId: "clip-1", blobUrl: BLOB });
    expect(res.status).toBe(413);
  });

  it("enforces the active-share cap", async () => {
    mocks.activeCount = 50;
    const res = await post({ clipId: "clip-1", blobUrl: BLOB });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("share_limit");
  });

  it("stores a null refCode when the owner has no share code", async () => {
    mocks.shareCode = null;
    const res = await post({ clipId: "clip-1", blobUrl: BLOB });
    expect(res.status).toBe(200);
    expect(mocks.created[0].refCode).toBeNull();
  });
});

describe("GET /api/share/clips", () => {
  it("reports the configured flag and requires sign-in", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).configured).toBe(true);
    mocks.session = null;
    expect((await GET()).status).toBe(401);
  });
});
