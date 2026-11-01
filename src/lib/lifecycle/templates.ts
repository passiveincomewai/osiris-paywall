// ── Lifecycle email templates ────────────────────────────────────────
// Rendered in the same brand shell as src/lib/email.ts' transactional
// mail. Copy rules (site-wide honesty standard): no invented features,
// prices or trial lengths — plan names/prices arrive pre-derived from
// CHECKOUT_PLAN_SUMMARIES (lib/billing/trial-checkout) via the engine,
// discount offers arrive from config.currentDiscountOffer and are
// simply absent when no live offer exists. Marketing templates carry
// the unsubscribe footer; transactional ones (trial started, affiliate
// activity) do not need it and don't get it.

import { shell, escapeHtml, appUrl } from "../email";
import type { DiscountOffer } from "./config";

export interface RenderedEmail {
  subject: string;
  html: string;
}

const P = (text: string) =>
  `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">${text}</p>`;

export function firstNameOf(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : "there";
}

function offerBlock(offer: DiscountOffer): string {
  const expiry = offer.expiresAt
    ? ` Use it by ${offer.expiresAt.toLocaleDateString("en-US", {
        timeZone: "America/Denver",
        month: "long",
        day: "numeric",
        year: "numeric",
      })}.`
    : "";
  return `<div style="text-align:center;margin:22px 0 6px;padding:18px;border:1px dashed rgba(212,175,55,0.5);border-radius:12px;">
<span style="font-size:12px;letter-spacing:0.14em;color:#71717a;">YOUR CODE — ${escapeHtml(offer.label.toUpperCase())}</span><br>
<span style="font-size:26px;font-weight:800;letter-spacing:0.12em;color:#D4AF37;">${escapeHtml(offer.code)}</span>
</div>
<p style="font-size:13px;color:#71717a;text-align:center;">Enter the code at checkout.${expiry}</p>`;
}

function unsubscribeLine(url: string | null): string {
  if (!url) return "";
  return `<p style="font-size:12px;color:#52525b;margin-top:18px;">Don't want offers like this? <a href="${escapeHtml(url)}" style="color:#71717a;">Unsubscribe</a> — you'll still get essential account emails.</p>`;
}

// ── (a) Welcome + discount code ──────────────────────────────────────
export function welcomeDiscountEmail(input: {
  name: string | null;
  offer: DiscountOffer | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const offerPart = input.offer
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">As a welcome, here's <strong style="color:#fff;">${escapeHtml(input.offer.label)}</strong> when you're ready to upgrade:</p>${offerBlock(input.offer)}`
    : "";
  return {
    subject: input.offer
      ? "Welcome to WorldEye — a discount for your first upgrade"
      : "Welcome to WorldEye",
    html: shell(
      "Welcome to WorldEye",
      "Your account is ready — the live globe is waiting.",
      `${P(`Hi ${first},`)}
       ${P("Your WorldEye account is ready. The globe, live cameras, flights, satellites and weather layers are free to explore — and your account keeps your saved cameras and settings in sync.")}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Open the live globe", href: appUrl("/") },
    ),
  };
}

// ── (b) Interest-matched follow-up (plan named from a checkout attempt) ──
export function interestFollowupEmail(input: {
  name: string | null;
  /** e.g. "Monthly" — from CHECKOUT_PLAN_SUMMARIES via the engine. */
  planName: string;
  /** e.g. "$13.99/month". */
  planPriceLabel: string;
  offer: DiscountOffer | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const offerPart = input.offer
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If price was the hold-up, here's <strong style="color:#fff;">${escapeHtml(input.offer.label)}</strong> for that plan:</p>${offerBlock(input.offer)}`
    : "";
  return {
    subject: `Still considering WorldEye ${input.planName}?`,
    html: shell(
      `The ${escapeHtml(input.planName)} plan, when you're ready`,
      `WorldEye ${input.planName} is ${input.planPriceLabel}.`,
      `${P(`Hi ${first},`)}
       ${P(`You started checking out the <strong style="color:#fff;">${escapeHtml(input.planName)}</strong> plan (${escapeHtml(input.planPriceLabel)}) but didn't finish. No pressure — your free account keeps working either way.`)}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "See plans", href: appUrl("/pricing") },
    ),
  };
}

// ── (c1) Retargeting: engaged with pricing, never reached checkout ──
export function retargetPricingEmail(input: {
  name: string | null;
  offer: DiscountOffer | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const offerPart = input.offer
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Here's <strong style="color:#fff;">${escapeHtml(input.offer.label)}</strong> if you'd like to try the full version for less:</p>${offerBlock(input.offer)}`
    : "";
  return {
    subject: "You looked at WorldEye Pro — here's the short version",
    html: shell(
      "What Pro adds",
      "The free globe stays free. Pro adds the intel toolkit.",
      `${P(`Hi ${first},`)}
       ${P("You spent some time on our pricing page, so here's the honest summary: the free globe, cameras, flights and weather stay free forever. <strong style=\"color:#fff;\">Pro</strong> adds the OSINT toolkit and AI assistant, satellite map view, the live traffic layer and camera recording; <strong style=\"color:#fff;\">VIP Pro</strong> adds the intel feeds, camera alerts and timelapses.")}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Compare plans", href: appUrl("/pricing") },
    ),
  };
}

// ── (c2) Retargeting: abandoned checkout, second touch with a code ──
export function retargetCheckoutEmail(input: {
  name: string | null;
  planName: string | null;
  offer: DiscountOffer | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const planBit = input.planName
    ? ` for the <strong style="color:#fff;">${escapeHtml(input.planName)}</strong> plan`
    : "";
  const offerPart = input.offer
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Checkout sessions expire, but this doesn't: here's <strong style="color:#fff;">${escapeHtml(input.offer.label)}</strong> — start a fresh checkout and enter the code:</p>${offerBlock(input.offer)}`
    : P("Your earlier checkout session has expired, but starting a new one takes under a minute.");
  return {
    subject: "Your WorldEye checkout, with a discount this time",
    html: shell(
      "Still want Pro?",
      "A code for the checkout you started.",
      `${P(`Hi ${first},`)}
       ${P(`A while back you started a checkout${planBit} and didn't finish. That's completely fine — but if you were on the fence, this might help:`)}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Go to pricing", href: appUrl("/pricing") },
    ),
  };
}

// ── (d1) Trial started (transactional) ──────────────────────────────
const PRO_INCLUDES = [
  "The OSINT toolkit and the OI assistant",
  "Satellite map view and the live traffic layer",
  "Camera recording for up to 20 cameras",
];
const VIP_INCLUDES = [
  "Everything in Pro",
  "Live intel layers — cyber, maritime and breaking events",
  "Camera alerts (up to 10 rules) and timelapses",
  "Camera recording for up to 40 cameras",
];

export function trialStartedEmail(input: {
  name: string | null;
  planName: string;
  tier: "pro" | "vip";
  /** Pre-rendered by the engine (formatTrialEnd), e.g. "October 25, 2026 at 3:42 PM UTC". */
  trialEndsLabel: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const includes = input.tier === "vip" ? VIP_INCLUDES : PRO_INCLUDES;
  const list = includes.map((i) => `<li style="margin:4px 0;">${escapeHtml(i)}</li>`).join("");
  const ends = input.trialEndsLabel
    ? P(`Your trial runs until <strong style="color:#fff;">${escapeHtml(input.trialEndsLabel)}</strong> — we'll email you a heads-up before any charge, and you can cancel anytime in Settings.`)
    : P("We'll email you a heads-up before your trial ends, and you can cancel anytime in Settings.");
  return {
    subject: `Your WorldEye ${input.planName} trial has started`,
    html: shell(
      "Your trial is live",
      `Your WorldEye ${input.planName} trial has started — everything is unlocked.`,
      `${P(`Hi ${first},`)}
       ${P(`Your free trial of <strong style="color:#fff;">WorldEye ${escapeHtml(input.planName)}</strong> is live. Here's what's now unlocked:`)}
       <ul style="color:#a1a1aa;font-size:15px;line-height:1.6;padding-left:20px;">${list}</ul>
       ${ends}`,
      { label: "Explore with Pro unlocked", href: appUrl("/") },
    ),
  };
}

// ── (d2) Trial ended without converting → win-back (marketing) ──────
export function trialEndedWinbackEmail(input: {
  name: string | null;
  planName: string;
  offer: DiscountOffer | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const offerPart = input.offer
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If you'd like to come back, here's <strong style="color:#fff;">${escapeHtml(input.offer.label)}</strong>:</p>${offerBlock(input.offer)}`
    : "";
  return {
    subject: "Your WorldEye trial ended — your free account hasn't",
    html: shell(
      "Your trial ended",
      "Pro features are off, but the free globe is still yours.",
      `${P(`Hi ${first},`)}
       ${P(`Your trial of <strong style="color:#fff;">WorldEye ${escapeHtml(input.planName)}</strong> has ended, so the Pro features are switched off. Nothing was charged. Your free account — the globe, cameras, flights and weather — keeps working exactly as before.`)}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "See plans", href: appUrl("/pricing") },
    ),
  };
}

// ── (e0) Annual renewal advance notice (transactional) ──────────────
// The renewal counterpart of the trial-ending email: plan, the exact
// amount, the exact renewal moment, the real cancel path. Figures
// arrive pre-derived from the live Stripe price (describeStripePrice
// via the engine) — nothing is restated here. Transactional account
// mail: no unsubscribe footer, but the CAN-SPAM postal line rides
// along like every email added in the 2026-11 expansion.
export function annualRenewalNoticeEmail(input: {
  name: string | null;
  /** e.g. "VIP Pro plan" — describeStripePrice's planLabel via the engine. */
  planLabel: string;
  /** e.g. "$74.99/year" — describeStripePrice's chargeLabel. */
  chargeLabel: string;
  /** e.g. "$6.25/month" for annual prices; null otherwise. */
  perMonthLabel: string | null;
  /** Pre-rendered renewal moment (formatTrialEnd), UTC-labelled. */
  renewsOnLabel: string;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const perMonth = input.perMonthLabel
    ? ` (that's ${escapeHtml(input.perMonthLabel)}, billed once a year)`
    : "";
  return {
    subject: `Your WorldEye ${input.planLabel} renews soon`,
    html: shell(
      "Your annual plan renews soon",
      `Your WorldEye ${input.planLabel} renews on ${input.renewsOnLabel}.`,
      `${P(`Hi ${first},`)}
       ${P(`This is your advance notice: your <strong style="color:#fff;">WorldEye ${escapeHtml(input.planLabel)}</strong> renews on <strong style="color:#fff;">${escapeHtml(input.renewsOnLabel)}</strong>, when your card will be charged <strong style="color:#fff;">${escapeHtml(input.chargeLabel)}</strong>${perMonth}. No surprises — that's the same price as your current term.`)}
       ${P(`Want to keep it? Do nothing — it renews on its own. Want to stop it? Sign in, open <strong style="color:#fff;">Settings → Manage billing</strong>, and cancel in the Stripe portal before the renewal date; you keep your plan until the current term ends either way.`)}`,
      { label: "Manage my subscription", href: appUrl("/settings") },
      { why: "You're receiving this because you have a paid WorldEye subscription." },
    ),
  };
}

// ── (d3) Second trial win-back, ~30 days on (marketing) ──────────────
export function trialEndedWinbackLateEmail(input: {
  name: string | null;
  planName: string;
  offer: DiscountOffer | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const offerPart = input.offer
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If you'd like to pick it back up, here's <strong style="color:#fff;">${escapeHtml(input.offer.label)}</strong>:</p>${offerBlock(input.offer)}`
    : "";
  return {
    subject: "A month since your WorldEye trial — the globe kept moving",
    html: shell(
      "Still here when you're ready",
      "Your free account is untouched — and so is this offer, while it lasts.",
      `${P(`Hi ${first},`)}
       ${P(`It's been about a month since your trial of <strong style="color:#fff;">WorldEye ${escapeHtml(input.planName)}</strong> ended. Your free account — the globe, cameras, flights and weather — has kept working the whole time, and nothing was ever charged.`)}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "See plans", href: appUrl("/pricing") },
      { why: "You're receiving this because your WorldEye trial ended recently." },
    ),
  };
}

// ── (h) Cancellation save (marketing) ────────────────────────────────
// Sent while the cancelled subscription still has paid time left:
// acknowledges the cancellation plainly (no guilt, no dark patterns),
// states the exact access end, and makes restarting one click — the
// honest version of a save attempt.
export function cancellationSaveEmail(input: {
  name: string | null;
  planName: string;
  /** Pre-rendered access-end moment (formatTrialEnd), UTC-labelled. */
  accessUntilLabel: string;
  offer: DiscountOffer | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const offerPart = input.offer
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If price played a part, here's <strong style="color:#fff;">${escapeHtml(input.offer.label)}</strong> toward coming back:</p>${offerBlock(input.offer)}`
    : "";
  return {
    subject: `Your WorldEye ${input.planName} is set to end — here's what happens next`,
    html: shell(
      "Your cancellation is confirmed",
      `Your WorldEye ${input.planName} access runs until ${input.accessUntilLabel}.`,
      `${P(`Hi ${first},`)}
       ${P(`You've cancelled <strong style="color:#fff;">WorldEye ${escapeHtml(input.planName)}</strong>, and that's confirmed — you won't be charged again. Your paid features stay on until <strong style="color:#fff;">${escapeHtml(input.accessUntilLabel)}</strong>, and your free account (the globe, cameras, flights and weather) keeps working after that.`)}
       ${P(`Changed your mind? You can restart any time from <strong style="color:#fff;">Settings → Manage billing</strong> — before the date above to keep everything uninterrupted, or after it whenever you're ready.`)}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Manage my subscription", href: appUrl("/settings") },
      { why: "You're receiving this because you cancelled a WorldEye subscription." },
    ),
  };
}

// ── (i) Paid subscription ended → win-back (marketing) ───────────────
export function subscriptionEndedWinbackEmail(input: {
  name: string | null;
  planName: string;
  offer: DiscountOffer | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const offerPart = input.offer
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If you'd like to come back, here's <strong style="color:#fff;">${escapeHtml(input.offer.label)}</strong>:</p>${offerBlock(input.offer)}`
    : "";
  return {
    subject: `Your WorldEye ${input.planName} has ended — your free account hasn't`,
    html: shell(
      "Your plan has ended",
      "Paid features are off, but the free globe is still yours.",
      `${P(`Hi ${first},`)}
       ${P(`Your <strong style="color:#fff;">WorldEye ${escapeHtml(input.planName)}</strong> subscription has now ended, so the paid features are switched off. Nothing further will be charged. Your free account — the globe, cameras, flights and weather — keeps working exactly as before.`)}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "See plans", href: appUrl("/pricing") },
      { why: "You're receiving this because your WorldEye subscription recently ended." },
    ),
  };
}

// ── (j) Onboarding drip, day 2 (marketing) ───────────────────────────
// Only verified-free-account features: saved cameras and settings are
// account features that follow the user across devices; camera ALERTS
// are paid and are deliberately not promised here.
export function onboardingDay2Email(input: {
  name: string | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  return {
    subject: "Two things your WorldEye account already does",
    html: shell(
      "Make the globe yours",
      "Save cameras and pick up where you left off, on any device.",
      `${P(`Hi ${first},`)}
       ${P(`A couple of things your free account does that are easy to miss:`)}
       ${P(`<strong style="color:#fff;">Save cameras.</strong> Found a view you love? Save it to your account and it's one tap away next time — no hunting through the globe again.`)}
       ${P(`<strong style="color:#fff;">Your account travels with you.</strong> Sign in on your phone, a tablet or a computer and your saved cameras and settings are just there — nothing to set up twice.`)}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Open the globe", href: appUrl("/") },
      { why: "You're receiving this because you created a WorldEye account a couple of days ago." },
    ),
  };
}

// ── (j2) Onboarding drip, day 5 — the trial invitation (marketing) ───
// Prices/trials arrive pre-derived from checkoutPlanSummary via the
// engine (same lines the welcome email prints) — never restated here.
export function onboardingDay5Email(input: {
  name: string | null;
  planLines: string[];
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const lines = input.planLines
    .map((l) => `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 6px;">${escapeHtml(l)}</p>`)
    .join("");
  return {
    subject: "What Pro adds — try it free first",
    html: shell(
      "The free globe, plus a working toolkit",
      "Every plan starts with a free trial — the exact terms show before you commit.",
      `${P(`Hi ${first},`)}
       ${P(`The free globe stays free. What a paid plan adds is the toolkit around it: camera alerts for the views you follow, recording, saved intel layers and the analyst tools. Every plan starts with a free trial, and checkout shows the exact trial length and price before you commit:`)}
       ${lines}
       ${P(`If it's not for you, cancel in two clicks during the trial and you're never charged.`)}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "See plans & trials", href: appUrl("/pricing") },
      { why: "You're receiving this because you created a WorldEye account a few days ago." },
    ),
  };
}

// ── (k) Inactive re-engagement (marketing) ───────────────────────────
export function inactiveReengagementEmail(input: {
  name: string | null;
  stage: 14 | 30;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  return {
    subject:
      input.stage === 14
        ? "The world kept moving — your globe is still free"
        : "Still your account, still free — come see what's live",
    html: shell(
      "It's all still live",
      "74,229 cameras, flights, satellites and weather — free, as always.",
      `${P(`Hi ${first},`)}
       ${P(`It's been a little while since you opened WorldEye. Nothing about your account has changed: the globe, the 74,229 live cameras, the flights, satellites and weather layers are all still there, and still free — no card was ever asked for and nothing has been charged.`)}
       ${P(`Worth a fresh look: the planet at night, a volcano mid-eruption, a harbour at rush hour. Wherever you left off, it's one tap away.`)}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Open the globe", href: appUrl("/") },
      { why: "You're receiving this because you have a free WorldEye account you haven't visited in a while." },
    ),
  };
}

// ── (l) Exit survey (marketing) ──────────────────────────────────────
// ONE question. Answers land via the site's contact form, which the
// owner is alerted on — stated plainly in the copy so nobody writes
// into a void.
export function trialExitSurveyEmail(input: {
  name: string | null;
  planName: string;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  return {
    subject: "One question about your WorldEye trial",
    html: shell(
      "What stopped you?",
      "One line is plenty — a person reads every reply.",
      `${P(`Hi ${first},`)}
       ${P(`Your trial of <strong style="color:#fff;">WorldEye ${escapeHtml(input.planName)}</strong> ended a few days ago without a paid plan — no charge, no hard feelings. One question, because it genuinely shapes what we fix next:`)}
       ${P(`<strong style="color:#fff;">What was missing, or what put you off?</strong>`)}
       ${P(`Tap below and tell us in one line on the contact form — it goes straight to the person who builds WorldEye, and every message is read. If you'd rather not, ignore this; we won't ask again.`)}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Answer in one line", href: appUrl("/contact") },
      { why: "You're receiving this because your WorldEye trial recently ended." },
    ),
  };
}

// ── (i2) Involuntary churn win-back (marketing) ──────────────────────
// The ended-winback variant for subscriptions that ended because the
// final invoice went unpaid (Stripe left it open/uncollectible) —
// the cause is stated plainly, and the reassurance is only what is
// actually true: the account's saved data is untouched by a lapsed
// subscription, and restarting is a fresh checkout from /pricing.
export function involuntaryChurnWinbackEmail(input: {
  name: string | null;
  planName: string;
  offer: DiscountOffer | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const offerPart = input.offer
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If you'd like to come back, here's <strong style="color:#fff;">${escapeHtml(input.offer.label)}</strong>:</p>${offerBlock(input.offer)}`
    : "";
  return {
    subject: `Your WorldEye ${input.planName} ended after a failed payment — your stuff is saved`,
    html: shell(
      "It ended over a card, not a choice",
      "Your saved cameras and settings are exactly where you left them.",
      `${P(`Hi ${first},`)}
       ${P(`Your <strong style="color:#fff;">WorldEye ${escapeHtml(input.planName)}</strong> subscription has ended because the last payment didn't go through — after the automatic retries, the invoice stayed unpaid and Stripe closed the subscription. Nothing further will be charged.`)}
       ${P(`The part worth knowing: a lapsed subscription doesn't touch your account. Your saved cameras, resort follows and settings are all still there, and your free account keeps working. If the card was the only problem, restarting takes a minute from the pricing page with a working card.`)}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Restart my plan", href: appUrl("/pricing") },
      { why: "You're receiving this because your WorldEye subscription ended after an unpaid invoice." },
    ),
  };
}

// ── (e1) Affiliate: a signup via your link (transactional) ──────────
export function affiliateSignupEmail(input: {
  name: string | null;
  /** The referred user's display name when known; never their email. */
  referredName: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const who = input.referredName
    ? `<strong style="color:#fff;">${escapeHtml(firstNameOf(input.referredName))}</strong> just signed up`
    : "Someone just signed up";
  return {
    subject: "New signup through your WorldEye affiliate link",
    html: shell(
      "Your link is working",
      "A new member joined WorldEye through your affiliate link.",
      `${P(`Hi ${first},`)}
       ${P(`${who} for WorldEye through your affiliate link. If they upgrade to a paid plan, your commission follows automatically — you can watch it land on your dashboard.`)}`,
      { label: "Open my affiliate dashboard", href: appUrl("/affiliates") },
    ),
  };
}

// ── (e2) Affiliate: first commission (transactional) ────────────────
export function affiliateFirstCommissionEmail(input: {
  name: string | null;
  /** Pre-formatted by the engine (formatMoney), e.g. "$4.50". */
  amountLabel: string;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  return {
    subject: "You earned your first WorldEye commission",
    html: shell(
      "First commission earned",
      `Your first WorldEye commission — ${input.amountLabel} — has been recorded.`,
      `${P(`Hi ${first},`)}
       ${P(`Congratulations — your first affiliate commission of <strong style="color:#fff;">${escapeHtml(input.amountLabel)}</strong> has been recorded. It follows the standard payout hold before it becomes payable; your dashboard shows its status and your running balance.`)}`,
      { label: "View my commissions", href: appUrl("/affiliates") },
    ),
  };
}

// ── Campaign blast (prepared by campaigns.ts; owner-approved sends) ──
export function campaignEmail(input: {
  headline: string;
  /** Plain-text body copy from the campaign brief — escaped, never HTML. */
  bodyText: string;
  offer: DiscountOffer | null;
  ctaLabel: string;
  ctaPath: string;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const paragraphs = input.bodyText
    .split(/\n{2,}/)
    .map((para) => P(escapeHtml(para.trim()).replace(/\n/g, "<br>")))
    .join("\n");
  const offerPart = input.offer ? offerBlock(input.offer) : "";
  return {
    subject: input.headline,
    html: shell(
      escapeHtml(input.headline),
      input.bodyText.split(/\s+/).slice(0, 12).join(" "),
      `${paragraphs}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: input.ctaLabel, href: appUrl(input.ctaPath) },
    ),
  };
}

// ── (f) Region interest ──────────────────────────────────────────────
// The numbers quoted are the user's own measured activity and the
// catalogue's own camera count for that country — both arrive
// pre-derived from real rows (see region.ts / engine), never invented.
export function regionInterestEmail(input: {
  name: string | null;
  countryName: string;
  countrySlug: string;
  opens: number;
  /** Cameras the catalogue carries for this country (camera-countries.json). */
  countryCameraCount: number;
  offer: DiscountOffer | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const country = escapeHtml(input.countryName);
  const offerPart = input.offer
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If you'd like the full picture there, here's <strong style="color:#fff;">${escapeHtml(input.offer.label)}</strong>:</p>${offerBlock(input.offer)}`
    : "";
  return {
    subject: `You've been watching ${input.countryName} — here's what Pro adds there`,
    html: shell(
      `Your corner of the map: ${country}`,
      `${input.opens} camera opens in ${input.countryName} over the last two weeks.`,
      `${P(`Hi ${first},`)}
       ${P(`Over the last two weeks you opened <strong style="color:#fff;">${input.opens} live cameras in ${country}</strong> — more than anywhere else on your map. WorldEye carries ${input.countryCameraCount.toLocaleString("en-US")} cameras in ${country}, and here's what the paid layers add on top of them:`)}
       ${P(`<strong style="color:#fff;">Pro</strong> adds the live traffic layer and satellite map view over ${country}, plus camera recording and the OSINT toolkit. <strong style="color:#fff;">VIP Pro</strong> adds camera alerts — set alert rules on the ${country} cameras you care about — plus timelapses and the intel feeds.`)}
       ${offerPart}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: `Keep watching ${input.countryName}`, href: appUrl(`/cameras/countries/${input.countrySlug}`) },
    ),
  };
}

// ── (g) "In Case You Missed It" weekly digest ────────────────────────
// Every section is optional and data-backed: the builder (digest.ts)
// includes a section only when its real source returned data, and the
// digest is not sent at all when no section has anything. Links point
// at the live site surfaces for each item.
export interface DigestCountryLine {
  name: string;
  slug: string;
  opens: number;
}
export interface DigestQuakeLine {
  magnitude: number;
  place: string;
  whenLabel: string;
  url: string;
}
export interface DigestStormLine {
  name: string;
  classification: string;
  intensityKt: number | null;
}
export interface DigestContent {
  /** e.g. "October 16–22, 2026" — preformatted by the builder. */
  weekLabel: string;
  topCountries: DigestCountryLine[];
  quakes: DigestQuakeLine[];
  /** Total open wildfire events NASA EONET is tracking right now. */
  fireCount: number;
  fireTitles: string[];
  storms: DigestStormLine[];
}

export function hasDigestContent(content: DigestContent): boolean {
  return (
    content.topCountries.length > 0 ||
    content.quakes.length > 0 ||
    content.fireCount > 0 ||
    content.storms.length > 0
  );
}

export function weeklyDigestEmail(input: {
  content: DigestContent;
  /** The newsletter list's own unsubscribe URL (per-subscriber token). */
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const c = input.content;
  const sections: string[] = [];
  if (c.topCountries.length > 0) {
    const items = c.topCountries
      .map(
        (t) =>
          `<li style="margin:6px 0;"><a href="${appUrl(`/cameras/countries/${t.slug}`)}" style="color:#D4AF37;text-decoration:none;"><strong>${escapeHtml(t.name)}</strong></a> <span style="color:#71717a;">— ${t.opens.toLocaleString("en-US")} camera opens</span></li>`,
      )
      .join("");
    sections.push(
      `<h3 style="color:#fff;font-size:16px;margin:22px 0 6px;">Most watched this week</h3><ul style="color:#a1a1aa;font-size:15px;line-height:1.6;padding-left:18px;margin:0;">${items}</ul>`,
    );
  }
  if (c.quakes.length > 0) {
    const items = c.quakes
      .map(
        (q) =>
          `<li style="margin:6px 0;"><a href="${escapeHtml(q.url)}" style="color:#D4AF37;text-decoration:none;"><strong>M${q.magnitude.toFixed(1)}</strong></a> <span style="color:#a1a1aa;">${escapeHtml(q.place)}</span> <span style="color:#71717a;">— ${escapeHtml(q.whenLabel)}</span></li>`,
      )
      .join("");
    sections.push(
      `<h3 style="color:#fff;font-size:16px;margin:22px 0 6px;">Largest earthquakes</h3><ul style="color:#a1a1aa;font-size:15px;line-height:1.6;padding-left:18px;margin:0;">${items}</ul>${P(`See them on the <a href="${appUrl("/earthquake-tracker")}" style="color:#D4AF37;">live earthquake tracker</a>.`)}`,
    );
  }
  if (c.fireCount > 0) {
    const items = c.fireTitles
      .map((t) => `<li style="margin:6px 0;">${escapeHtml(t)}</li>`)
      .join("");
    sections.push(
      `<h3 style="color:#fff;font-size:16px;margin:22px 0 6px;">Wildfires being tracked</h3>${P(`NASA's EONET feed is currently tracking <strong style="color:#fff;">${c.fireCount} open wildfire events</strong> worldwide. The most recent:`)}<ul style="color:#a1a1aa;font-size:15px;line-height:1.6;padding-left:18px;margin:0;">${items}</ul>`,
    );
  }
  if (c.storms.length > 0) {
    const items = c.storms
      .map(
        (s) =>
          `<li style="margin:6px 0;"><strong style="color:#fff;">${escapeHtml(s.name)}</strong> <span style="color:#a1a1aa;">— ${escapeHtml(s.classification)}${s.intensityKt != null ? `, winds ${s.intensityKt} kt` : ""}</span></li>`,
      )
      .join("");
    sections.push(
      `<h3 style="color:#fff;font-size:16px;margin:22px 0 6px;">Active tropical storms</h3><ul style="color:#a1a1aa;font-size:15px;line-height:1.6;padding-left:18px;margin:0;">${items}</ul>`,
    );
  }
  return {
    subject: "In Case You Missed It — WorldEye this week",
    html: shell(
      "In Case You Missed It",
      `The week of ${c.weekLabel} on the live globe.`,
      `${P(`Here's what the planet did this week — and what WorldEye watchers were looking at.`)}
       ${sections.join("\n")}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Open the live globe", href: appUrl("/") },
    ),
  };
}

// ── (h) Payment failed → recovery (transactional, webhook-sent) ───────
// Sent by the Stripe webhook on invoice.payment_failed (see
// lib/billing/dunning.ts) — NOT by the lifecycle engine. Transactional
// account-service mail: no unsubscribe footer, no marketing cap, but the
// send is logged in LifecycleEmailLog under template
// "payment_failed_recovery" with the same once-only discipline.
export function paymentFailedRecoveryEmail(input: {
  name: string | null;
  /** Pre-formatted by the caller (formatMoney), e.g. "$74.99". */
  amountLabel: string;
  /** The invoice's Stripe-hosted page: pay + update the card on file. */
  hostedInvoiceUrl: string;
  /** The account billing page (/settings/subscription, absolute). */
  accountUrl: string;
  /** Pre-formatted next automatic retry date, or null when Stripe gave none. */
  nextAttemptLabel: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const retry = input.nextAttemptLabel
    ? P(`Stripe will automatically retry the charge on <strong style="color:#fff;">${escapeHtml(input.nextAttemptLabel)}</strong> — updating your payment details before then keeps everything running.`)
    : P(`Updating your payment details now keeps everything running.`);
  return {
    subject: "Action needed: your WorldEye payment didn't go through",
    html: shell(
      "Your payment needs attention",
      `Your WorldEye payment of ${input.amountLabel} didn't go through — update your payment details to keep your plan.`,
      `${P(`Hi ${first},`)}
       ${P(`We couldn't process your WorldEye subscription payment of <strong style="color:#fff;">${escapeHtml(input.amountLabel)}</strong>, so your subscription is now past due and paid features are locked until the payment goes through.`)}
       ${retry}
       ${P(`You can also review your plan any time on your <a href="${escapeHtml(input.accountUrl)}" style="color:#D4AF37;">billing page</a>.`)}`,
      { label: "Update payment & pay now", href: input.hostedInvoiceUrl },
    ),
  };
}
