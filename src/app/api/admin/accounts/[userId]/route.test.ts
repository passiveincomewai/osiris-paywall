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
});
