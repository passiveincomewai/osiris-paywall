// Route tests for /api/auth/change-email (request / status / cancel).
// Pins what the settings form relies on:
//  - signed-out callers get 401 and nothing is written or sent;
//  - invalid, same-as-current, and already-registered addresses are
//    honest 400/409 errors with no token created;
//  - a good request stores ONE pending token (identifier carries the
//    user id + new address, 24h expiry) and emails the confirm link to
//    the NEW address — the account email itself is never written here;
//  - a failed send rolls the token back;
//  - GET reports the pending address parsed from the token row, and
//    DELETE clears it.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string } } | null),
  userFindUnique: vi.fn(
    async (_arg: { where: { id?: string; email?: string } }) => null as unknown,
  ),
  tokenFindFirst: vi.fn(async () => null as unknown),
  tokenCreate: vi.fn(
    async (_arg: { data: { identifier: string; token: string; expires: Date } }) => ({}),
  ),
  tokenDelete: vi.fn(async () => ({})),
  tokenDeleteMany: vi.fn(async () => ({})),
  sendEmail: vi.fn(async (_to: string, _subject: string, _html: string) => true),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.userFindUnique },
    verificationToken: {
      findFirst: mocks.tokenFindFirst,
      create: mocks.tokenCreate,
      delete: mocks.tokenDelete,
      deleteMany: mocks.tokenDeleteMany,
    },
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  emailConfigured: () => true,
  appUrl: (path: string) => `https://worldeye.app${path}`,
}));

import { GET, POST, DELETE } from "./route";
import { changeEmailIdentifier, changeEmailUserPrefix } from "./token";

const CURRENT = { id: "user-1", email: "old@example.com", name: "Ada" };

let ipSeq = 0;
/** Unique XFF per POST so the per-IP rate limiter never trips mid-suite. */
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/auth/change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.9.0.${++ipSeq}` },
      body: JSON.stringify(body),
    }),
  );
const get = () => GET();
const del = () => DELETE();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  // One findUnique serves both lookups: by id (the caller) and by email
  // (the would-be owner of the new address).
  mocks.userFindUnique.mockImplementation(async (arg: { where: { id?: string; email?: string } }) => {
    if (arg.where.id) return arg.where.id === "user-1" ? CURRENT : null;
    if (arg.where.email === "taken@example.com") return { id: "someone-else" };
    return null;
  });
  mocks.tokenFindFirst.mockResolvedValue(null);
  mocks.sendEmail.mockResolvedValue(true);
});

describe("POST /api/auth/change-email", () => {
  it("rejects signed-out callers with 401 and writes nothing", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await post({ newEmail: "new@example.com" });
    expect(res.status).toBe(401);
    expect(mocks.tokenCreate).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects an invalid address with 400", async () => {
    const res = await post({ newEmail: "not-an-email" });
    expect(res.status).toBe(400);
    expect(mocks.tokenCreate).not.toHaveBeenCalled();
  });

  it("rejects the current address with 400", async () => {
    const res = await post({ newEmail: " OLD@example.com " });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "That's already your account email." });
    expect(mocks.tokenCreate).not.toHaveBeenCalled();
  });

  it("rejects an address owned by another account with 409", async () => {
    const res = await post({ newEmail: "taken@example.com" });
    expect(res.status).toBe(409);
    expect(mocks.tokenCreate).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("happy path: one 24h token, confirm link emailed to the NEW address", async () => {
    const res = await post({ newEmail: "New@Example.com" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, pendingEmail: "new@example.com" });

    // Previous pending change cleared before the new token is stored.
    expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({
      where: { identifier: { startsWith: changeEmailUserPrefix("user-1") } },
    });
    expect(mocks.tokenCreate).toHaveBeenCalledTimes(1);
    const created = mocks.tokenCreate.mock.calls[0]![0];
    expect(created.data.identifier).toBe(changeEmailIdentifier("user-1", "new@example.com"));
    expect(created.data.token).toMatch(/^[0-9a-f]{64}$/);
    const ttl = created.data.expires.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(23 * 3600 * 1000);
    expect(ttl).toBeLessThanOrEqual(24 * 3600 * 1000 + 5000);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const [to, , html] = mocks.sendEmail.mock.calls[0]!;
    expect(to).toBe("new@example.com");
    expect(html).toContain("/api/auth/change-email/confirm?token=");
    expect(html).toContain("email=new%40example.com");
  });

  it("rolls the token back when the send fails", async () => {
    mocks.sendEmail.mockResolvedValue(false);
    const res = await post({ newEmail: "new@example.com" });
    expect(res.status).toBe(500);
    expect(mocks.tokenCreate).toHaveBeenCalledTimes(1);
    expect(mocks.tokenDelete).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/auth/change-email", () => {
  it("401 when signed out", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it("reports no pending change", async () => {
    const res = await get();
    expect(await res.json()).toEqual({ pendingEmail: null });
  });

  it("reports the pending address parsed from the token row", async () => {
    mocks.tokenFindFirst.mockResolvedValue({
      identifier: changeEmailIdentifier("user-1", "new@example.com"),
      token: "t",
      expires: new Date(Date.now() + 3600 * 1000),
    });
    const res = await get();
    expect(await res.json()).toEqual({ pendingEmail: "new@example.com" });
  });

  it("clears and hides an expired pending change", async () => {
    mocks.tokenFindFirst.mockResolvedValue({
      identifier: changeEmailIdentifier("user-1", "new@example.com"),
      token: "t",
      expires: new Date(Date.now() - 1000),
    });
    const res = await get();
    expect(await res.json()).toEqual({ pendingEmail: null });
    expect(mocks.tokenDeleteMany).toHaveBeenCalled();
  });
});

describe("DELETE /api/auth/change-email", () => {
  it("401 when signed out", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await del()).status).toBe(401);
    expect(mocks.tokenDeleteMany).not.toHaveBeenCalled();
  });

  it("clears the caller's pending change", async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({
      where: { identifier: { startsWith: changeEmailUserPrefix("user-1") } },
    });
  });
});
