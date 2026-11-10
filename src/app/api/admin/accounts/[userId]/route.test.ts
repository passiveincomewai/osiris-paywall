/* Admin account actions API (POST /api/admin/accounts/[userId]).
   Pins the server-side enforcement the detail page relies on:
   - non-admins (and signed-out callers) get 403 and nothing happens;
   - marketing sends to an opted-out user are refused (422) before any
     send is attempted;
   - a grant against an active Stripe subscription is refused (409)
     and the comp engine is never called;
   - a grant over an active comp requires an explicit confirm, then
     extends through the comp engine with source "admin" / 10 days and
     sends the transactional grant email;
   - happy paths log to LifecycleEmailLog with the admin in contextKey.
   Round 2 (2026-11-10) adds: the custom-email composer (admin-written
   subject/body, still marketing — opt-out refusal applies; empty or
   oversized fields refused 400 before any send) and flexible grant
   lengths (7 / 10 / 30 days pass through to the comp engine; any
   other length is refused 400 and the engine is never called).
   DB, auth, Resend and the comp grant are mocked; the templates, the
   unsubscribe helper and the pure comp decision helpers are real. */
import { describe, it, expect, vi, beforeEach } from "vitest";

const FUTURE = new Date(Date.now() + 5 * 86400_000);

const state = {
  adminEmail: "admin@example.com" as string | null,
  user: null as Record<string, unknown> | null,
  sendOk: true,
  grantResult: { granted: true, currentPeriodEnd: new Date("2026-11-20T17:00:00Z") } as {
    granted: boolean;
    currentPeriodEnd?: Date;
    reason?: string;
  },
  logs: [] as Record<string, unknown>[],
  grants: [] as Record<string, unknown>[],
  sends: [] as Record<string, unknown>[],
};

vi.mock("@/auth", () => ({
  auth: async () => (state.adminEmail ? { user: { email: state.adminEmail } } : null),
}));
vi.mock("@/lib/affiliate/admin", () => ({ adminEmails: () => ["admin@example.com"] }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: async () => state.user },
    lifecycleEmailLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.logs.push(data);
        return { id: "log1", ...data };
      },
    },
  },
}));
vi.mock("@/lib/email", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...orig,
    sendEmail: async (to: string, subject: string, html: string) => {
      state.sends.push({ to, subject, html });
      return state.sendOk;
    },
  };
});
vi.mock("@/lib/pro/comp", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/pro/comp")>();
  return {
    ...orig,
    grantCompProDays: async (userId: string, source: string, days: number) => {
      state.grants.push({ userId, source, days });
      return state.grantResult;
    },
  };
});

import { POST } from "./route";

function baseUser(over: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "person@example.com",
    name: "Person Example",
    emailOptOut: false,
    subscription: null,
    ...over,
  };
}

async function call(body: unknown, userId = "u1") {
  const req = new Request(`https://example.com/api/admin/accounts/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req, { params: Promise.resolve({ userId }) });
  return { status: res.status, data: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  state.adminEmail = "admin@example.com";
  state.user = baseUser();
  state.sendOk = true;
  state.grantResult = { granted: true, currentPeriodEnd: new Date("2026-11-20T17:00:00Z") };
  state.logs = [];
  state.grants = [];
  state.sends = [];
});

describe("POST /api/admin/accounts/[userId]", () => {
  it("rejects non-admins with 403 and does nothing", async () => {
    state.adminEmail = "someone@example.com";
    const r = await call({ action: "send_email", template: "checkin" });
    expect(r.status).toBe(403);
    expect(state.sends).toHaveLength(0);
    expect(state.grants).toHaveLength(0);
  });

  it("rejects signed-out callers with 403", async () => {
    state.adminEmail = null;
    const r = await call({ action: "grant_trial" });
    expect(r.status).toBe(403);
    expect(state.grants).toHaveLength(0);
  });

  it("refuses marketing email to an opted-out user (422, no send, no log)", async () => {
    state.user = baseUser({ emailOptOut: true });
    const r = await call({ action: "send_email", template: "trial_invite" });
    expect(r.status).toBe(422);
    expect(r.data.error).toBe("opted_out");
    expect(state.sends).toHaveLength(0);
    expect(state.logs).toHaveLength(0);
  });

  it("sends a template email and logs it as marketing with the admin in contextKey", async () => {
    const r = await call({ action: "send_email", template: "trial_invite" });
    expect(r.status).toBe(200);
    expect(state.sends).toHaveLength(1);
    expect(state.sends[0].to).toBe("person@example.com");
    expect(String(state.sends[0].subject)).toContain("10 days of WorldEye Pro");
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].template).toBe("admin_trial_invite");
    expect(state.logs[0].kind).toBe("marketing");
    expect(String(state.logs[0].contextKey)).toMatch(/^admin:admin@example\.com:/);
  });

  it("refuses a grant when an active Stripe subscription exists (409, engine untouched)", async () => {
    state.user = baseUser({
      subscription: { status: "active", stripeSubscriptionId: "sub_real123", currentPeriodEnd: FUTURE },
    });
    const r = await call({ action: "grant_trial" });
    expect(r.status).toBe(409);
    expect(r.data.error).toBe("paid_active");
    expect(state.grants).toHaveLength(0);
    expect(state.sends).toHaveLength(0);
  });

  it("requires an explicit confirm before extending an active comp", async () => {
    state.user = baseUser({
      subscription: { status: "active", stripeSubscriptionId: "comp_invite_u1", currentPeriodEnd: FUTURE },
    });
    const r1 = await call({ action: "grant_trial" });
    expect(r1.status).toBe(409);
    expect(r1.data.needsConfirm).toBe(true);
    expect(state.grants).toHaveLength(0);

    const r2 = await call({ action: "grant_trial", confirm: true });
    expect(r2.status).toBe(200);
    expect(state.grants).toEqual([{ userId: "u1", source: "admin", days: 10 }]);
  });

  it("happy path: grants via the comp engine (source admin, 10 days) and emails the user", async () => {
    const r = await call({ action: "grant_trial" });
    expect(r.status).toBe(200);
    expect(r.data.emailSent).toBe(true);
    expect(state.grants).toEqual([{ userId: "u1", source: "admin", days: 10 }]);
    expect(state.sends).toHaveLength(1);
    expect(String(state.sends[0].subject)).toContain("WorldEye Pro free until");
    // The grant copy must be honest that this is a gift, not a Stripe trial.
    expect(String(state.sends[0].html)).toContain("not a subscription");
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].template).toBe("admin_trial_grant");
    expect(state.logs[0].kind).toBe("transactional");
  });

  it("still grants (and reports emailSent=false) when the grant email fails", async () => {
    state.sendOk = false;
    const r = await call({ action: "grant_trial" });
    expect(r.status).toBe(200);
    expect(r.data.emailSent).toBe(false);
    expect(state.grants).toHaveLength(1);
    expect(state.logs).toHaveLength(0);
  });

  it("404s for an unknown account", async () => {
    state.user = null;
    const r = await call({ action: "send_email", template: "checkin" });
    expect(r.status).toBe(404);
    expect(state.sends).toHaveLength(0);
  });

  it("sends a custom email with the admin's subject and logs admin_custom as marketing", async () => {
    const r = await call({
      action: "send_email",
      template: "custom",
      subject: "Your camera request",
      body: "Good news — the camera you asked about is live now.",
    });
    expect(r.status).toBe(200);
    expect(state.sends).toHaveLength(1);
    expect(state.sends[0].to).toBe("person@example.com");
    expect(state.sends[0].subject).toBe("Your camera request");
    expect(String(state.sends[0].html)).toContain("Good news");
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].template).toBe("admin_custom");
    expect(state.logs[0].kind).toBe("marketing");
    expect(state.logs[0].subject).toBe("Your camera request");
    expect(String(state.logs[0].contextKey)).toMatch(/^admin:admin@example\.com:/);
  });

  it("escapes the custom body instead of interpreting it as HTML", async () => {
    const r = await call({
      action: "send_email",
      template: "custom",
      subject: "Hi",
      body: "<script>alert(1)</script>",
    });
    expect(r.status).toBe(200);
    expect(String(state.sends[0].html)).not.toContain("<script>alert(1)</script>");
    expect(String(state.sends[0].html)).toContain("&lt;script&gt;");
  });

  it("refuses a custom email to an opted-out user (422, no send, no log)", async () => {
    state.user = baseUser({ emailOptOut: true });
    const r = await call({ action: "send_email", template: "custom", subject: "Hi", body: "Hello." });
    expect(r.status).toBe(422);
    expect(r.data.error).toBe("opted_out");
    expect(state.sends).toHaveLength(0);
    expect(state.logs).toHaveLength(0);
  });

  it("refuses a custom email with an empty subject or body (400, no send)", async () => {
    const r1 = await call({ action: "send_email", template: "custom", subject: "  ", body: "Hello." });
    expect(r1.status).toBe(400);
    expect(r1.data.error).toBe("empty_subject");
    const r2 = await call({ action: "send_email", template: "custom", subject: "Hi", body: "" });
    expect(r2.status).toBe(400);
    expect(r2.data.error).toBe("empty_body");
    const r3 = await call({ action: "send_email", template: "custom" });
    expect(r3.status).toBe(400);
    expect(state.sends).toHaveLength(0);
    expect(state.logs).toHaveLength(0);
  });

  it("refuses an oversized custom email (400, no send)", async () => {
    const r = await call({
      action: "send_email",
      template: "custom",
      subject: "Hi",
      body: "x".repeat(5001),
    });
    expect(r.status).toBe(400);
    expect(r.data.error).toBe("too_long");
    expect(state.sends).toHaveLength(0);
  });

  it("passes a chosen 30-day grant length through to the comp engine", async () => {
    const r = await call({ action: "grant_trial", days: 30 });
    expect(r.status).toBe(200);
    expect(r.data.days).toBe(30);
    expect(state.grants).toEqual([{ userId: "u1", source: "admin", days: 30 }]);
  });

  it("confirm flow honours the chosen length (7 days) and names it in the confirm prompt", async () => {
    state.user = baseUser({
      subscription: { status: "active", stripeSubscriptionId: "comp_invite_u1", currentPeriodEnd: FUTURE },
    });
    const r1 = await call({ action: "grant_trial", days: 7 });
    expect(r1.status).toBe(409);
    expect(r1.data.needsConfirm).toBe(true);
    expect(String(r1.data.message)).toContain("7 more days");
    expect(state.grants).toHaveLength(0);

    const r2 = await call({ action: "grant_trial", days: 7, confirm: true });
    expect(r2.status).toBe(200);
    expect(state.grants).toEqual([{ userId: "u1", source: "admin", days: 7 }]);
  });

  it("refuses a grant length outside 7/10/30 (400, engine untouched)", async () => {
    const r = await call({ action: "grant_trial", days: 45 });
    expect(r.status).toBe(400);
    expect(r.data.error).toBe("invalid_days");
    expect(state.grants).toHaveLength(0);
    expect(state.sends).toHaveLength(0);
  });
});
