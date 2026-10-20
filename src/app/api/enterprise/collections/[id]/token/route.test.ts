// Token door pins: regeneration stores ONLY the new token's hash (the
// old token's hash is gone — regeneration is revocation), the plaintext
// comes back exactly once in this response, and another customer's
// collection is a 404.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(async () => ({ ok: true, userId: "owner-1", enterprise: true }) as unknown),
  findFirst: vi.fn(async () => null as null | { id: string; userId: string }),
  update: vi.fn(async () => ({})),
}));

vi.mock("@/lib/enterprise/access", () => ({ enterpriseAccess: mocks.access }));
vi.mock("@/lib/db", () => ({
  db: { cameraCollection: { findFirst: mocks.findFirst, update: mocks.update } },
}));

import { POST, DELETE } from "./route";
import { hashSecret, looksLikeFeedToken } from "@/lib/enterprise/tokens";

const call = (fn: typeof POST, id: string) =>
  fn(
    new Request(`https://worldeye.app/api/enterprise/collections/${id}/token`, { method: "POST" }) as never,
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ ok: true, userId: "owner-1", enterprise: true });
  mocks.findFirst.mockImplementation(async ({ where }: { where: { id: string; userId: string } }) =>
    where.id === "col-1" && where.userId === "owner-1" ? { id: "col-1", userId: "owner-1" } : null,
  );
});

describe("/api/enterprise/collections/[id]/token", () => {
  it("returns the plaintext token once and stores only its hash", async () => {
    const res = await call(POST, "col-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(looksLikeFeedToken(body.token)).toBe(true);
    expect(body.feedUrl).toBe(`https://worldeye.app/api/feed/${body.token}`);
    expect(body.embedUrl).toBe(`https://worldeye.app/embed/${body.token}`);
    expect(body.embedSnippet).toContain(body.embedUrl);
    // What landed in the DB is the hash of exactly this token — so the
    // previous token (whose hash this replaced) no longer resolves, and
    // the plaintext itself is never what gets stored.
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "col-1" },
      data: { feedTokenHash: hashSecret(body.token) },
    });
    const stored = (mocks.update.mock.calls[0] as [{ data: { feedTokenHash: string } }])[0].data.feedTokenHash;
    expect(stored).not.toBe(body.token);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
  });

  it("two generations produce different tokens", async () => {
    const a = await (await call(POST, "col-1")).json();
    const b = await (await call(POST, "col-1")).json();
    expect(a.token).not.toBe(b.token);
  });

  it("404s another customer's collection", async () => {
    const res = await call(POST, "col-of-someone-else");
    expect(res.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("DELETE turns the feed off (hash cleared)", async () => {
    const res = await call(DELETE, "col-1");
    expect(res.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "col-1" },
      data: { feedTokenHash: null },
    });
  });
});
