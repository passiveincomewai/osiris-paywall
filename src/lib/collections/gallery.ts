/**
 * Featured-collections gallery — the read side of /collections.
 *
 * Shareable collections have no visibility flag by design: every
 * SharedCollection is a public share page (/collections/<slug>) and
 * management is owner-scoped. This module lists them for the public
 * gallery. Curation rule (also stated on the page): collections with
 * at least one camera, ordered by camera count descending, then most
 * recently updated — both are real fields on the schema, so the order
 * is defensible and needs no editorial state.
 *
 * Resolution mirrors resolvePublicCollection: names/stills come from
 * the live catalogue at read time (toFeedCamera); nothing about a
 * camera is snapshotted into the collection. The cover is the FIRST
 * camera's own snapshot — when it cannot be resolved the card renders
 * an honest placeholder, never a substitute image.
 */
import { db } from "@/lib/db";
import { enterpriseCatalogueById } from "@/lib/enterprise/catalogue";
import { toFeedCamera } from "@/lib/enterprise/payload";

export const MAX_GALLERY_COLLECTIONS = 60;

export interface GalleryCollection {
  slug: string;
  title: string;
  description: string | null;
  /** Owner display name, only when the owner has one set. */
  ownerName: string | null;
  cameraCount: number;
  /** First camera's live snapshot URL, or null when unresolvable. */
  coverSnapshotUrl: string | null;
  /** First camera's catalogue name (cover alt text), or null. */
  coverName: string | null;
  updatedAt: Date;
}

/**
 * Returns the gallery list, or null when the read failed (the page
 * renders an "unavailable" state for null and a "none yet" state for
 * an empty array — the two are never conflated).
 */
export async function listGalleryCollections(
  origin: string,
): Promise<GalleryCollection[] | null> {
  let rows: Array<{
    slug: string;
    title: string;
    description: string | null;
    updatedAt: Date;
    user: { name: string | null } | null;
    items: Array<{ cameraId: string }>;
    _count: { items: number };
  }>;
  try {
    rows = await db.sharedCollection.findMany({
      where: { items: { some: {} } },
      orderBy: [{ items: { _count: "desc" } }, { updatedAt: "desc" }],
      take: MAX_GALLERY_COLLECTIONS,
      include: {
        _count: { select: { items: true } },
        items: { orderBy: { position: "asc" }, take: 1 },
        user: { select: { name: true } },
      },
    });
  } catch {
    return null;
  }

  const byId = await enterpriseCatalogueById().catch(() => null);

  return rows.map((row) => {
    const firstId = row.items[0]?.cameraId;
    const raw = firstId ? byId?.get(firstId) : undefined;
    const feed = raw ? toFeedCamera(raw, origin) : null;
    const ownerName = row.user?.name?.trim() ? row.user.name.trim() : null;
    return {
      slug: row.slug,
      title: row.title,
      description: row.description,
      ownerName,
      cameraCount: row._count.items,
      coverSnapshotUrl: feed?.snapshotUrl ?? null,
      coverName: feed?.name ?? null,
      updatedAt: row.updatedAt,
    };
  });
}
