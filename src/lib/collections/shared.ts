/**
 * Shareable camera collections — the visitor feature's data layer.
 *
 * A signed-in visitor curates catalogue cameras into a themed
 * collection with a public page (/collections/<slug>) and a
 * rights-gated embed (/embed/collection/<slug>). This module owns
 * the invariants the routes and pages share:
 *
 *  - Ownership: every mutation is scoped by the owner's userId in
 *    the query itself, so a collection that isn't yours is
 *    indistinguishable from one that doesn't exist.
 *  - Membership is catalogue ids only, validated against the live
 *    catalogue before a row is written — a collection can never
 *    reference an invented camera.
 *  - Resolution happens at read time: names/stills come from the
 *    catalogue (toFeedCamera), and the embed verdict comes from the
 *    rights registry via toPublicEmbedCamera — the exact rule the
 *    single-camera embed uses. Nothing about a camera is snapshotted
 *    into the collection.
 *
 * Caps (chosen to sit with the site's existing list limits — the
 * device saved list caps at 100 entries): 25 collections per user,
 * 60 cameras per collection. Both are generous for a hand-curated
 * share page and small enough that a public page stays a page, not
 * a directory.
 */
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { enterpriseCatalogueById } from "@/lib/enterprise/catalogue";
import { toFeedCamera, type FeedCamera } from "@/lib/enterprise/payload";
import {
  toPublicEmbedCamera,
  type PublicEmbedCamera,
} from "@/lib/embed/public";

export const MAX_COLLECTIONS_PER_USER = 25;
export const MAX_CAMERAS_PER_COLLECTION = 60;
export const MAX_TITLE_LENGTH = 80;
export const MAX_DESCRIPTION_LENGTH = 280;

export class CollectionError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const notFound = () =>
  new CollectionError(404, "collection_not_found", "Collection not found.");

/* ── Slugs ─────────────────────────────────────────────────────── */

/** URL-safe base from a title; falls back to "collection". */
export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return base || "collection";
}

function slugSuffix(): string {
  // 6 chars from a 36-symbol alphabet ≈ 2.2B combinations; the
  // unique index + create-retry loop makes collisions a non-event.
  const bytes = randomBytes(6);
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function generateSlug(title: string): string {
  return `${slugifyTitle(title)}-${slugSuffix()}`;
}

/* ── Input hygiene ─────────────────────────────────────────────── */

export function cleanTitle(raw: unknown): string {
  const title = typeof raw === "string" ? raw.trim() : "";
  if (!title) {
    throw new CollectionError(400, "title_required", "Give the collection a title.");
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new CollectionError(
      400,
      "title_too_long",
      `Titles are limited to ${MAX_TITLE_LENGTH} characters.`,
    );
  }
  return title;
}

export function cleanDescription(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    throw new CollectionError(400, "invalid_description", "Description must be text.");
  }
  const text = raw.trim();
  if (!text) return null;
  if (text.length > MAX_DESCRIPTION_LENGTH) {
    throw new CollectionError(
      400,
      "description_too_long",
      `Descriptions are limited to ${MAX_DESCRIPTION_LENGTH} characters.`,
    );
  }
  return text;
}

export function cleanCameraId(raw: unknown): string {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id || id.length > 200) {
    throw new CollectionError(400, "camera_required", "Name a camera to add.");
  }
  return id;
}

/* ── CRUD (owner-scoped) ───────────────────────────────────────── */

export interface CollectionSummary {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  cameraCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function listUserCollections(
  userId: string,
): Promise<CollectionSummary[]> {
  const rows = await db.sharedCollection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    slug: r.slug,
    cameraCount: r._count.items,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function createCollection(
  userId: string,
  input: { title: unknown; description?: unknown },
): Promise<CollectionSummary> {
  const title = cleanTitle(input.title);
  const description = cleanDescription(input.description);
  const count = await db.sharedCollection.count({ where: { userId } });
  if (count >= MAX_COLLECTIONS_PER_USER) {
    throw new CollectionError(
      409,
      "collection_limit",
      `You can keep up to ${MAX_COLLECTIONS_PER_USER} collections. Delete one to make room.`,
    );
  }
  // Slug collisions are practically impossible (random suffix) but
  // the unique index is the arbiter — retry with a fresh suffix.
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = await db.sharedCollection.create({
        data: { userId, title, description, slug: generateSlug(title) },
      });
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        slug: row.slug,
        cameraCount: 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (err) {
      lastErr = err;
      if ((err as { code?: string })?.code !== "P2002") throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("slug allocation failed");
}

/** The owned collection with its items in display order, or null. */
export async function getOwnedCollection(userId: string, id: string) {
  return db.sharedCollection.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { position: "asc" } } },
  });
}

export async function updateCollection(
  userId: string,
  id: string,
  input: { title?: unknown; description?: unknown },
): Promise<CollectionSummary> {
  const owned = await db.sharedCollection.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) throw notFound();
  const data: { title?: string; description?: string | null } = {};
  if (input.title !== undefined) data.title = cleanTitle(input.title);
  if (input.description !== undefined) {
    data.description = cleanDescription(input.description);
  }
  const row = await db.sharedCollection.update({
    where: { id },
    data,
    include: { _count: { select: { items: true } } },
  });
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    cameraCount: row._count.items,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function deleteCollection(userId: string, id: string): Promise<void> {
  const res = await db.sharedCollection.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
}

/* ── Membership ────────────────────────────────────────────────── */

export async function addCamera(
  userId: string,
  collectionId: string,
  rawCameraId: unknown,
): Promise<{ cameraId: string; position: number; alreadyPresent: boolean }> {
  const cameraId = cleanCameraId(rawCameraId);
  const owned = await getOwnedCollection(userId, collectionId);
  if (!owned) throw notFound();

  const existing = owned.items.find((i) => i.cameraId === cameraId);
  if (existing) {
    return { cameraId, position: existing.position, alreadyPresent: true };
  }
  if (owned.items.length >= MAX_CAMERAS_PER_COLLECTION) {
    throw new CollectionError(
      409,
      "camera_limit",
      `A collection holds up to ${MAX_CAMERAS_PER_COLLECTION} cameras.`,
    );
  }
  // Membership references real catalogue ids only — validated here,
  // against the same catalogue the public embed resolves from.
  const byId = await enterpriseCatalogueById();
  if (!byId) {
    throw new CollectionError(
      503,
      "catalogue_unavailable",
      "The camera catalogue is still loading. Try again in a moment.",
    );
  }
  if (!byId.has(cameraId)) {
    throw new CollectionError(
      400,
      "unknown_camera",
      "That camera isn't in the WorldEye catalogue.",
    );
  }
  const position =
    owned.items.reduce((max, i) => Math.max(max, i.position), -1) + 1;
  await db.sharedCollectionItem.create({
    data: { collectionId, cameraId, position },
  });
  return { cameraId, position, alreadyPresent: false };
}

export async function removeCamera(
  userId: string,
  collectionId: string,
  rawCameraId: unknown,
): Promise<void> {
  const cameraId = cleanCameraId(rawCameraId);
  const owned = await db.sharedCollection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true },
  });
  if (!owned) throw notFound();
  await db.sharedCollectionItem.deleteMany({
    where: { collectionId, cameraId },
  });
}

/** Reorder = the full ordered list of the collection's camera ids. */
export async function reorderCameras(
  userId: string,
  collectionId: string,
  rawOrder: unknown,
): Promise<void> {
  if (!Array.isArray(rawOrder) || rawOrder.some((v) => typeof v !== "string")) {
    throw new CollectionError(
      400,
      "invalid_order",
      "Send the collection's camera ids in their new order.",
    );
  }
  const order = rawOrder as string[];
  const owned = await getOwnedCollection(userId, collectionId);
  if (!owned) throw notFound();
  const current = owned.items.map((i) => i.cameraId);
  const sameSet =
    order.length === current.length &&
    new Set(order).size === order.length &&
    current.every((id) => order.includes(id));
  if (!sameSet) {
    throw new CollectionError(
      400,
      "invalid_order",
      "The new order must list each of the collection's cameras exactly once.",
    );
  }
  await db.$transaction(
    order.map((cameraId, position) =>
      db.sharedCollectionItem.updateMany({
        where: { collectionId, cameraId },
        data: { position },
      }),
    ),
  );
}

/* ── Public resolution ─────────────────────────────────────────── */

export interface PublicCollectionCamera {
  cameraId: string;
  position: number;
  /** True when the id is no longer in the catalogue. */
  missing: boolean;
  /** Display data for the public page (any catalogue camera). */
  feed: FeedCamera | null;
  /** Non-null only when the rights registry clears this camera for
   *  embedding AND it has something playable — the embed's rule. */
  embed: PublicEmbedCamera | null;
}

export interface PublicCollection {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  /** The owner's display name, only when they have one set. */
  ownerName: string | null;
  cameras: PublicCollectionCamera[];
}

export async function resolvePublicCollection(
  slug: string,
  origin: string,
): Promise<PublicCollection | null> {
  const row = await db.sharedCollection.findUnique({
    where: { slug },
    include: {
      items: { orderBy: { position: "asc" } },
      user: { select: { name: true } },
    },
  });
  if (!row) return null;
  const byId = await enterpriseCatalogueById();
  const cameras: PublicCollectionCamera[] = row.items.map((item) => {
    const raw = byId?.get(item.cameraId);
    if (!raw) {
      return {
        cameraId: item.cameraId,
        position: item.position,
        missing: true,
        feed: null,
        embed: null,
      };
    }
    return {
      cameraId: item.cameraId,
      position: item.position,
      missing: false,
      feed: toFeedCamera(raw, origin),
      embed: toPublicEmbedCamera(raw, origin),
    };
  });
  const ownerName = row.user?.name?.trim() ? row.user.name.trim() : null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ownerName,
    cameras,
  };
}

/** The embed's view: only registry-cleared, playable cameras. */
export async function resolveEmbedCollection(
  slug: string,
  origin: string,
): Promise<{
  title: string;
  slug: string;
  cameras: PublicEmbedCamera[];
  totalCameras: number;
} | null> {
  const pub = await resolvePublicCollection(slug, origin);
  if (!pub) return null;
  return {
    title: pub.title,
    slug: pub.slug,
    cameras: pub.cameras
      .map((c) => c.embed)
      .filter((c): c is PublicEmbedCamera => c !== null),
    totalCameras: pub.cameras.length,
  };
}
