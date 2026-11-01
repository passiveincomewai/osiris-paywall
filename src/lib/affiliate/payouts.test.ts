// Payout lifecycle — transition guards, commission bookkeeping and the
// exactly-once-per-transition status emails (mocked Prisma + email).
// Run: npx vitest run src/lib/affiliate/payouts.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, any>;

const h = vi.hoisted(() => {
  const state: { payout: Row; sent: { to: string; subject: string; html: string }[]; commissionCalls: any[] } = {
    payout: {},
    sent: [],
    commissionCalls: [],
  };
  const db = {
    payout: {
      findUnique: async () => state.payout,
      update: async ({ data }: any) => { Object.assign(state.payout, data); return state.payout; },
    },
    commission: {
      updateMany: async (args: any) => { state.commissionCalls.push(args); return { count: 1 }; },
    },
    $transaction: async (ops: any[]) => Promise.all(ops),
  };
  return { state, db };
});

vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/lib/email", () => ({
  sendEmail: async (to: string, subject: string, html: string) => { h.state.sent.push({ to, subject, html }); return true; },
  shell: (_t: string, _p: string, body: string) => body,
  appUrl: (p: string) => `https://worldeye.app${p}`,
  escapeHtml: (s: string) => s,
}));

import { transitionPayout, sendPayoutStatusEmail, notifyPayoutRequested, payoutStatusEmail } from "./payouts";

function fixture(status = "requested") {
  return {
    id: "po_1",
    amountCents: 5200,
    method: "venmo",
    status,
    providerRef: null,
    note: null,
    requestedAt: new Date("2026-10-30T06:00:00Z"),
    lastEmailedStatus: null,
    affiliateProfileId: "ap_1",
    affiliate: {
      payoutEmail: null,
      venmoHandle: "jane_doe",
      user: { email: "jane@example.com", name: "Jane Doe" },
    },
  };
}

beforeEach(() => {
  h.state.payout = fixture();
  h.state.sent = [];
  h.state.commissionCalls = [];
});

describe("transitionPayout", () => {
  it("approve: requested → approved and emails the affiliate once", async () => {
    const r = await transitionPayout("po_1", "approve", { decidedBy: "admin@worldeye.app" });
    expect(r).toMatchObject({ ok: true, status: "approved", emailed: true });
    expect(h.state.payout.status).toBe("approved");
    expect(h.state.sent).toHaveLength(1);
    expect(h.state.sent[0].to).toBe("jane@example.com");
    expect(h.state.sent[0].subject).toContain("approved");
    // Exactly-once: a repeat status-email attempt for the same status no-ops.
    expect(await sendPayoutStatusEmail("po_1")).toBe(false);
    expect(h.state.sent).toHaveLength(1);
  });

  it("rejects bad states without emailing", async () => {
    h.state.payout = fixture("paid");
    const r = await transitionPayout("po_1", "approve");
    expect(r).toMatchObject({ ok: false, httpStatus: 400 });
    expect(h.state.sent).toHaveLength(0);
  });

  it("mark_paid from requested says Approve first", async () => {
    const r = await transitionPayout("po_1", "mark_paid");
    expect(r).toMatchObject({ ok: false, error: "Approve first" });
  });

  it("reject returns commissions to available and emails the decline", async () => {
    const r = await transitionPayout("po_1", "reject", { note: "Missing tax form" });
    expect(r).toMatchObject({ ok: true, status: "rejected" });
    expect(h.state.commissionCalls[0].data).toMatchObject({ status: "available", payoutId: null });
    expect(h.state.sent[0].subject).toContain("declined");
    expect(h.state.sent[0].html).toContain("Missing tax form");
    expect(h.state.sent[0].html).toContain("returned to your available balance");
  });

  it("start_processing only from approved; mark_paid pays commissions", async () => {
    expect(await transitionPayout("po_1", "start_processing")).toMatchObject({ ok: false });
    await transitionPayout("po_1", "approve");
    const r = await transitionPayout("po_1", "start_processing");
    expect(r).toMatchObject({ ok: true, status: "processing" });
    const paid = await transitionPayout("po_1", "mark_paid", { providerRef: "venmo-txn-123" });
    expect(paid).toMatchObject({ ok: true, status: "paid" });
    expect(h.state.commissionCalls.at(-1).data).toMatchObject({ status: "paid" });
    const paidMail = h.state.sent.at(-1)!;
    expect(paidMail.subject).toContain("has been paid");
    expect(paidMail.html).toContain("venmo-txn-123");
    // One email per actual transition: requested(0: approve sent approved mail)
    // → approved, processing, paid = 3 transition emails total.
    expect(h.state.sent).toHaveLength(3);
  });

  it("resend_email forces a manual resend without changing state", async () => {
    h.state.payout = fixture("approved");
    h.state.payout.lastEmailedStatus = "approved";
    const r = await transitionPayout("po_1", "resend_email");
    expect(r).toMatchObject({ ok: true, status: "approved", emailed: true });
    expect(h.state.sent).toHaveLength(1);
  });
});

describe("notifyPayoutRequested", () => {
  it("emails the owner (amount, Venmo handle, 48h deadline) and confirms to the affiliate", async () => {
    const r = await notifyPayoutRequested("po_1");
    expect(r).toEqual({ ownerEmailed: true, affiliateEmailed: true });
    const owner = h.state.sent.find((m) => m.to === "passiveincomewai@gmail.com")!;
    expect(owner.subject).toContain("$52.00");
    expect(owner.html).toContain("@jane_doe");
    expect(owner.html).toContain("48-hour deadline");
    const confirm = h.state.sent.find((m) => m.to === "jane@example.com")!;
    expect(confirm.subject).toContain("received your payout request");
    expect(confirm.html).toContain("within 48 hours");
    // Affiliate confirmation is exactly-once too.
    const again = await notifyPayoutRequested("po_1");
    expect(again.affiliateEmailed).toBe(false);
  });
});

describe("payoutStatusEmail", () => {
  it("carries no postal line and honest method labels", () => {
    for (const status of ["requested", "approved", "processing", "paid", "rejected"]) {
      const mail = payoutStatusEmail(fixture(status) as any)!;
      expect(mail.html).not.toContain("555 E 3200 N");
      expect(mail.html).toContain("Venmo (@jane_doe)");
    }
    const legacy = payoutStatusEmail({ ...fixture("paid"), method: "paypal" } as any)!;
    expect(legacy.html).toContain("PayPal"); // historical records keep their label
  });
});
