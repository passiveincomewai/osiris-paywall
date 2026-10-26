// Platform starter-set pins for affiliate tracking links.
//   - The registry is well-formed: slugs satisfy REF_CODE_RE (so the
//     links API accepts them), labels/slugs are unique, order is stable.
//   - Seeding (materialize-on-read from GET /api/affiliate/links)
//     creates exactly the registry set for an affiliate with no links,
//     is a strict no-op once ANY link exists, and respects the link cap
//     (seeded rows are real rows — they count toward MAX_LINKS like any
//     other link when the create endpoint counts them).
// Run: npx vitest run src/lib/affiliate/platforms.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── In-memory fake Prisma (affiliateTrackingLink only) ──────────────────
type Row = Record<string, any>;

const { store, db } = vi.hoisted(() => {
  const store: { affiliateTrackingLink: Row[] } = { affiliateTrackingLink: [] };
  let seq = 0;
  const db = {
    affiliateTrackingLink: {
      count: async ({ where }: any) =>
        store.affiliateTrackingLink.filter((r) => r.affiliateProfileId === where.affiliateProfileId).length,
      createMany: async ({ data, skipDuplicates }: any) => {
        let created = 0;
        for (const d of data) {
          const dup = store.affiliateTrackingLink.some(
            (r) => r.affiliateProfileId === d.affiliateProfileId && r.slug === d.slug,
          );
          if (dup) {
            if (skipDuplicates) continue;
            throw new Error("Unique constraint failed on the fields: (`affiliateProfileId`,`slug`)");
          }
          store.affiliateTrackingLink.push({ id: `link_${++seq}`, ...d });
          created++;
        }
        return { count: created };
      },
    },
  };
  return { store, db };
});

vi.mock("@/lib/db", () => ({ db }));

// Import AFTER mocks.
import { PLATFORMS, PLATFORM_BY_SLUG, isPlatformSlug, seedPlatformLinksIfEmpty } from "./platforms";
import { REF_CODE_RE } from "./attribution";

const MAX_LINKS = 25; // mirrors the links route's cap
const rowsFor = (profileId: string) =>
  store.affiliateTrackingLink
    .filter((r) => r.affiliateProfileId === profileId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

beforeEach(() => {
  store.affiliateTrackingLink.length = 0;
});

describe("PLATFORMS registry", () => {
  it("is the expected platform set, in order", () => {
    expect(PLATFORMS.map((p) => p.slug)).toEqual([
      "instagram", "tiktok", "youtube", "x-twitter", "facebook",
      "threads", "twitch", "linkedin", "pinterest", "reddit",
    ]);
    expect(PLATFORMS.map((p) => p.label)).toEqual([
      "Instagram", "TikTok", "YouTube", "X", "Facebook",
      "Threads", "Twitch", "LinkedIn", "Pinterest", "Reddit",
    ]);
  });

  it("every slug passes REF_CODE_RE and fits the VarChar(32) column", () => {
    for (const p of PLATFORMS) {
      expect(REF_CODE_RE.test(p.slug), p.slug).toBe(true);
      expect(p.slug.length).toBeLessThanOrEqual(32);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.label.length).toBeLessThanOrEqual(80);
    }
    expect(new Set(PLATFORMS.map((p) => p.slug)).size).toBe(PLATFORMS.length);
    // "x" alone is too short for REF_CODE_RE (3–32 chars) — the X entry
    // must ride on the longer slug.
    expect(REF_CODE_RE.test("x")).toBe(false);
    expect(PLATFORM_BY_SLUG.get("x-twitter")?.label).toBe("X");
  });

  it("every platform carries a brand colour and a real glyph path", () => {
    for (const p of PLATFORMS) {
      expect(p.brandHex, p.slug).toMatch(/^#[0-9A-F]{6}$/i);
      expect(p.iconPath.length, p.slug).toBeGreaterThan(100);
      expect(PLATFORM_BY_SLUG.get(p.slug)).toBe(p);
      expect(isPlatformSlug(p.slug)).toBe(true);
    }
    expect(isPlatformSlug("newsletter")).toBe(false);
  });
});

describe("seedPlatformLinksIfEmpty", () => {
  it("creates exactly the registry set, in registry order, for an affiliate with no links", async () => {
    const created = await seedPlatformLinksIfEmpty("prof_1", MAX_LINKS);
    expect(created).toBe(PLATFORMS.length);
    const rows = rowsFor("prof_1");
    expect(rows.map((r) => r.slug)).toEqual(PLATFORMS.map((p) => p.slug));
    expect(rows.map((r) => r.label)).toEqual(PLATFORMS.map((p) => p.label));
    // createdAt stagger keeps the createdAt-ordered list in registry order.
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].createdAt.getTime()).toBeGreaterThan(rows[i - 1].createdAt.getTime());
    }
  });

  it("is scoped per affiliate", async () => {
    await seedPlatformLinksIfEmpty("prof_1", MAX_LINKS);
    const created = await seedPlatformLinksIfEmpty("prof_2", MAX_LINKS);
    expect(created).toBe(PLATFORMS.length);
    expect(rowsFor("prof_1")).toHaveLength(PLATFORMS.length);
    expect(rowsFor("prof_2")).toHaveLength(PLATFORMS.length);
  });

  it("is a no-op when the affiliate already has any link", async () => {
    store.affiliateTrackingLink.push({
      id: "link_custom", affiliateProfileId: "prof_1",
      label: "Newsletter", slug: "newsletter", createdAt: new Date(),
    });
    const created = await seedPlatformLinksIfEmpty("prof_1", MAX_LINKS);
    expect(created).toBe(0);
    expect(rowsFor("prof_1")).toHaveLength(1);
  });

  it("is a no-op when only some platform links remain (individual deletions stick)", async () => {
    await seedPlatformLinksIfEmpty("prof_1", MAX_LINKS);
    // Affiliate deletes three platform links; the rest must NOT be topped up.
    store.affiliateTrackingLink = store.affiliateTrackingLink.filter(
      (r) => !["tiktok", "reddit", "linkedin"].includes(r.slug),
    );
    const created = await seedPlatformLinksIfEmpty("prof_1", MAX_LINKS);
    expect(created).toBe(0);
    expect(rowsFor("prof_1")).toHaveLength(PLATFORMS.length - 3);
  });

  it("re-seeds after every link is deleted (the starter set acts as a reset)", async () => {
    await seedPlatformLinksIfEmpty("prof_1", MAX_LINKS);
    store.affiliateTrackingLink = store.affiliateTrackingLink.filter((r) => r.affiliateProfileId !== "prof_1");
    const created = await seedPlatformLinksIfEmpty("prof_1", MAX_LINKS);
    expect(created).toBe(PLATFORMS.length);
    expect(rowsFor("prof_1")).toHaveLength(PLATFORMS.length);
  });

  it("respects the link cap — seeded rows count toward it like any other link", async () => {
    const created = await seedPlatformLinksIfEmpty("prof_1", 3);
    expect(created).toBe(3);
    expect(rowsFor("prof_1").map((r) => r.slug)).toEqual(PLATFORMS.slice(0, 3).map((p) => p.slug));
    // The full starter set leaves room for custom links under the cap.
    expect(PLATFORMS.length).toBeLessThan(MAX_LINKS);
  });

  it("a second read creates nothing twice (idempotent)", async () => {
    await seedPlatformLinksIfEmpty("prof_1", MAX_LINKS);
    const again = await seedPlatformLinksIfEmpty("prof_1", MAX_LINKS);
    expect(again).toBe(0);
    expect(rowsFor("prof_1")).toHaveLength(PLATFORMS.length);
  });
});
