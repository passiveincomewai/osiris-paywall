// Resend-verification pins (the 2026-10-29 "resend button isn't
// working" fix):
//  - the response reports the REAL send outcome for an unverified
//    password account: { sent: true } only when the email went out,
//    502 when the send failed (the old code always answered ok and
//    every surface claimed "sent" for silent no-ops);
//  - no account / verified account / OAuth-only stays a silent
//    { ok: true } with NO send attempted (no enumeration signal);
//  - one send per email per minute, enforced on real sends only.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(async () => null as unknown),
  tokenDeleteMany: vi.fn(async () => ({})),
  tokenCreate: vi.fn(async () => ({})),
  sendEmail: vi.fn(async () => true),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.userFindUnique },
    verificationToken: { deleteMany: mocks.tokenDeleteMany, create: mocks.tokenCreate },
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  emailConfigured: () => true,
  verificationEmail: () => ({ subject: "Verify your email", html: "<p>verify</p>" }),
  appUrl: (path: string) => `https://worldeye.app${path}`,
}));

import { POST } from "./route";

let ipCounter = 100;
function makeReq(email: string) {
  ipCounter += 1;
  return new Request("https://worldeye.app/api/auth/resend-verification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `198.51.100.${ipCounter % 250}`,
    },
    body: JSON.stringify({ email }),
  });
}

beforeEach(() => {
  mocks.userFindUnique.mockReset();
  mocks.userFindUnique.mockImplementation(async () => null);
  mocks.sendEmail.mockReset();
  mocks.sendEmail.mockImplementation(async () => true);
  mocks.tokenCreate.mockClear();
});

describe("POST /api/auth/resend-verification", () => {
  it("sends and reports sent:true for an unverified password account", async () => {
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "pending1@example.com",
      name: "Pending",
      passwordHash: "hash",
      emailVerified: null,
    }));
    const res = await POST(makeReq("pending1@example.com"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sent: true });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.tokenCreate).toHaveBeenCalledTimes(1);
  });

  it("502s when the send actually fails — no fake success", async () => {
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "pending2@example.com",
      name: null,
      passwordHash: "hash",
      emailVerified: null,
    }));
    mocks.sendEmail.mockImplementation(async () => false);
    const res = await POST(makeReq("pending2@example.com"));
    expect(res.status).toBe(502);
  });

  it("rate-limits a second send to the same email within a minute", async () => {
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "pending3@example.com",
      name: null,
      passwordHash: "hash",
      emailVerified: null,
    }));
    const first = await POST(makeReq("pending3@example.com"));
    expect(first.status).toBe(200);
    const second = await POST(makeReq("pending3@example.com"));
    expect(second.status).toBe(429);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("stays silent (no send) for an already-verified account", async () => {
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "done@example.com",
      name: null,
      passwordHash: "hash",
      emailVerified: new Date(),
    }));
    const res = await POST(makeReq("done@example.com"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("stays silent for an unknown address", async () => {
    const res = await POST(makeReq("ghost@example.com"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
