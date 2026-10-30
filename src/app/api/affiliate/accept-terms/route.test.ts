// Accept-terms pins: auth required, acceptance is recorded once per
// (user, terms version), and re-accepting returns the original record
// instead of duplicating it.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string } } | null),
  findAcceptance: vi.fn(async () => null as unknown),
  createAcceptance: vi.fn(async ({ data }: any) => ({
    id: "acc_1",
    acceptedAt: new Date("2026-10-30T00:00:00Z"),
    ...data,
  })),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    affiliateTermsAcceptance: {
      findUnique: mocks.findAcceptance,
      create: mocks.createAcceptance,
    },
  },
}));

import { POST } from "./route";
import { AFFILIATE_TERMS_VERSION } from "@/lib/affiliate/terms";

const post = (body?: unknown) =>
  POST(
    new Request("http://localhost/api/affiliate/accept-terms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findAcceptance.mockResolvedValue(null);
  mocks.createAcceptance.mockImplementation(async ({ data }: any) => ({
    id: "acc_1",
    acceptedAt: new Date("2026-10-30T00:00:00Z"),
    ...data,
  }));
});

describe("POST /api/affiliate/accept-terms", () => {
  it("401 when signed out — nothing recorded", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await post({});
    expect(res.status).toBe(401);
    expect(mocks.createAcceptance).not.toHaveBeenCalled();
  });

  it("records the acceptance with the current terms version by default", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    const res = await post({});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accepted).toBe(true);
    expect(body.already).toBe(false);
    expect(body.termsVersion).toBe(AFFILIATE_TERMS_VERSION);
    expect(mocks.createAcceptance).toHaveBeenCalledWith({
      data: { userId: "u1", termsVersion: AFFILIATE_TERMS_VERSION, source: "demo" },
    });
  });

  it("is idempotent: an existing acceptance is returned, never duplicated", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1" } });
    mocks.findAcceptance.mockResolvedValue({
      termsVersion: AFFILIATE_TERMS_VERSION,
      acceptedAt: new Date("2026-10-29T12:00:00Z"),
    });
    const res = await post({});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.already).toBe(true);
    expect(body.acceptedAt).toBe("2026-10-29T12:00:00.000Z");
    expect(mocks.createAcceptance).not.toHaveBeenCalled();
  });
});
