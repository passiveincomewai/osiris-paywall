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
// mail: no unsubscribe footer.
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
  /** Account digest (pick 9): the reader's own WorldEye — rendered as
   * a lead section when present. Absent for the newsletter edition,
   * whose rendering is unchanged. */
  personal?: {
    savedCameraNames: string[];
    savedCameraCount: number;
    resortNames: string[];
  };
}): RenderedEmail {
  const c = input.content;
  const sections: string[] = [];
  if (input.personal) {
    const p = input.personal;
    const bits: string[] = [];
    if (p.savedCameraCount > 0) {
      const names = p.savedCameraNames.map((n) => escapeHtml(n)).join(", ");
      bits.push(
        `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 8px;">You have <strong style="color:#fff;">${p.savedCameraCount} saved camera${p.savedCameraCount === 1 ? "" : "s"}</strong>${names ? ` — including ${names}` : ""}. They're one tap away in <a href="${appUrl("/cameras")}" style="color:#D4AF37;">your camera list</a>.</p>`,
      );
    }
    if (p.resortNames.length > 0) {
      bits.push(
        `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 8px;">Your followed resorts: <strong style="color:#fff;">${p.resortNames.map((n) => escapeHtml(n)).join(", ")}</strong> — when snow or a storm lines up for them, it lands in your inbox.</p>`,
      );
    }
    if (bits.length > 0) {
      sections.push(
        `<h3 style="color:#fff;font-size:16px;margin:22px 0 6px;">Your WorldEye</h3>${bits.join("\n")}`,
      );
    }
  }
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

// ── (m) Verification reminder (marketing, round 2 R1) ────────────────
// The benefit is the ladder's verify rung, stated with the ladder's own
// arithmetic (lib/camera-ladder: unverified account = 5 opens; verified
// = 10). The CTA goes to Settings, where the site's own verify step
// lives (lib/auth-verification's send path) — the reminder never mints
// tokens of its own.
export function verificationReminderEmail(input: {
  name: string | null;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  return {
    subject: "Verify your email — unlock 5 more camera opens",
    html: shell(
      "One click, 5 more opens",
      "Your free account is on 5 camera opens; verifying your email makes it 10.",
      `${P(`Hi ${first},`)}
       ${P(`Your WorldEye account's email isn't verified yet. On the free ladder that leaves you at <strong style="color:#fff;">5 camera opens</strong> — verifying your email unlocks <strong style="color:#fff;">5 more (10 total)</strong>, free, and it's the same step that proves this address for password resets and receipts.`)}
       ${P(`It takes one click: open Settings and choose verify — we'll email you the confirmation link.`)}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Verify in Settings", href: appUrl("/settings") },
      { why: "You're receiving this because your WorldEye account's email isn't verified yet." },
    ),
  };
}

// ── (n) Event-driven news alert (marketing, pick 14) ─────────────────
// Rare by construction: only a magnitude-7.0+ earthquake or a newly
// opened volcanic event (the digest's own USGS/EONET sources) fires
// one. Source is named in the copy; the CTA goes to the live tracker,
// not a written-up story — this is an alert, not an article.
export function newsAlertEmail(input: {
  headline: string;
  detail: string;
  sourceLabel: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  return {
    subject: input.headline,
    html: shell(
      input.headline,
      input.detail,
      `${P(escapeHtml(input.detail))}
       ${P(`Source: ${escapeHtml(input.sourceLabel)} — the same live feed the tracker reads. Open it to follow developments as they post.`)}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: input.ctaLabel, href: input.ctaUrl },
      { why: "You're receiving this because you subscribe to WorldEye email updates." },
    ),
  };
}

// ── (o) Severe-weather alert for a saved place (marketing, R2/R8) ────
// Official warnings only: every line is a National Weather Service
// alert object (event, headline, area, expiry) tied to a place the
// user themselves saved a camera at. The NWS is named as the source;
// no warning is paraphrased into existence.
export function weatherAlertEmail(input: {
  name: string | null;
  alerts: {
    event: string;
    headline: string;
    areaDesc: string;
    expiresLabel: string | null;
    placeNames: string[];
  }[];
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const blocks = input.alerts
    .map(
      (a) => `${P(`<strong style="color:#fff;">${escapeHtml(a.event)}</strong> — ${escapeHtml(a.headline)}`)}
       ${P(`Area: ${escapeHtml(a.areaDesc)}${a.expiresLabel ? ` · In effect until ${escapeHtml(a.expiresLabel)}` : ""} · Near your saved camera${a.placeNames.length === 1 ? "" : "s"}: ${a.placeNames.map((n) => escapeHtml(n)).join(", ")}`)}`,
    )
    .join("");
  return {
    subject: `Weather alert for your saved places: ${input.alerts[0].event}`,
    html: shell(
      "Severe weather at a place you follow",
      "An official National Weather Service warning covers an area with your saved cameras.",
      `${P(`Hi ${first},`)}
       ${blocks}
       ${P(`These warnings come straight from the <strong style="color:#fff;">National Weather Service</strong> — follow their guidance for the area, and check your saved cameras to see conditions for yourself.`)}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Open my saved cameras", href: appUrl("/cameras") },
      { why: "You're receiving this because you saved cameras in an area under an official weather warning." },
    ),
  };
}

// ── (t) Trialist engagement track (marketing) ────────────────────────
// Touches DURING a live trial. Every figure arrives pre-derived by the
// engine from the live Stripe price object (describeStripePrice /
// formatTrialEnd) or from the user's own measured activity — nothing
// is restated here, and no camera name is ever invented (the day-1
// recap names only places the user actually viewed and cameras they
// themselves saved). No copy implies the trial needs no card: trials
// are card-required, and wherever a charge is mentioned the honest
// exit — cancel before the charge moment — is stated with it.

export interface TrialPlaceLine {
  name: string;
  href: string;
}

const placeLinks = (places: TrialPlaceLine[]): string =>
  places
    .map(
      (p) =>
        `<a href="${escapeHtml(p.href)}" style="color:#D4AF37;">${escapeHtml(p.name)}</a>`,
    )
    .join(", ");

const joinHuman = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

// Day-1 recap: the first 24h of the trial as it actually happened —
// camera opens counted, place pages viewed, cameras saved. Zero
// activity falls back to the site's most-watched PLACES (labelled as
// such), never to invented camera names.
export function trialDay1RecapEmail(input: {
  name: string | null;
  /** describeStripePrice's planLabel, e.g. "Monthly plan". */
  planLabel: string;
  opensCount: number;
  places: TrialPlaceLine[];
  savedCameraNames: string[];
  /** Fallback only: most-watched places on the site, trailing 7 days. */
  popularPlaces: TrialPlaceLine[];
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const plan = escapeHtml(input.planLabel);
  const activity: string[] = [];
  if (input.opensCount > 0) {
    activity.push(
      `you opened <strong style="color:#fff;">${input.opensCount} live camera${input.opensCount === 1 ? "" : "s"}</strong>`,
    );
  }
  if (input.places.length > 0) {
    activity.push(`you explored ${placeLinks(input.places)}`);
  }
  if (input.savedCameraNames.length > 0) {
    activity.push(
      `you saved ${joinHuman(input.savedCameraNames.map((n) => escapeHtml(n)))}`,
    );
  }
  const recap =
    activity.length > 0
      ? P(
          `Here's your first day on the <strong style="color:#fff;">${plan}</strong> trial: ${joinHuman(activity)}. Everything on the plan stays unlocked for the rest of the trial — alerts, recording and the premium layers included where your plan carries them.`,
        )
      : input.popularPlaces.length > 0
        ? P(
            `Your <strong style="color:#fff;">${plan}</strong> trial is live and everything on the plan is unlocked. You haven't opened a camera yet — a good place to start is where other watchers have been spending time this week: ${placeLinks(input.popularPlaces)}.`,
          )
        : P(
            `Your <strong style="color:#fff;">${plan}</strong> trial is live and everything on the plan is unlocked — the globe is the best place to start.`,
          );
  return {
    subject: "Day one of your trial — a quick recap",
    html: shell(
      "Your first day, recapped",
      "Your trial is live and everything on your plan is unlocked.",
      `${P(`Hi ${first},`)}
       ${recap}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Back to the globe", href: appUrl("/") },
      { why: "You're receiving this because your WorldEye trial is running." },
    ),
  };
}

// Day-2 CTA: ONE next step, chosen by the engine's ladder (alerts the
// plan carries but the user hasn't set → save a camera → record a
// clip). The alert variant prints the tier's REAL alert cap from
// entitlementsFor — it arrives as a number, never a typed constant.
export type TrialDay2Cta =
  | { kind: "alert"; alertCap: number }
  | { kind: "save" }
  | { kind: "record" };

export function trialDay2CtaEmail(input: {
  name: string | null;
  planLabel: string;
  cta: TrialDay2Cta;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const plan = escapeHtml(input.planLabel);
  if (input.cta.kind === "alert") {
    return {
      subject: "Put a camera on watch — your plan includes alerts",
      html: shell(
        "Put a camera on watch",
        "Set one alert rule and WorldEye emails you when your condition shows up.",
        `${P(`Hi ${first},`)}
         ${P(`Your <strong style="color:#fff;">${plan}</strong> trial includes camera alerts, and you haven't set one yet. Pick a camera you follow, describe what you want to know about — fresh snow, a busy dock, an empty beach — and WorldEye checks the feed and emails you when it shows up. Your plan carries up to <strong style="color:#fff;">${input.cta.alertCap} active alert rules</strong>.`)}
         ${unsubscribeLine(input.unsubscribeUrl)}`,
        { label: "Set a camera alert", href: appUrl("/settings/alerts") },
        { why: "You're receiving this because your WorldEye trial is running." },
      ),
    };
  }
  if (input.cta.kind === "save") {
    return {
      subject: "Save the cameras you keep coming back to",
      html: shell(
        "Save your cameras",
        "One tap, and your favourite views are waiting on every device.",
        `${P(`Hi ${first},`)}
         ${P(`A small thing that changes how the trial feels: when a view stops you, <strong style="color:#fff;">save the camera</strong>. Your saved list follows your account to every device, so the places you're following are one tap away instead of another hunt across the globe — and it's the list your plan's alerts and recordings build on.`)}
         ${unsubscribeLine(input.unsubscribeUrl)}`,
        { label: "Open the globe", href: appUrl("/") },
        { why: "You're receiving this because your WorldEye trial is running." },
      ),
    };
  }
  return {
    subject: "Record a clip from any live camera",
    html: shell(
      "Keep the moment, not just the view",
      "Your plan's Recording Studio turns any live camera into a clip you keep.",
      `${P(`Hi ${first},`)}
       ${P(`Your <strong style="color:#fff;">${plan}</strong> trial includes the Recording Studio: open any live camera, record the moment — a sunrise, a storm rolling in, rush hour in a city you love — and the clip is yours to keep and share. Most trialists never find it; it's the feature people mention most once they have.`)}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Open the Recording Studio", href: appUrl("/recording") },
      { why: "You're receiving this because your WorldEye trial is running." },
    ),
  };
}

// Day-5 feature: the first feature page (from the engine's fixed
// shortlist) the trialist has not viewed once since the trial
// started. Name, blurb and path all arrive from that shortlist — the
// engine never pitches a page it can't prove exists.
export interface TrialFeatureLine {
  name: string;
  blurb: string;
  path: string;
}

export function trialDay5FeatureEmail(input: {
  name: string | null;
  planLabel: string;
  feature: TrialFeatureLine;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  return {
    subject: `One part of your plan you haven't tried: ${input.feature.name}`,
    html: shell(
      `Worth a look: ${escapeHtml(input.feature.name)}`,
      input.feature.blurb,
      `${P(`Hi ${first},`)}
       ${P(`You're five days into your <strong style="color:#fff;">${escapeHtml(input.planLabel)}</strong> trial, and there's one included page you haven't opened yet: <strong style="color:#fff;">${escapeHtml(input.feature.name)}</strong>. ${escapeHtml(input.feature.blurb)}`)}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: `Open the ${input.feature.name}`, href: appUrl(input.feature.path) },
      { why: "You're receiving this because your WorldEye trial is running." },
    ),
  };
}

// Pre-charge recap (both tracks; the short track's only touch): what
// the trial actually got used for, then the exact first charge —
// amount and moment from the live Stripe price, never restated — and
// the honest exit. This email deliberately stops at 24h before the
// end; the final-24h heads-up is the transactional trial-reminders
// email, so the two never stack.
export function trialPrechargeRecapEmail(input: {
  name: string | null;
  planLabel: string;
  /** describeStripePrice's chargeLabel, e.g. "$13.99/month". */
  chargeLabel: string;
  /** Annual only: "$6.25/month"; null otherwise. */
  perMonthLabel: string | null;
  /** Pre-rendered first-charge moment (formatTrialEnd), UTC-labelled. */
  trialEndsLabel: string;
  opensCount: number;
  activeDays: number;
  savedCameraCount: number;
  alertRuleCount: number;
  unsubscribeUrl: string | null;
}): RenderedEmail {
  const first = escapeHtml(firstNameOf(input.name));
  const usage: string[] = [];
  if (input.opensCount > 0) {
    usage.push(`${input.opensCount} camera open${input.opensCount === 1 ? "" : "s"}`);
  }
  if (input.activeDays > 0) {
    usage.push(`active on ${input.activeDays} day${input.activeDays === 1 ? "" : "s"}`);
  }
  if (input.savedCameraCount > 0) {
    usage.push(`${input.savedCameraCount} saved camera${input.savedCameraCount === 1 ? "" : "s"}`);
  }
  if (input.alertRuleCount > 0) {
    usage.push(`${input.alertRuleCount} alert rule${input.alertRuleCount === 1 ? "" : "s"}`);
  }
  const usageLine =
    usage.length > 0
      ? P(`Your trial so far, in your own numbers: ${joinHuman(usage)}. All of it stays exactly as it is if you continue — nothing to set up again.`)
      : P(`You haven't had much time with the trial yet — everything on the plan stays unlocked until it ends, and your free account keeps working either way.`);
  const perMonth = input.perMonthLabel
    ? ` (that's ${escapeHtml(input.perMonthLabel)}, billed once a year)`
    : "";
  return {
    subject: "Before your trial converts — your recap and the exact charge",
    html: shell(
      "Your trial is ending soon",
      `Your first charge — ${input.chargeLabel} on ${input.trialEndsLabel} — unless you cancel first.`,
      `${P(`Hi ${first},`)}
       ${usageLine}
       ${P(`Here's the charge, exactly: on <strong style="color:#fff;">${escapeHtml(input.trialEndsLabel)}</strong> your trial of the <strong style="color:#fff;">${escapeHtml(input.planLabel)}</strong> ends and your card will be charged <strong style="color:#fff;">${escapeHtml(input.chargeLabel)}</strong>${perMonth} for the first paid period. No other amount, no earlier date.`)}
       ${P(`Want to continue? Do nothing — it converts on its own. Don't want the charge? Cancel before that moment in <strong style="color:#fff;">Settings → Manage billing</strong> and you're never charged; your free account (the globe, cameras, flights and weather) keeps working regardless.`)}
       ${unsubscribeLine(input.unsubscribeUrl)}`,
      { label: "Manage my subscription", href: appUrl("/settings") },
      { why: "You're receiving this because your WorldEye trial is ending soon." },
    ),
  };
}
