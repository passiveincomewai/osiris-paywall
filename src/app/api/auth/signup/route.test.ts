// Signup + newsletter opt-in pins:
//  - the opt-in is opt-in only: nothing touches the newsletter list
//    unless the form's checkbox sent newsletterOptIn === true;
//  - opting in subscribes through the one existing routine, tagged
//    source "signup" (instant validation since 2026-10-28: an
//    already-verified row + welcome email, no confirmation step);
//  - an already-subscribed address changes nothing and shows no error;
//  - a newsletter failure never fails the signup (logged, swallowed).
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(async () => null as unknown),
  userCreate: vi.fn(async () => ({ id: "user_1" }) as unknown),
  tokenDeleteMany: vi.fn(async () => ({})),
  tokenCreate: vi.fn(async () => ({})),
  subFindUnique: vi.fn(async () => null as unknown),
  subCreate: vi.fn(
    async (_arg: { data: { email: string; source: string | null } }) => ({
      unsubToken: "unsub-fixture",
    }),
  ),
  subUpdate: vi.fn(async () => ({ unsubToken: "unsub-fixture" })),
  sendEmail: vi.fn(async () => true),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
    verificationToken: { deleteMany: mocks.tokenDeleteMany, create: mocks.tokenCreate },
    newsletterSubscriber: {
      findUnique: mocks.subFindUnique,
      create: mocks.subCreate,
      update: mocks.subUpdate,
    },
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  emailConfigured: () => true,
  verificationEmail: () => ({ subject: "Verify your email", html: "<p>verify</p>" }),
  newsletterVerifyEmail: (url: string) => ({ subject: "Confirm your subscription", html: url }),
  newsletterWelcomeEmail: (url: string) => ({ subject: "You're on the list", html: url }),
  appUrl: (path: string) => `https://worldeye.app${path}`,
}));
vi.mock("node:dns/promises", () => ({
  resolveMx: async () => [{ exchange: "mx.fixture-mail.com", priority: 10 }],
  resolve4: async () => ["192.0.2.1"],
  resolve6: async () => [],
}));
vi.mock("@/lib/growth", () => ({
  sendGrowthEvent: vi.fn(),
  hashUserRef: () => "ref",
  utmFromRequest: () => ({}),
}));

import { POST } from "./route";

let ip = 0;
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${++ip}` },
      body: JSON.stringify(body),
    }),
  );

const FORM = { name: "Ada", email: "ada@fixture-mail.com", password: "hunter2-hunter2" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userFindUnique.mockResolvedValue(null);
  mocks.userCreate.mockResolvedValue({ id: "user_1" });
  mocks.subFindUnique.mockResolvedValue(null);
  mocks.sendEmail.mockResolvedValue(true);
});

describe("POST /api/auth/signup — newsletter opt-in", () => {
  it("opted in: account created and the address subscribed with source 'signup'", async () => {
    const res = await post({ ...FORM, newsletterOptIn: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, userId: "user_1" });
    expect(mocks.subCreate).toHaveBeenCalledTimes(1);
    const arg = mocks.subCreate.mock.calls[0]![0];
    expect(arg.data.email).toBe("ada@fixture-mail.com");
    expect(arg.data.source).toBe("signup");
  });

  it("checkbox absent: account created, newsletter never touched", async () => {
    const res = await post(FORM);
    expect(res.status).toBe(200);
    expect(mocks.subFindUnique).not.toHaveBeenCalled();
    expect(mocks.subCreate).not.toHaveBeenCalled();
    expect(mocks.subUpdate).not.toHaveBeenCalled();
  });

  it("checkbox explicitly off: newsletter never touched", async () => {
    const res = await post({ ...FORM, newsletterOptIn: false });
    expect(res.status).toBe(200);
    expect(mocks.subCreate).not.toHaveBeenCalled();
  });

  it("already subscribed (verified): signup succeeds, no duplicate row, no email", async () => {
    mocks.subFindUnique.mockResolvedValue({ email: FORM.email, verified: true, source: "footer" });
    const res = await post({ ...FORM, newsletterOptIn: true });
    expect(res.status).toBe(200);
    expect(mocks.subCreate).not.toHaveBeenCalled();
    expect(mocks.subUpdate).not.toHaveBeenCalled();
  });

  it("newsletter blows up: the signup still succeeds", async () => {
    mocks.subFindUnique.mockRejectedValue(new Error("db down"));
    const res = await post({ ...FORM, newsletterOptIn: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, userId: "user_1" });
  });
});
