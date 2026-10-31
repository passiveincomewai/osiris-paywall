// Smoke pins for the public watch page:
//  - unknown slug → notFound()
//  - revoked share → branded gone page, no video element
//  - live share → player, title, sharer credit, source-camera CTA that
//    rides the sharer's /ref code when the clip resolves to a camera
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  share: null as Record<string, unknown> | null,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/components/watch/WatchBeacon", () => ({ default: () => null }));
vi.mock("@/lib/db", () => ({
  db: {
    clipShare: { findUnique: vi.fn(async () => mocks.share) },
    clipMeta: { findUnique: vi.fn(async () => ({ savedCameraId: "sc-1" })) },
    savedCamera: { findUnique: vi.fn(async () => ({ cameraData: { id: "cam-77", name: "Bay Cam" } })) },
  },
}));

import WatchPage, { generateMetadata } from "./page";

const SLUG = "abc123XYZ_-0";
const SHARE = {
  id: "share-1",
  slug: SLUG,
  title: "Storm over the bay",
  blobUrl: "https://store.public.blob.vercel-storage.com/clip-shares/clip-1/video.webm",
  posterUrl: "https://store.public.blob.vercel-storage.com/clip-shares/clip-1/poster.jpg",
  mimeType: "video/webm",
  durationSec: 65,
  views: 12,
  refCode: "jameson",
  revokedAt: null,
  createdAt: new Date("2026-10-21T12:00:00Z"),
  user: { name: "Jameson" },
};

const params = { params: Promise.resolve({ slug: SLUG }) };

beforeEach(() => {
  mocks.share = { ...SHARE };
});

describe("WatchPage", () => {
  it("renders the player, credit line and a /ref camera CTA for a live share", async () => {
    const html = renderToString(await WatchPage(params)).replace(/<!-- -->/g, "");
    expect(html).toContain("Storm over the bay");
    expect(html).toContain("shared by Jameson");
    expect(html).toContain("12 views");
    expect(html).toContain('src="https://store.public.blob.vercel-storage.com/clip-shares/clip-1/video.webm"');
    expect(html).toContain(`/ref/jameson?camera=cam-77`);
    expect(html).toContain("74,229 live cameras");
  });

  it("serves the branded gone page (and no video) for a revoked share", async () => {
    mocks.share = { ...SHARE, revokedAt: new Date() };
    const html = renderToString(await WatchPage(params)).replace(/<!-- -->/g, "");
    expect(html).toContain("no longer available");
    expect(html).not.toContain("<video");
  });

  it("404s unknown slugs", async () => {
    mocks.share = null;
    await expect(WatchPage(params)).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("generateMetadata", () => {
  it("emits og:video + poster for a live share", async () => {
    const meta = await generateMetadata(params);
    expect(meta.title).toContain("Storm over the bay");
    const og = meta.openGraph as { videos?: { url: string }[]; images?: { url: string }[] };
    expect(og.videos?.[0].url).toBe(SHARE.blobUrl);
    expect(og.images?.[0].url).toBe(SHARE.posterUrl);
  });

  it("keeps valid shares out of the index too (/watch is a viewing surface)", async () => {
    const meta = await generateMetadata(params);
    expect((meta.robots as { index?: boolean })?.index).toBe(false);
    // …while the share's own metadata still renders in full.
    expect(meta.title).toContain("Storm over the bay");
  });

  it("keeps gone shares out of the index", async () => {
    mocks.share = { ...SHARE, revokedAt: new Date() };
    const meta = await generateMetadata(params);
    expect((meta.robots as { index?: boolean })?.index).toBe(false);
    expect((meta.openGraph as { videos?: unknown[] })?.videos).toBeUndefined();
  });
});
