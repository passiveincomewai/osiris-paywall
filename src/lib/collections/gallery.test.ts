import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(async () => [] as unknown[]),
  catalogue: vi.fn(async () => null as Map<string, unknown> | null),
}));

vi.mock("@/lib/db", () => ({
  db: {
    sharedCollection: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock("@/lib/enterprise/catalogue", () => ({
  enterpriseCatalogueById: mocks.catalogue,
}));

import { listGalleryCollections } from "./gallery";

const ORIGIN = "https://worldeye.app";

function row(overrides: Record<string, unknown> = {}) {
  return {
    slug: "ski-cams-ab12cd",
    title: "Ski Cams",
    description: "Best ski cameras",
    updatedAt: new Date("2026-11-01T00:00:00Z"),
    user: { name: "Alex" },
    items: [{ cameraId: "cam-1" }],
    _count: { items: 3 },
    ...overrides,
  };
}

describe("listGalleryCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.catalogue.mockResolvedValue(null);
  });

  it("queries only collections that have at least one camera, largest first", async () => {
    await listGalleryCollections(ORIGIN);
    const args = (mocks.findMany.mock.calls as unknown[][])[0]?.[0] as {
      where: unknown;
      orderBy: unknown;
    };
    expect(args.where).toEqual({ items: { some: {} } });
    expect(args.orderBy).toEqual([
      { items: { _count: "desc" } },
      { updatedAt: "desc" },
    ]);
  });

  it("maps rows and resolves the cover from the catalogue", async () => {
    mocks.findMany.mockResolvedValue([row()]);
    mocks.catalogue.mockResolvedValue(
      new Map([
        [
          "cam-1",
          {
            id: "cam-1",
            name: "Vail Pass",
            city: "Vail",
            country: "United States",
            feed_url: "https://example.com/vail.jpg",
            stream_type: "jpg",
            source: "cdot",
          },
        ],
      ]),
    );
    const out = await listGalleryCollections(ORIGIN);
    expect(out).toHaveLength(1);
    expect(out?.[0]).toMatchObject({
      slug: "ski-cams-ab12cd",
      title: "Ski Cams",
      ownerName: "Alex",
      cameraCount: 3,
      coverName: "Vail Pass",
    });
    expect(out?.[0]?.coverSnapshotUrl).toContain("/api/cctv/frame");
  });

  it("falls back to a null cover when the camera no longer resolves", async () => {
    mocks.findMany.mockResolvedValue([row()]);
    mocks.catalogue.mockResolvedValue(new Map());
    const out = await listGalleryCollections(ORIGIN);
    expect(out?.[0]?.coverSnapshotUrl).toBeNull();
    expect(out?.[0]?.coverName).toBeNull();
  });

  it("hides the owner name when the owner has none set", async () => {
    mocks.findMany.mockResolvedValue([row({ user: { name: "  " } })]);
    const out = await listGalleryCollections(ORIGIN);
    expect(out?.[0]?.ownerName).toBeNull();
  });

  it("returns an empty array when there are no collections", async () => {
    const out = await listGalleryCollections(ORIGIN);
    expect(out).toEqual([]);
  });

  it("returns null when the database read fails", async () => {
    mocks.findMany.mockRejectedValue(new Error("db down"));
    const out = await listGalleryCollections(ORIGIN);
    expect(out).toBeNull();
  });
});
