/**
 * Powder Pass — favourite resorts (follows).
 *
 * The shared foundation for the ski member features: a member follows
 * resorts from a resort page, and /ski-webcams/my (plus the dawn-patrol
 * alerts, powder digest, storm watch and season features built on top)
 * reads the same list. Slugs are validated against the SKI_RESORTS
 * dataset (lib/ski-resorts) before anything touches the DB — an unknown
 * slug is rejected, never stored, so the table can only ever name real
 * resorts from the directory.
 *
 * The DB surface is a narrow structural interface so unit tests can
 * inject an in-memory client; production passes the real Prisma client
 * (cast once here, because the generated client's model delegate only
 * exists after `prisma generate` runs against this schema).
 */
import { db } from "@/lib/db";
import { getSkiResort } from "@/lib/ski-resorts";

export class InvalidResortSlugError extends Error {
  constructor(slug: unknown) {
    super(`Unknown ski resort slug: ${String(slug)}`);
    this.name = "InvalidResortSlugError";
  }
}

/** True only for a string slug that names a resort in SKI_RESORTS. */
export function isValidResortSlug(slug: unknown): slug is string {
  return typeof slug === "string" && slug.length > 0 && !!getSkiResort(slug);
}

export function assertValidResortSlug(slug: unknown): string {
  if (!isValidResortSlug(slug)) throw new InvalidResortSlugError(slug);
  return slug;
}

export interface SkiResortFollowRow {
  id: string;
  userId: string;
  resortSlug: string;
  createdAt: Date;
}

/** The slice of the Prisma client this module uses. */
export interface SkiFollowDb {
  skiResortFollow: {
    findMany(args: {
      where: { userId: string };
      orderBy: { createdAt: "asc" };
    }): Promise<SkiResortFollowRow[]>;
    upsert(args: {
      where: { userId_resortSlug: { userId: string; resortSlug: string } };
      create: { userId: string; resortSlug: string };
      update: Record<string, never>;
    }): Promise<SkiResortFollowRow>;
    deleteMany(args: {
      where: { userId: string; resortSlug: string };
    }): Promise<{ count: number }>;
  };
}

const defaultDb = db as unknown as SkiFollowDb;

/** The user's followed resort slugs, oldest follow first. */
export async function listFollowedSlugs(
  userId: string,
  client: SkiFollowDb = defaultDb,
): Promise<string[]> {
  const rows = await client.skiResortFollow.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(r => r.resortSlug);
}

/**
 * Follow a resort. Idempotent: re-following a resort the user already
 * follows returns the existing row and writes no duplicate (the
 * (userId, resortSlug) unique constraint + upsert guarantee it).
 */
export async function followResort(
  userId: string,
  slug: unknown,
  client: SkiFollowDb = defaultDb,
): Promise<SkiResortFollowRow> {
  const resortSlug = assertValidResortSlug(slug);
  return client.skiResortFollow.upsert({
    where: { userId_resortSlug: { userId, resortSlug } },
    create: { userId, resortSlug },
    update: {},
  });
}

/**
 * Unfollow a resort. Idempotent: returns true when a row was removed,
 * false when the user was not following it — either way the end state
 * is "not following".
 */
export async function unfollowResort(
  userId: string,
  slug: unknown,
  client: SkiFollowDb = defaultDb,
): Promise<boolean> {
  const resortSlug = assertValidResortSlug(slug);
  const res = await client.skiResortFollow.deleteMany({
    where: { userId, resortSlug },
  });
  return res.count > 0;
}
