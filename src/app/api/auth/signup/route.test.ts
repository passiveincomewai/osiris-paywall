// Signup + newsletter opt-in pins:
//  - the opt-in is opt-in only: nothing touches the newsletter list
//    unless the form's checkbox sent newsletterOptIn === true;
//  - opting in subscribes through the one existing routine, tagged
//    source "signup" (double opt-in row + verification email);
//  - an already-subscribed address changes nothing and shows no error;
//  - a newsletter failure never fails the signup (logged, swallowed).
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(async () => null as unknown),
  userCreate: vi.fn(async () => ({ id: "user_1" }) as unknown),
  tokenDeleteMany: vi.fn(async () => ({})),
  tokenCreate: vi.fn(async () => ({})),
  subFindUnique: vi.fn(async () => null as unknown),
  subCreate: vi.fn(async () => ({})),
  subUpdate: vi.fn(async () => ({})),
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
  appUrl: (path: string) => `https://worldeye.app${path}`,
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

const FORM = { name: "Ada", email: "ada@example.com", password: "hunter2-hunter2" };

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
    const arg = mocks.subCreate.mock.calls[0]![0] as { data: { email: string; source: string } };
    expect(arg.data.email).toBe("ada@example.com");
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
