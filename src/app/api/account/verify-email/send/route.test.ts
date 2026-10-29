// Settings verify-send pins (POST /api/account/verify-email/send):
//  - signed-out → 401;
//  - unverified credentials user → the shared send actually runs and
//    the response says sent:true;
//  - a send failure → 502 with a message (never a fake "sent");
//  - already-verified column → alreadyVerified, no send;
//  - provider-verified (Google link, column null — the legacy
//    unstamped rows) → alreadyVerified AND the stamp is written.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as unknown),
  userFindUnique: vi.fn(async () => null as unknown),
  userUpdateMany: vi.fn(async () => ({ count: 1 })),
  tokenDeleteMany: vi.fn(async () => ({})),
  tokenCreate: vi.fn(async () => ({})),
  sendEmail: vi.fn(async () => true),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
      updateMany: mocks.userUpdateMany,
    },
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

const asUser = (id: string) => ({ user: { id } });

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.auth.mockImplementation(async () => null);
  mocks.userFindUnique.mockReset();
  mocks.userFindUnique.mockImplementation(async () => null);
  mocks.userUpdateMany.mockClear();
  mocks.sendEmail.mockReset();
  mocks.sendEmail.mockImplementation(async () => true);
  mocks.tokenCreate.mockClear();
});

describe("POST /api/account/verify-email/send", () => {
  it("401s signed-out callers", async () => {
    const res = await POST();
    expect(res.status).toBe(401);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("sends for an unverified credentials user", async () => {
    mocks.auth.mockImplementation(async () => asUser("u_unverified"));
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "fresh@example.com",
      name: "Fresh",
      emailVerified: null,
      accounts: [],
    }));
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sent: true });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("502s when the send fails", async () => {
    mocks.auth.mockImplementation(async () => asUser("u_fail"));
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "fail@example.com",
      name: null,
      emailVerified: null,
      accounts: [],
    }));
    mocks.sendEmail.mockImplementation(async () => false);
    const res = await POST();
    expect(res.status).toBe(502);
  });

  it("alreadyVerified when the column is set — no send", async () => {
    mocks.auth.mockImplementation(async () => asUser("u_done"));
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "done@example.com",
      name: null,
      emailVerified: new Date(),
      accounts: [],
    }));
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, alreadyVerified: true });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("provider-verified (Google link, null column) → alreadyVerified + stamp written", async () => {
    mocks.auth.mockImplementation(async () => asUser("u_google"));
    mocks.userFindUnique.mockImplementation(async () => ({
      email: "googler@example.com",
      name: null,
      emailVerified: null,
      accounts: [{ provider: "google" }],
    }));
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, alreadyVerified: true });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.userUpdateMany).toHaveBeenCalledTimes(1);
  });
});
