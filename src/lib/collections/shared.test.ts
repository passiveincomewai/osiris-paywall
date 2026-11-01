import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(async () => 0),
  create: vi.fn(),
  findMany: vi.fn(async () => [] as unknown[]),
  findFirst: vi.fn(async () => null as unknown),
  findUnique: vi.fn(async () => null as unknown),
  update: vi.fn(),
  deleteMany: vi.fn(async () => ({ count: 1 })),
  itemCreate: vi.fn(async () => ({})),
  itemDeleteMany: vi.fn(async () => ({ count: 1 })),
  itemUpdateMany: vi.fn(async () => ({ count: 1 })),
  catalogue: vi.fn(async () => null as Map<string, unknown> | null),
}));

vi.mock("@/lib/db", () => ({
  db: {
    sharedCollection: {
      count: mocks.count,
      create: mocks.create,
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      findUnique: mocks.findUnique,
      update: mocks.update,
      deleteMany: mocks.deleteMany,
    },
    sharedCollectionItem: {
      create: mocks.itemCreate,
      deleteMany: mocks.itemDeleteMany,
      updateMany: mocks.itemUpdateMany,
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));

vi.mock("@/lib/enterprise/catalogue", () => ({
  enterpriseCatalogueById: mocks.catalogue,
}));

import {
  CollectionError,
  MAX_CAMERAS_PER_COLLECTION,
  MAX_COLLECTIONS_PER_USER,
  addCamera,
  cleanDescription,
  cleanTitle,
  createCollection,
  generateSlug,
  reorderCameras,
  resolveEmbedCollection,
  slugifyTitle,
} from "./shared";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.count.mockResolvedValue(0);
  mocks.findFirst.mockResolvedValue(null);
  mocks.findUnique.mockResolvedValue(null);
  mocks.catalogue.mockResolvedValue(null);
  mocks.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "col-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }));
});

describe("slugs", () => {
  it("slugifies titles to url-safe bases", () => {
    expect(slugifyTitle("Best Ski Cameras!")).toBe("best-ski-cameras");
    expect(slugifyTitle("Tokyo — Live Views")).toBe("tokyo-live-views");
    expect(slugifyTitle("!!!")).toBe("collection");
  });

  it("mints unique slugs with a random suffix", () => {
    const a = generateSlug("Storm Monitoring");
    const b = generateSlug("Storm Monitoring");
    expect(a).toMatch(/^storm-monitoring-[a-z0-9]{6}$/);
    expect(b).toMatch(/^storm-monitoring-[a-z0-9]{6}$/);
    expect(a).not.toBe(b);
  });
});

describe("input hygiene", () => {
  it("requires a title and trims it", () => {
    expect(cleanTitle("  My Cams  ")).toBe("My Cams");
    expect(() => cleanTitle("   ")).toThrow(CollectionError);
    expect(() => cleanTitle(42)).toThrow(CollectionError);
  });

  it("treats an empty description as none and caps its length", () => {
    expect(cleanDescription("  ")).toBeNull();
    expect(cleanDescription(undefined)).toBeNull();
    expect(() => cleanDescription("x".repeat(281))).toThrow(CollectionError);
  });
});

describe("createCollection caps", () => {
  it("refuses a new collection at the per-user cap", async () => {
    mocks.count.mockResolvedValue(MAX_COLLECTIONS_PER_USER);
    await expect(createCollection("u1", { title: "One more" })).rejects.toMatchObject({
      status: 409,
      code: "collection_limit",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates under the cap with a minted slug", async () => {
    const c = await createCollection("u1", { title: "Best Ski Cameras" });
    expect(c.slug).toMatch(/^best-ski-cameras-[a-z0-9]{6}$/);
    expect(c.cameraCount).toBe(0);
  });
});

describe("addCamera", () => {
  const owned = (items: { cameraId: string; position: number }[]) => ({
    id: "col-1",
    userId: "u1",
    items,
  });

  it("404s a collection the caller doesn't own", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(addCamera("u1", "col-x", "cam-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("rejects a camera id that isn't in the catalogue", async () => {
    mocks.findFirst.mockResolvedValue(owned([]));
    mocks.catalogue.mockResolvedValue(new Map());
    await expect(addCamera("u1", "col-1", "not-a-camera")).rejects.toMatchObject({
      status: 400,
      code: "unknown_camera",
    });
    expect(mocks.itemCreate).not.toHaveBeenCalled();
  });

  it("adds at the next position and is idempotent", async () => {
    mocks.findFirst.mockResolvedValue(owned([{ cameraId: "cam-a", position: 0 }]));
    mocks.catalogue.mockResolvedValue(
      new Map([["cam-b", { id: "cam-b" }]]),
    );
    const added = await addCamera("u1", "col-1", "cam-b");
    expect(added).toEqual({ cameraId: "cam-b", position: 1, alreadyPresent: false });
    const dupe = await addCamera("u1", "col-1", "cam-a");
    expect(dupe.alreadyPresent).toBe(true);
    expect(mocks.itemCreate).toHaveBeenCalledTimes(1);
  });

  it("refuses adds at the per-collection camera cap", async () => {
    const items = Array.from({ length: MAX_CAMERAS_PER_COLLECTION }, (_, i) => ({
      cameraId: `cam-${i}`,
      position: i,
    }));
    mocks.findFirst.mockResolvedValue(owned(items));
    await expect(addCamera("u1", "col-1", "cam-new")).rejects.toMatchObject({
      status: 409,
      code: "camera_limit",
    });
  });
});

describe("reorderCameras", () => {
  it("requires exactly the collection's own ids, each once", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "col-1",
      userId: "u1",
      items: [
        { cameraId: "a", position: 0 },
        { cameraId: "b", position: 1 },
      ],
    });
    await expect(reorderCameras("u1", "col-1", ["b", "a"])).resolves.toBeUndefined();
    await expect(reorderCameras("u1", "col-1", ["a", "a"])).rejects.toMatchObject({
      status: 400,
    });
    await expect(reorderCameras("u1", "col-1", ["a", "zzz"])).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe("resolveEmbedCollection — the rights gate", () => {
  it("carries only registry-cleared, playable cameras", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "col-1",
      title: "Mixed",
      description: null,
      slug: "mixed-x1",
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { name: null },
      items: [
        { cameraId: "cam-clear", position: 0 },
        { cameraId: "cam-windy", position: 1 },
        { cameraId: "cam-gone", position: 2 },
      ],
    });
    mocks.catalogue.mockResolvedValue(
      new Map<string, unknown>([
        [
          "cam-clear",
          {
            id: "cam-clear",
            name: "Clear Cam",
            source: "Alberta 511",
            feed_url: "https://example.com/clear.jpg",
            stream_type: "jpg",
          },
        ],
        [
          "cam-windy",
          {
            id: "cam-windy",
            name: "Windy Cam",
            source: "Windy Webcams",
            feed_url: "https://example.com/windy.jpg",
            stream_type: "jpg",
          },
        ],
      ]),
    );
    const embed = await resolveEmbedCollection("mixed-x1", "https://worldeye.app");
    expect(embed).not.toBeNull();
    expect(embed!.cameras.map((c) => c.id)).toEqual(["cam-clear"]);
    expect(embed!.totalCameras).toBe(3);
  });

  it("returns null for an unknown slug", async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect(await resolveEmbedCollection("nope", "https://worldeye.app")).toBeNull();
  });
});
