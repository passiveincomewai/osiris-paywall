import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
  clipOwner: null as string | null,
  handleUploadOpts: null as {
    onBeforeGenerateToken: (pathname: string) => Promise<Record<string, unknown>>;
  } | null,
  handleUploadCalls: 0,
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => mocks.session) }));
vi.mock("@vercel/blob/client", () => ({
  handleUpload: vi.fn(async (opts: never) => {
    mocks.handleUploadCalls++;
    mocks.handleUploadOpts = opts;
    return { type: "blob.generate-client-token", clientToken: "tok" };
  }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    clipMeta: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) =>
        mocks.clipOwner === where.userId ? { id: where.id } : null,
      ),
    },
  },
}));

import { POST } from "./route";

function tokenReq() {
  return new NextRequest("http://localhost/api/share/upload-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "blob.generate-client-token", payload: {} }),
  });
}

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
  mocks.session = { user: { id: "user-1" } };
  mocks.clipOwner = "user-1";
  mocks.handleUploadOpts = null;
  mocks.handleUploadCalls = 0;
});
afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

describe("POST /api/share/upload-token", () => {
  it("503s honestly when blob storage is not configured", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = await POST(tokenReq());
    expect(res.status).toBe(503);
    expect(mocks.handleUploadCalls).toBe(0);
  });

  it("issues constraints bound to the owner + clip for a valid pathname", async () => {
    const res = await POST(tokenReq());
    expect(res.status).toBe(200);
    const out = await mocks.handleUploadOpts!.onBeforeGenerateToken("clip-shares/clip-1/video.webm");
    expect(out.maximumSizeInBytes).toBe(200_000_000);
    expect(out.allowedContentTypes).toContain("video/webm");
    expect(JSON.parse(out.tokenPayload as string)).toEqual({ userId: "user-1", clipId: "clip-1" });
  });

  it("refuses to mint a token when signed out", async () => {
    mocks.session = null;
    await POST(tokenReq());
    await expect(mocks.handleUploadOpts!.onBeforeGenerateToken("clip-shares/clip-1/video.webm")).rejects.toThrow();
  });

  it("refuses pathnames outside the caller's own clip prefix", async () => {
    await POST(tokenReq());
    await expect(mocks.handleUploadOpts!.onBeforeGenerateToken("other/clip-1/video.webm")).rejects.toThrow();
    mocks.clipOwner = "someone-else";
    await expect(mocks.handleUploadOpts!.onBeforeGenerateToken("clip-shares/clip-1/video.webm")).rejects.toThrow();
  });
});
