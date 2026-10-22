import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
  share: null as Record<string, unknown> | null,
  viewIncrements: 0,
  referralClicks: [] as Record<string, unknown>[],
  shareClicks: [] as Record<string, unknown>[],
  affiliate: null as Record<string, unknown> | null,
  resolved: null as Record<string, unknown> | null,
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => mocks.session) }));
vi.mock("@/lib/affiliate/settings", () => ({
  getSettings: vi.fn(async () => ({ attributionWindowDays: 30 })),
}));
vi.mock("@/lib/affiliate/attribution", () => ({
  REF_COOKIE: "we_ref",
  hashIp: (ip: string) => `hash:${ip}`,
  findAffiliateByCode: vi.fn(async () => mocks.affiliate),
}));
vi.mock("@/lib/share/identity", () => ({
  resolveShareCode: vi.fn(async () => mocks.resolved),
}));
vi.mock("@/lib/db", () => ({
  db: {
    clipShare: {
      findUnique: vi.fn(async () => mocks.share),
      update: vi.fn(async () => {
        mocks.viewIncrements++;
        return {};
      }),
    },
    referralClick: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        mocks.referralClicks.push(data);
        return data;
      }),
    },
    shareClick: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        mocks.shareClicks.push(data);
        return data;
      }),
    },
  },
}));

import { POST } from "./route";

const SLUG = "abc123XYZ_-0";
const HUMAN_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";

function view(ua = HUMAN_UA, slug = SLUG) {
  return POST(
    new NextRequest(`http://localhost/api/watch/${slug}/view`, {
      method: "POST",
      headers: { "user-agent": ua, "x-forwarded-for": "203.0.113.9" },
    }),
    { params: Promise.resolve({ slug }) },
  );
}

beforeEach(() => {
  mocks.session = null;
  mocks.share = { id: "share-1", userId: "owner-1", refCode: "jameson", revokedAt: null };
  mocks.viewIncrements = 0;
  mocks.referralClicks = [];
  mocks.shareClicks = [];
  mocks.affiliate = { id: "aff-1", userId: "owner-1", referralCode: "jameson", customCode: null };
  mocks.resolved = null;
});

describe("POST /api/watch/[slug]/view", () => {
  it("counts the view, records the referral click, and drops the we_ref cookie", async () => {
    const res = await view();
    expect(res.status).toBe(200);
    expect(mocks.viewIncrements).toBe(1);
    expect(mocks.referralClicks).toHaveLength(1);
    expect(mocks.referralClicks[0].affiliateProfileId).toBe("aff-1");
    expect(mocks.referralClicks[0].path).toBe(`/watch/${SLUG}`);
    const cookie = res.cookies.get("we_ref");
    expect(cookie?.value).toBe("jameson");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.maxAge).toBe(30 * 86400);
  });

  it("attributes anon share codes via ShareClick + the same cookie", async () => {
    mocks.affiliate = null;
    mocks.share = { id: "share-1", userId: "owner-1", refCode: "weanon123", revokedAt: null };
    mocks.resolved = { kind: "anon", identity: { id: "ident-1", code: "weanon123" } };
    const res = await view();
    expect(res.status).toBe(200);
    expect(mocks.shareClicks).toHaveLength(1);
    expect(mocks.shareClicks[0].shareIdentityId).toBe("ident-1");
    expect(res.cookies.get("we_ref")?.value).toBe("weanon123");
  });

  it("does not count or attribute the owner's own visit", async () => {
    mocks.session = { user: { id: "owner-1" } };
    const res = await view();
    expect(res.status).toBe(200);
    expect(mocks.viewIncrements).toBe(0);
    expect(mocks.referralClicks).toHaveLength(0);
    expect(res.cookies.get("we_ref")).toBeUndefined();
  });

  it("does not count preview bots (social unfurlers)", async () => {
    const res = await view("facebookexternalhit/1.1");
    expect(res.status).toBe(200);
    expect(mocks.viewIncrements).toBe(0);
    expect(mocks.referralClicks).toHaveLength(0);
  });

  it("404s revoked and unknown shares without counting", async () => {
    mocks.share = { id: "share-1", userId: "owner-1", refCode: "jameson", revokedAt: new Date() };
    expect((await view()).status).toBe(404);
    mocks.share = null;
    expect((await view()).status).toBe(404);
    expect(mocks.viewIncrements).toBe(0);
  });

  it("counts the view even when the share carries no referral code", async () => {
    mocks.share = { id: "share-1", userId: "owner-1", refCode: null, revokedAt: null };
    const res = await view();
    expect(res.status).toBe(200);
    expect(mocks.viewIncrements).toBe(1);
    expect(res.cookies.get("we_ref")).toBeUndefined();
  });
});
