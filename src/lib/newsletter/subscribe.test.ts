// The one subscribe routine + the HTTP contract of the route over it,
// after the 2026-10-28 flow change (instant validation, no double
// opt-in — the validator has its own suite in validate-email.test.ts;
// here it is mocked so these tests pin the subscribe behavior):
//  - validation failure → no DB writes, no email; the outcome carries
//    the friendly message (and the typo suggestion, when there is one);
//  - a passing NEW address creates an already-VERIFIED row tagged with
//    the caller's source, and the welcome email (unsubscribe link) is
//    sent best-effort — it is not a confirmation step;
//  - a passing address on a legacy UNVERIFIED row graduates that row
//    to verified (source updated only when the caller passes one);
//  - a verified address is "already" — no writes, no email, no error;
//  - the route maps outcomes: 400 invalid (+code), 400 suggestion,
//    503 unavailable (retryable), {already:true}, {emailed}, 500 on
//    unexpected failure.
import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = {
  email: string;
  verified: boolean;
  source: string | null;
  unsubToken: string;
};
type CreateArg = {
  data: {
    email: string;
    verified: boolean;
    verifiedAt: Date;
    verifyToken: null;
    source: string | null;
  };
};
type UpdateArg = {
  where: { email: string };
  data: { verified: boolean; verifiedAt: Date; verifyToken: null; source: string | null };
};

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(async () => null as unknown),
  create: vi.fn(async (arg: CreateArg) => ({
    email: arg.data.email,
    verified: true,
    source: arg.data.source,
    unsubToken: "unsub-new",
  })),
  update: vi.fn(async (arg: UpdateArg) => ({
    email: arg.where.email,
    verified: true,
    source: arg.data.source,
    unsubToken: "unsub-existing",
  })),
  sendEmail: vi.fn(async () => true),
  validate: vi.fn(),
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
  newsletterWelcomeEmail: (url: string) => ({ subject: "You're on the list", html: url }),
  appUrl: (path: string) => `https://worldeye.app${path}`,
}));
vi.mock("./validate-email", () => ({
  validateEmailAddress: mocks.validate,
}));

import { subscribeToNewsletter } from "./subscribe";
import { POST } from "@/app/api/newsletter/subscribe/route";

const okValidation = (email: string) => ({ ok: true as const, email });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(null);
  mocks.sendEmail.mockResolvedValue(true);
  mocks.validate.mockImplementation(async (raw: unknown) =>
    okValidation(String(raw ?? "").trim().toLowerCase()),
  );
});

describe("subscribeToNewsletter", () => {
  it("rejects what the validator rejects — no DB writes, no email", async () => {
    mocks.validate.mockResolvedValue({
      ok: false,
      code: "junk_pattern",
      message: "That looks like a made-up address — enter a real email.",
    });
    const outcome = await subscribeToNewsletter("a@a.com", "ladder-email-unlock");
    expect(outcome).toEqual({
      kind: "invalid",
      code: "junk_pattern",
      message: "That looks like a made-up address — enter a real email.",
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("passes a typo suggestion through untouched", async () => {
    mocks.validate.mockResolvedValue({
      ok: false,
      code: "typo_suggestion",
      message: "Did you mean awaigalxy@gmail.com?",
      suggestion: "awaigalxy@gmail.com",
    });
    const outcome = await subscribeToNewsletter("awaigalxy@gmial.com", "footer");
    expect(outcome).toEqual({
      kind: "suggestion",
      suggestion: "awaigalxy@gmail.com",
      message: "Did you mean awaigalxy@gmail.com?",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("a transient DNS failure becomes the retryable 'unavailable' outcome", async () => {
    mocks.validate.mockResolvedValue({
      ok: false,
      code: "dns_unavailable",
      message: "We couldn't check that address just now — give it another try in a moment.",
      retryable: true,
    });
    const outcome = await subscribeToNewsletter("real.person@gmail.com", "footer");
    expect(outcome.kind).toBe("unavailable");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates an already-verified row tagged with the source and sends the welcome email", async () => {
    const outcome = await subscribeToNewsletter("  New@Example.com ", "signup");
    expect(outcome).toEqual({ kind: "subscribed", emailed: true });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    const arg = mocks.create.mock.calls[0]![0];
    expect(arg.data.email).toBe("new@example.com");
    expect(arg.data.source).toBe("signup");
    expect(arg.data.verified).toBe(true);
    expect(arg.data.verifiedAt).toBeInstanceOf(Date);
    expect(arg.data.verifyToken).toBeNull();
    // The only email is the welcome, carrying the unsubscribe link for
    // the new row's token — no verification link exists any more.
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      "new@example.com",
      "You're on the list",
      expect.stringContaining("/api/newsletter/unsubscribe?token=unsub-new"),
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("graduates a legacy unverified row to verified, keeping its source when none is passed", async () => {
    mocks.findUnique.mockResolvedValue({
      email: "a@b.co",
      verified: false,
      source: "footer",
      unsubToken: "unsub-existing",
    } satisfies Row);
    const outcome = await subscribeToNewsletter("a@b.co");
    expect(outcome.kind).toBe("subscribed");
    expect(mocks.create).not.toHaveBeenCalled();
    const arg = mocks.update.mock.calls[0]![0];
    expect(arg.data.verified).toBe(true);
    expect(arg.data.verifyToken).toBeNull();
    expect(arg.data.source).toBe("footer");
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      "a@b.co",
      "You're on the list",
      expect.stringContaining("/api/newsletter/unsubscribe?token=unsub-existing"),
    );
  });

  it("updates the source on a legacy unverified row when the caller passes one", async () => {
    mocks.findUnique.mockResolvedValue({
      email: "a@b.co",
      verified: false,
      source: "footer",
      unsubToken: "unsub-existing",
    } satisfies Row);
    await subscribeToNewsletter("a@b.co", "welcome-claim");
    const arg = mocks.update.mock.calls[0]![0];
    expect(arg.data.source).toBe("welcome-claim");
  });

  it("a verified address is already-subscribed: no writes, no email", async () => {
    mocks.findUnique.mockResolvedValue({
      email: "a@b.co",
      verified: true,
      source: "footer",
      unsubToken: "unsub-existing",
    } satisfies Row);
    expect(await subscribeToNewsletter("a@b.co", "signup")).toEqual({ kind: "already" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("a failed welcome email never fails the subscribe", async () => {
    mocks.sendEmail.mockResolvedValue(false);
    const outcome = await subscribeToNewsletter("fresh@example.net", "footer");
    expect(outcome).toEqual({ kind: "subscribed", emailed: false });
  });

  it("propagates unexpected failures so callers can decide (route 500s, signup logs)", async () => {
    mocks.findUnique.mockRejectedValue(new Error("db down"));
    await expect(subscribeToNewsletter("a@b.co", "signup")).rejects.toThrow("db down");
  });
});

describe("POST /api/newsletter/subscribe — public contract", () => {
  const post = (body: unknown) =>
    POST(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }) as never,
    );

  it("400 with the friendly reason + code for an invalid email", async () => {
    mocks.validate.mockResolvedValue({
      ok: false,
      code: "no_mail_server",
      message: "That email domain can't receive mail — check the part after @ for a typo.",
    });
    const res = await post({ email: "someone@no-mail-here-12345.com" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: "That email domain can't receive mail — check the part after @ for a typo.",
      code: "no_mail_server",
    });
  });

  it("400 with the suggestion when the domain looks mistyped", async () => {
    mocks.validate.mockResolvedValue({
      ok: false,
      code: "typo_suggestion",
      message: "Did you mean awaigalxy@gmail.com?",
      suggestion: "awaigalxy@gmail.com",
    });
    const res = await post({ email: "awaigalxy@gmial.com", source: "footer" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Did you mean awaigalxy@gmail.com?",
      code: "typo_suggestion",
      suggestion: "awaigalxy@gmail.com",
    });
  });

  it("503 retryable when the DNS check itself is unavailable", async () => {
    mocks.validate.mockResolvedValue({
      ok: false,
      code: "dns_unavailable",
      message: "We couldn't check that address just now — give it another try in a moment.",
      retryable: true,
    });
    const res = await post({ email: "real.person@gmail.com" });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.retryable).toBe(true);
  });

  it("{ ok: true, already: true } for a verified subscriber", async () => {
    mocks.findUnique.mockResolvedValue({
      email: "a@b.co",
      verified: true,
      source: "footer",
      unsubToken: "unsub-existing",
    } satisfies Row);
    const res = await post({ email: "a@b.co", source: "footer" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, already: true });
  });

  it("{ ok: true, emailed } for a fresh subscribe — and the row is verified immediately", async () => {
    const res = await post({ email: "fresh@example.net", source: "footer" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, emailed: true });
    expect(mocks.create.mock.calls[0]![0].data.verified).toBe(true);
  });

  it("forwards confirmed:true so a kept-original address skips the suggestion", async () => {
    await post({ email: "awaigalxy@gmial.com", source: "footer", confirmed: true });
    expect(mocks.validate).toHaveBeenCalledWith(
      "awaigalxy@gmial.com",
      expect.objectContaining({ confirmed: true }),
    );
  });

  it("500 when the subscribe routine throws", async () => {
    mocks.findUnique.mockRejectedValue(new Error("db down"));
    const res = await post({ email: "a@b.co" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "Something went wrong. Try again." });
  });
});
