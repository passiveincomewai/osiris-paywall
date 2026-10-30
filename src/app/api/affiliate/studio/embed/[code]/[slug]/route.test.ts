// Route tests for GET /api/affiliate/studio/embed/[code]/[slug].
// The endpoint is PUBLIC (the code+slug pair is the address, like
// /ref/<code>): these tests pin the resolution rules (active profiles
// only, published templates only, ambassador gating), the preview
// semantics (default values, no credit machinery involved), the IP
// rate limit, and the ETag/304 cache behaviour.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  class FakeQrValidationError extends Error {
    constructor(message = "qr") {
      super(message);
      this.name = "QrValidationError";
    }
  }
  return {
  FakeQrValidationError,
  rateLimited: vi.fn(() => false),
  findByCode: vi.fn(async () => null as null | { id: string; userId: string; referralCode: string; customCode: string | null }),
  findProfile: vi.fn(async () => null as null | Record<string, unknown>),
  findTemplate: vi.fn(async () => null as null | Record<string, unknown>),
  buildCtx: vi.fn(async () => ({ code: "jane42", link: "https://worldeye.app/ref/jane42" })),
  render: vi.fn(async () => ({
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    format: "png" as const,
    width: 728,
    height: 90,
    renderHash: "hash123",
  })),
  };
});

vi.mock("@/lib/password-auth", () => ({
  clientIp: () => "203.0.113.9",
  isRateLimited: mocks.rateLimited,
}));
vi.mock("@/lib/affiliate/attribution", () => ({
  findAffiliateByCode: mocks.findByCode,
}));
vi.mock("@/lib/db", () => ({
  db: {
    affiliateProfile: { findUnique: mocks.findProfile },
    marketingTemplate: { findFirst: mocks.findTemplate },
  },
}));
vi.mock("@/lib/studio/context", () => ({ buildStudioContext: mocks.buildCtx }));
vi.mock("@/lib/studio/render", () => ({
  QrValidationError: mocks.FakeQrValidationError,
  computeRenderHash: () => "hash123",
  renderTemplate: mocks.render,
  // Faithful-enough stand-in: fills defaults, enforces required fields.
  validateValues: (fields: { key: string; required?: boolean; default?: unknown }[], raw: Record<string, unknown>) => {
    const values: Record<string, string> = {};
    for (const f of fields) {
      const d = raw[f.key] ?? f.default;
      values[f.key] = d === undefined || d === null ? "" : String(d);
      if (f.required && !values[f.key]) return { error: `Field "${f.key}" is required` };
    }
    return { values };
  },
}));

import { GET } from "./route";

const PROFILE = { id: "prof-1", userId: "u1", status: "active", isAmbassador: false };
const TEMPLATE = {
  slug: "banner-x",
  category: "banner",
  width: 728,
  height: 90,
  svgBody: "<svg/>",
  assetUrl: null,
  editableFields: [] as unknown[],
  layers: [] as unknown[],
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
};

function call(code = "jane42", slug = "banner-x", url = "https://worldeye.app/api/x", headers?: HeadersInit) {
  return GET(new Request(url, { headers }), { params: Promise.resolve({ code, slug }) });
}

describe("GET /api/affiliate/studio/embed/[code]/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimited.mockReturnValue(false);
    mocks.findByCode.mockResolvedValue({ id: "prof-1", userId: "u1", referralCode: "jane42", customCode: null });
    mocks.findProfile.mockResolvedValue({ ...PROFILE });
    mocks.findTemplate.mockResolvedValue({ ...TEMPLATE });
  });

  it("rate limited IP → 429 before any lookup", async () => {
    mocks.rateLimited.mockReturnValue(true);
    const res = await call();
    expect(res.status).toBe(429);
    expect(mocks.findByCode).not.toHaveBeenCalled();
  });

  it("unknown code → 404", async () => {
    mocks.findByCode.mockResolvedValue(null);
    const res = await call("nobody");
    expect(res.status).toBe(404);
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("profile suspended between resolution and fetch → 404", async () => {
    mocks.findProfile.mockResolvedValue({ ...PROFILE, status: "suspended" });
    const res = await call();
    expect(res.status).toBe(404);
  });

  it("unknown slug → 404", async () => {
    mocks.findTemplate.mockResolvedValue(null);
    const res = await call("jane42", "nope");
    expect(res.status).toBe(404);
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("ambassador template + non-ambassador profile → 404", async () => {
    mocks.findTemplate.mockResolvedValue({ ...TEMPLATE, category: "ambassador" });
    const res = await call();
    expect(res.status).toBe(404);
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("ambassador template + ambassador profile → 200", async () => {
    mocks.findTemplate.mockResolvedValue({ ...TEMPLATE, category: "ambassador" });
    mocks.findProfile.mockResolvedValue({ ...PROFILE, isAmbassador: true });
    const res = await call();
    expect(res.status).toBe(200);
  });

  it("template without svgBody → 404", async () => {
    mocks.findTemplate.mockResolvedValue({ ...TEMPLATE, svgBody: null });
    const res = await call();
    expect(res.status).toBe(404);
  });

  it("required field without a default → 400 (cannot embed defaults)", async () => {
    mocks.findTemplate.mockResolvedValue({
      ...TEMPLATE,
      editableFields: [{ key: "headline", label: "Headline", type: "text", required: true }],
    });
    const res = await call();
    expect(res.status).toBe(400);
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("bad format → 400", async () => {
    const res = await call("jane42", "banner-x", "https://worldeye.app/api/x?format=gif");
    expect(res.status).toBe(400);
  });

  it("happy path → 200 image with ETag + public cache headers", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("etag")).toBe('"hash123"');
    expect(res.headers.get("cache-control")).toContain("public");
    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
    expect(res.headers.get("content-disposition")).toContain("inline");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(mocks.render).toHaveBeenCalledTimes(1);
  });

  it("matching If-None-Match → 304 without rendering", async () => {
    const res = await call("jane42", "banner-x", "https://worldeye.app/api/x", { "if-none-match": '"hash123"' });
    expect(res.status).toBe(304);
    expect(res.headers.get("etag")).toBe('"hash123"');
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("QR validation failure → 422, fail closed", async () => {
    mocks.render.mockRejectedValueOnce(new mocks.FakeQrValidationError());
    const res = await call();
    expect(res.status).toBe(422);
  });
});
