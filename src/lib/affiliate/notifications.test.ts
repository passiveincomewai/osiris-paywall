// Affiliate notification center — ids-scoped mark-read tests (mocked Prisma).
// Pins the ownership contract the dashboard inbox relies on: the route
// forwards the caller's own profile id, so markNotificationsRead must mark
// only that affiliate's rows — an id belonging to another affiliate is
// never touched, with or without an explicit id list.
// Run: npx vitest run src/lib/affiliate/notifications.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, any>;

const { store, db } = vi.hoisted(() => {
  const store: { affiliateNotification: Row[] } = { affiliateNotification: [] };

  function matchWhere(row: Row, where: any): boolean {
    if (!where) return true;
    for (const [k, v] of Object.entries(where)) {
      if (v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
        if ("in" in v && !(v as any).in.includes(row[k])) return false;
        else if (!("in" in v) && row[k] !== v) return false;
      } else if (row[k] !== v) return false;
    }
    return true;
  }

  const db = {
    affiliateNotification: {
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const row of store.affiliateNotification) {
          if (matchWhere(row, where)) { Object.assign(row, data); count++; }
        }
        return { count };
      },
    },
  };
  return { store, db };
});

vi.mock("@/lib/db", () => ({ db }));

import { markNotificationsRead } from "./notifications";

const T0 = new Date("2026-10-20T00:00:00Z");

function seed() {
  store.affiliateNotification = [
    { id: "n_a1", affiliateProfileId: "prof_a", readAt: null, createdAt: T0 },
    { id: "n_a2", affiliateProfileId: "prof_a", readAt: null, createdAt: T0 },
    { id: "n_a3", affiliateProfileId: "prof_a", readAt: new Date("2026-10-21T00:00:00Z"), createdAt: T0 },
    { id: "n_b1", affiliateProfileId: "prof_b", readAt: null, createdAt: T0 },
  ];
}

const row = (id: string) => store.affiliateNotification.find((r) => r.id === id)!;

beforeEach(seed);

describe("markNotificationsRead", () => {
  it("marks only the requested id for the caller", async () => {
    const marked = await markNotificationsRead("prof_a", ["n_a1"]);
    expect(marked).toBe(1);
    expect(row("n_a1").readAt).toBeInstanceOf(Date);
    expect(row("n_a2").readAt).toBeNull();
  });

  it("never marks a notification that belongs to another affiliate", async () => {
    const marked = await markNotificationsRead("prof_a", ["n_b1"]);
    expect(marked).toBe(0);
    expect(row("n_b1").readAt).toBeNull();
  });

  it("ignores foreign ids mixed into the list but still marks the caller's own", async () => {
    const marked = await markNotificationsRead("prof_a", ["n_b1", "n_a2"]);
    expect(marked).toBe(1);
    expect(row("n_a2").readAt).toBeInstanceOf(Date);
    expect(row("n_b1").readAt).toBeNull();
  });

  it("without ids, marks all of the caller's unread and nothing else", async () => {
    const marked = await markNotificationsRead("prof_a");
    expect(marked).toBe(2);
    expect(row("n_a1").readAt).toBeInstanceOf(Date);
    expect(row("n_a2").readAt).toBeInstanceOf(Date);
    expect(row("n_b1").readAt).toBeNull();
  });
});
