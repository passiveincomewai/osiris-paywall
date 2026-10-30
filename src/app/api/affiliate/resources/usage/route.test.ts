// Usage-endpoint pins: auth via requireAffiliate, template-id
// validation (only real templates from src/lib/affiliate/templates.ts
// can be marked), and mark semantics — first mark wins, repeat marks
// are idempotent, unmarking clears.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string } } | null),
  profileByUser: vi.fn(async () => null as unknown),
  usageFindMany: vi.fn(async () => [] as unknown[]),
  usageFindUnique: vi.fn(async () => null as unknown),
  usageUpsert: vi.fn(async ({ create, update }: any) => ({ ...(create ?? {}), ...(update ?? {}) })),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    affiliateProfile: { findUnique: mocks.profileByUser },
    affiliateTemplateUsage: {
      findMany: mocks.usageFindMany,
      findUnique: mocks.usageFindUnique,
      upsert: mocks.usageUpsert,
    },
  },
}));
vi.mock("@/lib/studio/access", () => ({ resolveMembership: vi.fn(async () => null) }));

import { GET, POST } from "./route";

const PROFILE = { id: "prof_1", userId: "user_1", status: "active" };

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/affiliate/resources/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user_1" } });
  mocks.profileByUser.mockResolvedValue(PROFILE);
  mocks.usageFindMany.mockResolvedValue([]);
  mocks.usageFindUnique.mockResolvedValue(null);
  mocks.usageUpsert.mockImplementation(async ({ create, update }: any) => ({
    templateKind: create?.templateKind ?? "caption",
    templateId: create?.templateId ?? "caption-x",
    usedAt: update?.usedAt ?? create?.usedAt ?? null,
    postedAt: update?.postedAt ?? create?.postedAt ?? null,
  }));
});

describe("GET /api/affiliate/resources/usage", () => {
  it("401 when signed out", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mocks.usageFindMany).not.toHaveBeenCalled();
  });

  it("returns the profile's usage rows", async () => {
    const when = new Date("2026-10-30T00:00:00Z");
    mocks.usageFindMany.mockResolvedValue([
      { templateKind: "caption", templateId: "caption-x", usedAt: when, postedAt: null },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.usage).toEqual([
      { templateKind: "caption", templateId: "caption-x", usedAt: when.toISOString(), postedAt: null },
    ]);
  });
});

describe("POST /api/affiliate/resources/usage", () => {
  it("400 for an unknown template", async () => {
    const res = await post({ templateKind: "caption", templateId: "nope", used: true });
    expect(res.status).toBe(400);
    expect(mocks.usageUpsert).not.toHaveBeenCalled();
  });

  it("400 when neither used nor posted is a boolean", async () => {
    const res = await post({ templateKind: "caption", templateId: "caption-x" });
    expect(res.status).toBe(400);
    expect(mocks.usageUpsert).not.toHaveBeenCalled();
  });

  it("marks used with a fresh timestamp on first mark", async () => {
    const res = await post({ templateKind: "caption", templateId: "caption-x", used: true });
    expect(res.status).toBe(200);
    const arg = mocks.usageUpsert.mock.calls[0][0] as any;
    expect(arg.create.usedAt).toBeInstanceOf(Date);
    expect(arg.create.postedAt).toBeNull();
  });

  it("keeps the original timestamp on a repeat mark (idempotent)", async () => {
    const first = new Date("2026-10-01T12:00:00Z");
    mocks.usageFindUnique.mockResolvedValue({
      templateKind: "caption",
      templateId: "caption-x",
      usedAt: first,
      postedAt: null,
    });
    const res = await post({ templateKind: "caption", templateId: "caption-x", used: true });
    expect(res.status).toBe(200);
    const arg = mocks.usageUpsert.mock.calls[0][0] as any;
    expect(arg.update.usedAt).toBe(first);
  });

  it("unmarking clears the timestamp without touching the other flag", async () => {
    const posted = new Date("2026-10-02T12:00:00Z");
    mocks.usageFindUnique.mockResolvedValue({
      templateKind: "email",
      templateId: "email-window",
      usedAt: new Date("2026-10-01T12:00:00Z"),
      postedAt: posted,
    });
    const res = await post({ templateKind: "email", templateId: "email-window", used: false });
    expect(res.status).toBe(200);
    const arg = mocks.usageUpsert.mock.calls[0][0] as any;
    expect(arg.update.usedAt).toBeNull();
    expect(arg.update.postedAt).toBe(posted);
  });
});
