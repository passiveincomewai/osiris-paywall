// Tests for GET /api/analytics/recent-cameras — the server half of the
// "pick up where you left off" rail. Verifies (against a mocked db +
// auth, the repo's route-test pattern) that:
//  - signed-out callers get an empty list and the db is never queried,
//  - a signed-in caller gets their own distinct camera ids, most
//    recent first, capped at 8, with the query scoped to their userId
//    and to camera_open rows carrying a cameraId.
// Run: npx vitest run src/app/api/analytics/recent-cameras/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { rows, queries, sessionRef } = vi.hoisted(() => ({
  rows: { current: [] as { cameraId: string | null; cameraName: string | null }[] },
  queries: [] as Record<string, unknown>[],
  sessionRef: { current: null as { user: { id: string } } | null },
}));

vi.mock("@/lib/db", () => ({
  db: {
    pageView: {
      findMany: async (q: Record<string, unknown>) => {
        queries.push(q);
        return rows.current;
      },
    },
  },
}));
vi.mock("@/auth", () => ({ auth: async () => sessionRef.current }));

import { GET } from "./route";

beforeEach(() => {
  rows.current = [];
  queries.length = 0;
  sessionRef.current = null;
});

describe("GET /api/analytics/recent-cameras", () => {
  it("returns an empty list signed-out and never queries", async () => {
    const res = await GET();
    expect(await res.json()).toEqual({ cameras: [] });
    expect(queries).toHaveLength(0);
  });

  it("returns distinct ids most-recent-first for the signed-in caller only", async () => {
    sessionRef.current = { user: { id: "user_1" } };
    rows.current = [
      { cameraId: "cam-b", cameraName: "B (latest open)" },
      { cameraId: "cam-a", cameraName: "A" },
      { cameraId: "cam-b", cameraName: "B (earlier open)" },
      { cameraId: null, cameraName: null },
    ];
    const res = await GET();
    expect(await res.json()).toEqual({
      cameras: [
        { id: "cam-b", name: "B (latest open)" },
        { id: "cam-a", name: "A" },
      ],
    });
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatchObject({
      where: {
        userId: "user_1",
        cameraId: { not: null },
        OR: [{ event: "camera_open" }, { event: { startsWith: "camera_open:" } }],
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("caps the list at 8", async () => {
    sessionRef.current = { user: { id: "user_1" } };
    rows.current = Array.from({ length: 12 }, (_, i) => ({
      cameraId: `cam-${i}`,
      cameraName: `Cam ${i}`,
    }));
    const res = await GET();
    const body = await res.json();
    expect(body.cameras).toHaveLength(8);
    expect(body.cameras[0].id).toBe("cam-0");
  });
});
