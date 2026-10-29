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
vi.mock("node:dns/promises", () => {
  const err = (code: string) => {
    const e = new Error(code) as NodeJS.ErrnoException;
    e.code = code;
    return e;
  };
  // Domain-aware stub for the signup real-email gate tests: one domain
  // provably does not exist (NXDOMAIN on every lookup), one domain's
  // lookups all fail transiently (the retryable path). Everything else
  // publishes an MX record as before.
  return {
    resolveMx: async (domain: string) => {
      if (domain === "no-such-domain-xyz.com") throw err("ENOTFOUND");
      if (domain === "flaky-dns-xyz.com") throw err("ESERVFAIL");
      return [{ exchange: "mx.fixture-mail.com", priority: 10 }];
    },
    resolve4: async (domain: string) => {
      if (domain === "no-such-domain-xyz.com") throw err("ENOTFOUND");
      if (domain === "flaky-dns-xyz.com") throw err("ESERVFAIL");
      return ["192.0.2.1"];
    },
    resolve6: async (domain: string) => {
      if (domain === "no-such-domain-xyz.com") throw err("ENOTFOUND");
      if (domain === "flaky-dns-xyz.com") throw err("ESERVFAIL");
      return [];
    },
  };
});
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

describe("POST /api/auth/signup — real-email gate (2026-10-29)", () => {
  // The shared validator (lib/email/validate-email) runs BEFORE the
  // user row exists: every rejection below must leave userCreate
  // uncalled — no partial accounts, ever.
  it("malformed address: 400, no account created", async () => {
    const res = await post({ ...FORM, email: "not-an-email" });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("syntax");
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("disposable domain: 400, no account created", async () => {
    const res = await post({ ...FORM, email: "ada@mailinator.com" });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("disposable_domain");
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("junk pattern (a@a.com shape): 400, no account created", async () => {
    const res = await post({ ...FORM, email: "a@a.com" });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("junk_pattern");
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("nonexistent domain (NXDOMAIN): 400 no_mail_server, no account created", async () => {
    const res = await post({ ...FORM, email: "ada@no-such-domain-xyz.com" });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("no_mail_server");
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("transient DNS failure: retryable 503, no account created, address NOT declared fake", async () => {
    const res = await post({ ...FORM, email: "ada@flaky-dns-xyz.com" });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("dns_unavailable");
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("typo domain: 400 with the suggestion, no account created", async () => {
    const res = await post({ ...FORM, email: "ada@gmial.com" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("typo_suggestion");
    expect(body.suggestion).toBe("ada@gmail.com");
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });
});
