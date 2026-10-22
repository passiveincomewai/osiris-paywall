// Admin contact-message route pins:
//  - the REAL requireAdmin() gate (ADMIN_EMAILS) refuses signed-out and
//    non-admin callers with 403 on both PATCH and DELETE;
//  - an admin can move a message unread → read → resolved (readAt stamps
//    on first read, clears on reopen) and delete it;
//  - unknown ids 404 and unknown statuses 400 — for admins only.
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

process.env.ADMIN_EMAILS = "boss@worldeye.app";

const MSG = {
  id: "msg_1",
  name: "Jane Smith",
  email: "jane@example.com",
  topic: "billing",
  message: "Charged twice this month.",
  status: "unread",
  readAt: null as Date | null,
  createdAt: new Date("2026-10-20T12:00:00Z"),
};

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as unknown),
  findUnique: vi.fn(async () => null as unknown),
  update: vi.fn(async (arg: { data: Record<string, unknown> }) => ({ ...MSG, ...arg.data })),
  del: vi.fn(async () => ({})),
  auditCreate: vi.fn(async () => ({})),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    contactMessage: {
      findUnique: mocks.findUnique,
      update: mocks.update,
      delete: mocks.del,
    },
    affiliateAuditLog: { create: mocks.auditCreate },
  },
}));

import { PATCH, DELETE } from "./route";

const ctx = { params: Promise.resolve({ id: "msg_1" }) };
const patch = (body: unknown) =>
  PATCH(
    new Request("http://localhost/api/admin/contact/msg_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx,
  );
const del = () =>
  DELETE(new Request("http://localhost/api/admin/contact/msg_1", { method: "DELETE" }), ctx);

const asUser = (email: string | null) =>
  mocks.auth.mockResolvedValue(email ? { user: { id: "u_1", email } } : null);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue({ ...MSG });
  mocks.update.mockImplementation(async (arg: { data: Record<string, unknown> }) => ({ ...MSG, ...arg.data }));
});

afterAll(() => {
  delete process.env.ADMIN_EMAILS;
});

describe("admin contact route auth gate", () => {
  it("refuses a signed-out caller with 403", async () => {
    asUser(null);
    expect((await patch({ status: "read" })).status).toBe(403);
    expect((await del()).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.del).not.toHaveBeenCalled();
  });

  it("refuses a signed-in non-admin with 403", async () => {
    asUser("someone@example.com");
    expect((await patch({ status: "read" })).status).toBe(403);
    expect((await del()).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("admin contact route actions", () => {
  beforeEach(() => asUser("boss@worldeye.app"));

  it("marks a message read and stamps readAt", async () => {
    const res = await patch({ status: "read" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "msg_1", status: "read" });
    const data = mocks.update.mock.calls[0][0].data;
    expect(data.status).toBe("read");
    expect(data.readAt).toBeInstanceOf(Date);
  });

  it("resolves a message, keeping the original readAt", async () => {
    const firstRead = new Date("2026-10-20T13:00:00Z");
    mocks.findUnique.mockResolvedValue({ ...MSG, status: "read", readAt: firstRead });
    const res = await patch({ status: "resolved" });
    expect(res.status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data.readAt).toBe(firstRead);
  });

  it("reopening as unread clears readAt", async () => {
    mocks.findUnique.mockResolvedValue({ ...MSG, status: "resolved", readAt: new Date() });
    const res = await patch({ status: "unread" });
    expect(res.status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data.readAt).toBeNull();
  });

  it("rejects an unknown status with 400", async () => {
    expect((await patch({ status: "spam" })).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("404s an unknown message id", async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect((await patch({ status: "read" })).status).toBe(404);
    expect((await del()).status).toBe(404);
  });

  it("deletes a message", async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: "msg_1" });
    expect(mocks.del).toHaveBeenCalledTimes(1);
  });
});
