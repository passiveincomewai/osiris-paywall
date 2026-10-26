// Admin camera-submission route pins:
//  - the REAL requireAdmin() gate (ADMIN_EMAILS) refuses signed-out and
//    non-admin callers with 403;
//  - an admin can approve (cleared-for-import) or reject a pending
//    submission: status, reviewer notes, reviewedBy/At are stamped and
//    the decision email goes to the submitter;
//  - a decided submission can't be decided again (409), unknown ids 404,
//    unknown decisions 400.
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.ADMIN_EMAILS = "boss@worldeye.app";

const SUB = {
  id: "sub_1",
  kind: "own",
  cameraName: "Pier 39 Sea Lions",
  url: "https://cams.example.com/pier39.m3u8",
  category: "nature",
  city: "San Francisco",
  country: "United States",
  lat: 37.8087,
  lng: -122.4098,
  notes: null as string | null,
  submitterName: "Jane Smith",
  submitterEmail: "jane@example.com",
  declaration: true,
  status: "pending",
  probeStatus: "reachable",
  probeDetail: "HTTP 200 at review intake",
  reviewerNotes: null as string | null,
  reviewedBy: null as string | null,
  reviewedAt: null as Date | null,
  receiptEmailedAt: new Date("2026-10-24T12:00:00Z"),
  decisionEmailedAt: null as Date | null,
  createdAt: new Date("2026-10-24T12:00:00Z"),
};

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as unknown),
  findUnique: vi.fn(async () => null as unknown),
  update: vi.fn(async (arg: { data: Record<string, unknown> }) => ({ ...SUB, ...arg.data })),
  auditCreate: vi.fn(async () => ({})),
  sendEmail: vi.fn(async () => true),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    cameraSubmission: { findUnique: mocks.findUnique, update: mocks.update },
    affiliateAuditLog: { create: mocks.auditCreate },
  },
}));
vi.mock("@/lib/email", async (importActual) => {
  const actual = (await importActual()) as Record<string, unknown>;
  return { ...actual, sendEmail: mocks.sendEmail };
});

import { PATCH } from "./route";

const ctx = { params: Promise.resolve({ id: "sub_1" }) };
const patch = (body: unknown) =>
  PATCH(
    new Request("http://localhost/api/admin/camera-submissions/sub_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx,
  );

const ADMIN = { user: { id: "u_admin", email: "boss@worldeye.app" } };

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.auth.mockResolvedValue(ADMIN);
  mocks.findUnique.mockReset();
  mocks.findUnique.mockResolvedValue({ ...SUB });
  mocks.update.mockClear();
  mocks.auditCreate.mockClear();
  mocks.sendEmail.mockClear();
});

describe("PATCH /api/admin/camera-submissions/[id]", () => {
  it("refuses signed-out and non-admin callers with 403", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await patch({ decision: "approve" })).status).toBe(403);
    mocks.auth.mockResolvedValue({ user: { id: "u_9", email: "fan@example.com" } });
    expect((await patch({ decision: "approve" })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("approves a pending submission, stamps the review and emails the decision", async () => {
    const res = await patch({ decision: "approve", reviewerNotes: "Verified live and public." });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j).toMatchObject({ id: "sub_1", status: "approved", decisionEmailed: true });

    const data = mocks.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      status: "approved",
      reviewerNotes: "Verified live and public.",
      reviewedBy: "boss@worldeye.app",
    });
    expect(data.reviewedAt).toBeInstanceOf(Date);
    // The decision-email stamp follows the successful send.
    expect(mocks.update.mock.calls[1][0].data).toMatchObject({
      decisionEmailedAt: expect.any(Date),
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      "jane@example.com",
      expect.stringContaining("Pier 39 Sea Lions"),
      expect.any(String),
    );
    expect(mocks.auditCreate).toHaveBeenCalled();
  });

  it("rejects a pending submission and notes it can omit reviewer notes", async () => {
    const res = await patch({ decision: "reject" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "rejected" });
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({
      status: "rejected",
      reviewerNotes: null,
    });
  });

  it("answers 409 when the submission was already decided", async () => {
    mocks.findUnique.mockResolvedValue({ ...SUB, status: "approved" });
    const res = await patch({ decision: "reject" });
    expect(res.status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown submission and 400 for an unknown decision", async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect((await patch({ decision: "approve" })).status).toBe(404);
    mocks.findUnique.mockResolvedValue({ ...SUB });
    expect((await patch({ decision: "maybe" })).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
