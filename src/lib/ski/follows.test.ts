import { describe, it, expect } from "vitest";
import {
  InvalidResortSlugError,
  followResort,
  isValidResortSlug,
  listFollowedSlugs,
  unfollowResort,
  type SkiFollowDb,
  type SkiResortFollowRow,
} from "./follows";

/* Real slugs from src/data/ski-resorts.json (SKI_RESORTS). */
const SNOWBIRD = "snowbird";
const ALTA = "alta";

function fakeDb(): { client: SkiFollowDb; rows: SkiResortFollowRow[] } {
  const rows: SkiResortFollowRow[] = [];
  let seq = 0;
  const client: SkiFollowDb = {
    skiResortFollow: {
      async findMany({ where }) {
        return rows
          .filter(r => r.userId === where.userId)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      },
      async upsert({ where, create }) {
        const key = where.userId_resortSlug;
        const existing = rows.find(
          r => r.userId === key.userId && r.resortSlug === key.resortSlug,
        );
        if (existing) return existing;
        const row: SkiResortFollowRow = {
          id: `row_${++seq}`,
          userId: create.userId,
          resortSlug: create.resortSlug,
          createdAt: new Date(1_700_000_000_000 + seq * 1000),
        };
        rows.push(row);
        return row;
      },
      async deleteMany({ where }) {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i].userId === where.userId && rows[i].resortSlug === where.resortSlug) {
            rows.splice(i, 1);
          }
        }
        return { count: before - rows.length };
      },
    },
  };
  return { client, rows };
}

describe("isValidResortSlug", () => {
  it("accepts slugs present in SKI_RESORTS", () => {
    expect(isValidResortSlug(SNOWBIRD)).toBe(true);
    expect(isValidResortSlug(ALTA)).toBe(true);
  });
  it("rejects unknown, empty and non-string slugs", () => {
    expect(isValidResortSlug("not-a-real-resort")).toBe(false);
    expect(isValidResortSlug("")).toBe(false);
    expect(isValidResortSlug(undefined)).toBe(false);
    expect(isValidResortSlug(null)).toBe(false);
    expect(isValidResortSlug(42)).toBe(false);
  });
});

describe("followResort / listFollowedSlugs", () => {
  it("follows a resort and lists it", async () => {
    const { client } = fakeDb();
    const row = await followResort("user_1", SNOWBIRD, client);
    expect(row.resortSlug).toBe(SNOWBIRD);
    expect(await listFollowedSlugs("user_1", client)).toEqual([SNOWBIRD]);
  });

  it("is idempotent — re-following writes no duplicate row", async () => {
    const { client, rows } = fakeDb();
    const first = await followResort("user_1", SNOWBIRD, client);
    const again = await followResort("user_1", SNOWBIRD, client);
    expect(again.id).toBe(first.id);
    expect(rows).toHaveLength(1);
    expect(await listFollowedSlugs("user_1", client)).toEqual([SNOWBIRD]);
  });

  it("keeps users' follows separate and in follow order", async () => {
    const { client } = fakeDb();
    await followResort("user_1", SNOWBIRD, client);
    await followResort("user_1", ALTA, client);
    await followResort("user_2", ALTA, client);
    expect(await listFollowedSlugs("user_1", client)).toEqual([SNOWBIRD, ALTA]);
    expect(await listFollowedSlugs("user_2", client)).toEqual([ALTA]);
  });

  it("rejects an unknown slug without writing", async () => {
    const { client, rows } = fakeDb();
    await expect(followResort("user_1", "nope-not-a-resort", client)).rejects.toBeInstanceOf(
      InvalidResortSlugError,
    );
    expect(rows).toHaveLength(0);
  });
});

describe("unfollowResort", () => {
  it("removes a follow and reports true, then false on repeat", async () => {
    const { client } = fakeDb();
    await followResort("user_1", SNOWBIRD, client);
    expect(await unfollowResort("user_1", SNOWBIRD, client)).toBe(true);
    expect(await listFollowedSlugs("user_1", client)).toEqual([]);
    expect(await unfollowResort("user_1", SNOWBIRD, client)).toBe(false);
  });

  it("rejects an unknown slug", async () => {
    const { client } = fakeDb();
    await expect(unfollowResort("user_1", "nope-not-a-resort", client)).rejects.toBeInstanceOf(
      InvalidResortSlugError,
    );
  });
});
