// The one subscribe routine + the HTTP contract of the route over it:
//  - a new address creates an UNVERIFIED row (double opt-in) tagged with
//    the caller's source, and the verification email goes out;
//  - an unverified row gets a fresh token (source updated only when the
//    caller passes one);
//  - a verified address is "already" — no writes, no email, no error;
//  - the route keeps its public responses: 400 invalid, {already:true},
//    {emailed}, 500 on unexpected failure.
import { describe, it, expect, vi, beforeEach } from "vitest";

type CreateArg = { data: { email: string; verifyToken: string; source: string | null } };
type UpdateArg = {
  where: { email: string };
  data: { verifyToken: string; source: string | null };
};

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(async () => null as unknown),
  create: vi.fn(async (_arg: CreateArg) => ({})),
  update: vi.fn(async (_arg: UpdateArg) => ({})),
  sendEmail: vi.fn(async () => true),
}));

vi.mock("@/lib/db", () => ({
  db: {
    newsletterSubscriber: {
      findUnique: mocks.findUnique,
      create: mocks.create,
      update: mocks.update,
    },
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  newsletterVerifyEmail: (url: string) => ({ subject: "Confirm your subscription", html: url }),
  appUrl: (path: string) => `https://worldeye.app${path}`,
}));

import { subscribeToNewsletter } from "./subscribe";
import { POST } from "@/app/api/newsletter/subscribe/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(null);
  mocks.sendEmail.mockResolvedValue(true);
});

describe("subscribeToNewsletter", () => {
  it("rejects a malformed address without touching the list", async () => {
    expect(await subscribeToNewsletter("not-an-email", "footer")).toEqual({ kind: "invalid" });
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates an unverified row tagged with the source and emails the verify link", async () => {
    const outcome = await subscribeToNewsletter("  New@Example.com ", "signup");
    expect(outcome).toEqual({ kind: "subscribed", emailed: true });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    const arg = mocks.create.mock.calls[0]![0];
    expect(arg.data.email).toBe("new@example.com");
    expect(arg.data.source).toBe("signup");
    expect(arg.data.verifyToken).toMatch(/^[0-9a-f]{48}$/);
    // The verification email carries the double opt-in link for that token.
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      "new@example.com",
      "Confirm your subscription",
      expect.stringContaining(`/api/newsletter/verify?token=${arg.data.verifyToken}`),
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rotates the token on an unverified row and keeps its source when none is passed", async () => {
    mocks.findUnique.mockResolvedValue({ email: "a@b.co", verified: false, source: "footer" });
    const outcome = await subscribeToNewsletter("a@b.co");
    expect(outcome.kind).toBe("subscribed");
    expect(mocks.create).not.toHaveBeenCalled();
    const arg = mocks.update.mock.calls[0]![0];
    expect(arg.data.source).toBe("footer");
    expect(arg.data.verifyToken).toMatch(/^[0-9a-f]{48}$/);
  });

  it("updates the source on an unverified row when the caller passes one", async () => {
    mocks.findUnique.mockResolvedValue({ email: "a@b.co", verified: false, source: "footer" });
    await subscribeToNewsletter("a@b.co", "welcome-claim");
    const arg = mocks.update.mock.calls[0]![0];
    expect(arg.data.source).toBe("welcome-claim");
  });

  it("a verified address is already-subscribed: no writes, no email", async () => {
    mocks.findUnique.mockResolvedValue({ email: "a@b.co", verified: true, source: "footer" });
    expect(await subscribeToNewsletter("a@b.co", "signup")).toEqual({ kind: "already" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("propagates unexpected failures so callers can decide (route 500s, signup logs)", async () => {
    mocks.findUnique.mockRejectedValue(new Error("db down"));
    await expect(subscribeToNewsletter("a@b.co", "signup")).rejects.toThrow("db down");
  });
});

describe("POST /api/newsletter/subscribe — public contract preserved", () => {
  const post = (body: unknown) =>
    POST(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }) as never,
    );

  it("400 for an invalid email", async () => {
    const res = await post({ email: "nope" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Enter a valid email address." });
  });

  it("{ ok: true, already: true } for a verified subscriber", async () => {
    mocks.findUnique.mockResolvedValue({ email: "a@b.co", verified: true, source: "footer" });
    const res = await post({ email: "a@b.co", source: "footer" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, already: true });
  });

  it("{ ok: true, emailed } for a fresh subscribe", async () => {
    const res = await post({ email: "fresh@example.com", source: "footer" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, emailed: true });
  });

  it("500 when the subscribe routine throws", async () => {
    mocks.findUnique.mockRejectedValue(new Error("db down"));
    const res = await post({ email: "a@b.co" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "Something went wrong. Try again." });
  });
});
