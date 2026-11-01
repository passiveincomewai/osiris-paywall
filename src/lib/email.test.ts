// Design-pass pins for the shared email shell (2026-11): table-based
// layout, standard footer (no postal line — removed 2026-11-01 on the
// owner's order), the optional why-line, and the derived plain-text
// alternative. If any of these regress, every automated email regresses
// with them.
import { describe, it, expect } from "vitest";
import {
  shell,
  htmlToText,
  verificationEmail,
  passwordChangedEmail,
  apiKeyCreatedEmail,
  deletionScheduledEmail,
  deletionCompletedEmail,
  trialConvertedWelcomeEmail,
  planChangedEmail,
  cardUpdatedEmail,
  refundProcessedEmail,
} from "./email";

describe("shell (shared branded layout)", () => {
  const html = shell("Hello", "preheader text", "<p>Body copy.</p>", {
    label: "Click me",
    href: "https://worldeye.app/pricing",
  });
  it("is table-based at 600px with explicit dark colours", () => {
    expect(html).toContain('role="presentation"');
    expect(html).toContain('width="600"');
    expect(html).toContain('name="color-scheme" content="dark"');
    expect(html).toContain("background:#050508");
  });
  it("carries the wordmark and the one button style", () => {
    expect(html).toContain(">World</span>");
    expect(html).toContain("#D4AF37");
    expect(html).toContain("Click me");
  });
  it("always carries the standard footer — and no postal address", () => {
    expect(html).toContain("WorldEye — see the world live.");
    expect(html).not.toContain("555 E 3200 N");
    expect(html).not.toContain("North Ogden, UT 84414");
  });
  it("renders the why-line only when the template provides one", () => {
    expect(html).not.toContain("because you have a paid");
    const withWhy = shell("T", "p", "<p>x</p>", null, {
      why: "You're receiving this because you have a paid WorldEye subscription.",
    });
    expect(withWhy).toContain("because you have a paid WorldEye subscription.");
  });
  it("keeps the preheader hidden", () => {
    expect(html).toContain("display:none");
    expect(html).toContain("preheader text");
  });
});

describe("htmlToText", () => {
  it("produces a faithful text alternative: no tags, no preheader, entities decoded", () => {
    const { html } = verificationEmail("Ada & Co", "https://worldeye.app/verify?token=abc");
    const text = htmlToText(html);
    expect(text).not.toContain("<");
    expect(text).not.toContain("One click to activate"); // preheader dropped
    expect(text).toContain("Confirm your email");
    expect(text).toContain("Verify my email");
    expect(text).toContain("https://worldeye.app/verify?token=abc");
    expect(text).not.toContain("555 E 3200 N");
  });
});

describe("security pack + deletion pair (picks 15/16)", () => {
  it("password-changed notice states the moment and the recovery path", () => {
    const m = passwordChangedEmail({ name: "Ada", whenLabel: "November 1, 2026 at 5:42 PM UTC" });
    expect(m.subject).toContain("password was changed");
    expect(m.html).toContain("November 1, 2026 at 5:42 PM UTC");
    expect(m.html).toContain("Forgot password");
  });
  it("API-key notice carries name + prefix only, never a full key", () => {
    const m = apiKeyCreatedEmail({
      name: "Ada",
      keyName: "My script",
      keyPrefix: "we_pub_1234",
      whenLabel: "November 1, 2026 at 5:42 PM UTC",
    });
    expect(m.html).toContain("My script");
    expect(m.html).toContain("we_pub_1234");
    expect(m.html).toContain("never included in email");
  });
  it("deletion-scheduled states the exact date and the cancel path", () => {
    const m = deletionScheduledEmail({
      name: "Ada",
      scheduledForLabel: "November 15, 2026",
      subscriptionNote: "Your subscription is set to end at its current period end and will not renew.",
    });
    expect(m.html).toContain("November 15, 2026");
    expect(m.html).toContain("cancel the deletion");
    expect(m.html).toContain("will not renew");
  });
  it("deletion-completed confirms and points at the contact page for mistakes", () => {
    const m = deletionCompletedEmail({ name: "Ada" });
    expect(m.html).toContain("permanently deleted");
    expect(m.html).toContain("/contact");
  });
});

describe("round-2 webhook templates (R2/R5/R6)", () => {
  it("trial-converted welcome carries the charged amount and period end", () => {
    const m = trialConvertedWelcomeEmail({
      name: "Ada",
      planName: "VIP Pro plan",
      amountLabel: "$74.99",
      periodEndLabel: "December 1, 2026",
    });
    expect(m.html).toContain("$74.99");
    expect(m.html).toContain("December 1, 2026");
    expect(m.html).toContain("VIP Pro plan");
  });
  it("plan-change states old and new without inventing proration facts", () => {
    const m = planChangedEmail({ name: "Ada", oldLabel: "Monthly plan — $13.99/month", newLabel: "VIP Pro plan — $74.99/year" });
    expect(m.html).toContain("Monthly plan — $13.99/month");
    expect(m.html).toContain("VIP Pro plan — $74.99/year");
    expect(m.html).not.toContain("prorated by Stripe");
  });
  it("card-updated names the card when Stripe provides brand + last4", () => {
    const m = cardUpdatedEmail({ name: "Ada", cardLabel: "Visa ending 4242" });
    expect(m.html).toContain("Visa ending 4242");
  });
  it("refund states the amount and the bank-timeline honestly", () => {
    const m = refundProcessedEmail({ name: "Ada", amountLabel: "$74.99" });
    expect(m.html).toContain("$74.99");
    expect(m.html).toContain("5–10 business days");
  });
});
