// Claim-account + newsletter opt-in pins (the /welcome path — how a
// guest-checkout buyer becomes an account):
//  - opting in subscribes the PURCHASE email (from the verified Stripe
//    session, never from the request body) through the one existing
//    routine, tagged source "welcome-claim";
//  - no tick = the list is never touched;
//  - already-subscribed is a silent no-op, and a newsletter failure
//    never fails a paid claim.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  retrieveSession: vi.fn(async () => ({}) as unknown),
  userFindUnique: vi.fn(async () => null as unknown),
  userCreate: vi.fn(async () => ({})),
  userUpdate: vi.fn(async () => ({})),
  subFindUnique: vi.fn(async () => null as unknown),
  subCreate: vi.fn(
    async (_arg: { data: { email: string; verifyToken: string; source: string | null } }) => ({}),
  ),
  subUpdate: vi.fn(async () => ({})),
  sendEmail: vi.fn(async () => true),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: () => ({ checkout: { sessions: { retrieve: mocks.retrieveSession } } }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.userFindUnique, create: mocks.userCreate, update: mocks.userUpdate },
    newsletterSubscriber: {
      findUnique: mocks.subFindUnique,
      create: mocks.subCreate,
      update: mocks.subUpdate,
    },
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  newsletterVerifyEmail: (url: string) => ({ subject: "Confirm your subscription", html: url }),
  appUrl: (path: string) => `https://worldeye.app${path}`,
}));

import { POST } from "./route";

let ip = 0;
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/auth/claim-account", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.1.0.${++ip}` },
      body: JSON.stringify(body),
    }),
  );

const FORM = {
  session_id: "cs_test_123",
  username: "Anthony",
  phone: "+1 801 555 1234",
  password: "hunter2-hunter2",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.retrieveSession.mockResolvedValue({
    status: "complete",
    mode: "subscription",
    customer: { email: "buyer@example.com" },
    customer_email: "buyer@example.com",
  });
  mocks.userFindUnique.mockResolvedValue(null);
  mocks.subFindUnique.mockResolvedValue(null);
  mocks.sendEmail.mockResolvedValue(true);
});

describe("POST /api/auth/claim-account — newsletter opt-in", () => {
  it("opted in: claim succeeds and the purchase email is subscribed with source 'welcome-claim'", async () => {
    const res = await post({ ...FORM, newsletterOptIn: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, email: "buyer@example.com" });
    expect(mocks.subCreate).toHaveBeenCalledTimes(1);
    const arg = mocks.subCreate.mock.calls[0]![0];
    expect(arg.data.email).toBe("buyer@example.com");
    expect(arg.data.source).toBe("welcome-claim");
  });

  it("no tick: claim succeeds, newsletter never touched", async () => {
    const res = await post(FORM);
    expect(res.status).toBe(200);
    expect(mocks.subFindUnique).not.toHaveBeenCalled();
    expect(mocks.subCreate).not.toHaveBeenCalled();
    expect(mocks.subUpdate).not.toHaveBeenCalled();
  });

  it("already subscribed (verified): claim succeeds, no duplicate, no email", async () => {
    mocks.subFindUnique.mockResolvedValue({ email: "buyer@example.com", verified: true, source: "footer" });
    const res = await post({ ...FORM, newsletterOptIn: true });
    expect(res.status).toBe(200);
    expect(mocks.subCreate).not.toHaveBeenCalled();
    expect(mocks.subUpdate).not.toHaveBeenCalled();
  });

  it("newsletter blows up: the paid claim still succeeds", async () => {
    mocks.subFindUnique.mockRejectedValue(new Error("db down"));
    const res = await post({ ...FORM, newsletterOptIn: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, email: "buyer@example.com" });
  });
});
