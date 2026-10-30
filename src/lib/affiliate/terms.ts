// ── Affiliate program terms: single source of truth ─────────────────────
// The canonical Affiliate Terms & Conditions content. Rendered by the
// public terms page (/affiliates/terms) and by the demo join modal
// (components/affiliate/DemoShell), so the agreement a prospect accepts
// is always the same text the site publishes. Bump AFFILIATE_TERMS_VERSION
// whenever the wording materially changes — acceptances are recorded
// against it (AffiliateTermsAcceptance.termsVersion).

export const AFFILIATE_TERMS_VERSION = "2026-10";
export const AFFILIATE_TERMS_UPDATED_LABEL = "October 2026";

export const AFFILIATE_TERMS_INTRO =
  "These terms govern participation in the WorldEye affiliate program. They " +
  "cover who can join, how commissions are earned, attributed and paid out, " +
  "the conduct expected of affiliates, and how the program itself can " +
  "change. Participation is free and never requires a purchase — the " +
  "sections below are the complete agreement between WorldEye and its " +
  "affiliates.";

export const AFFILIATE_TERMS_NOTICE =
  "Multi-level referral payouts are subject to legal review in each jurisdiction where the Program " +
  "operates. WorldEye may adjust network depth, override rates, or eligibility by region to remain " +
  "compliant with applicable law. This page summarizes the Program's terms; it is not legal advice.";

export interface AffiliateTermsSection {
  n: string;
  title: string;
  body: string[];
}

export const AFFILIATE_TERMS_SECTIONS: AffiliateTermsSection[] = [
  {
    n: "1",
    title: "Eligibility",
    body: [
      "The WorldEye affiliate program (the “Program”) is open to individuals who are at least 18 years old and legally eligible to participate in affiliate marketing in their jurisdiction. WorldEye may restrict participation in jurisdictions where affiliate or multi-level referral compensation is regulated or prohibited, and may request identity or age verification at any time.",
      "WorldEye reserves the right to approve, decline, suspend, or terminate any affiliate account at its sole discretion.",
    ],
  },
  {
    n: "2",
    title: "Free participation — no purchase necessary",
    body: [
      "Participation in the Program is 100% free. There are no signup fees, membership fees, or mandatory purchases. You do not need to hold a WorldEye subscription — free or paid — to join, remain in, or earn through the Program. No recruitment quotas or purchase requirements will ever be imposed.",
    ],
  },
  {
    n: "3",
    title: "Commissions",
    body: [
      "Affiliates earn commissions only on legitimate, paid WorldEye subscription purchases (weekly, monthly, and annual plans) made by customers attributed to their referral link, including qualifying subscription renewals. Commission rates are determined by the affiliate's rank at the time of the qualifying payment: 15% (Explorer) up to 30% (Visionary).",
      "Level 2 and Level 3 network overrides (5% and 2% respectively, or as configured by the administrator) are likewise paid only on qualifying paid subscription sales generated within the affiliate's referral network — never for recruitment alone.",
      "Commissions enter a pending state when the underlying payment clears, then become available after a 30-day holding period. A minimum available balance of $25 is required to request a payout. All payout requests are reviewed and approved by WorldEye before processing. Commissions are not considered earned until the underlying payment is confirmed.",
    ],
  },
  {
    n: "4",
    title: "Reversals",
    body: [
      "Commissions are reversed — in full — when the underlying subscription payment is refunded, charged back, disputed, or otherwise fails. If a reversal cannot be deducted from pending or available balances, WorldEye may deduct it from future commissions or payouts. Fraudulent payment activity will result in immediate termination and forfeiture of unpaid commissions.",
    ],
  },
  {
    n: "5",
    title: "Attribution",
    body: [
      "Referrals are tracked via a unique affiliate link and a browser cookie with a default 30-day attribution window (configurable by the administrator). If a customer arrives through multiple affiliate links, the most recent valid referral generally takes precedence, subject to administrator review. Self-referral — earning commissions on your own purchases — is strictly prohibited and will result in commission forfeiture and account termination.",
    ],
  },
  {
    n: "6",
    title: "Prohibited conduct",
    body: [
      "Affiliates must not: (a) generate fake, automated, or incentivized clicks or signups; (b) create duplicate or impersonating accounts; (c) engage in cookie stuffing, ad hijacking, or trademark bidding on WorldEye brand terms without written permission; (d) make false, misleading, or unsubstantiated claims about WorldEye or its products; (e) send unsolicited commercial messages (spam) in violation of applicable law.",
      "Where required by law (including FTC guidelines in the United States and equivalent regulations elsewhere), affiliates must clearly and conspicuously disclose their affiliate relationship in any promotional content — for example, with a statement such as “I may earn a commission if you subscribe through my link.”",
    ],
  },
  {
    n: "7",
    title: "Recruitment vs. sales",
    body: [
      "The Program compensates genuine product sales and customer acquisition — not recruitment. No commission, bonus, XP, or reward is ever paid merely for recruiting another affiliate. There are no recruitment quotas, and advancement through ranks is driven by real referral activity and subscription sales. Experience points (XP) have no cash value and cannot be redeemed, transferred, or exchanged.",
    ],
  },
  {
    n: "8",
    title: "Payouts & tax",
    body: [
      "Payouts are processed through supported providers (such as Venmo or Stripe Connect, depending on eligibility) or by manual arrangement, after administrator approval. Affiliates are solely responsible for reporting and paying all taxes on their commission income. WorldEye may require identity verification and tax documentation (e.g., W-9/W-8BEN or local equivalents) before releasing payouts, and may withhold where required by law.",
    ],
  },
  {
    n: "9",
    title: "Termination",
    body: [
      "Either party may terminate participation at any time. WorldEye may suspend or terminate accounts immediately for violations of these terms, fraud, or abuse. Upon termination, pending commissions tied to legitimate, non-reversed sales remain payable according to the normal holding and payout schedule; commissions tied to reversed or fraudulent sales are forfeited.",
    ],
  },
  {
    n: "10",
    title: "Program changes",
    body: [
      "WorldEye may modify the Program — including commission rates, XP requirements, rank thresholds, challenge mechanics, attribution windows, holding periods, and payout minimums — at any time. Material changes will be communicated to affiliates in advance where reasonably possible. Continued participation after changes take effect constitutes acceptance.",
    ],
  },
  {
    n: "11",
    title: "Free Pro benefits — creators & Visionary rank",
    body: [
      "Creator free Pro: creators with a genuine audience of at least 25,000 followers on a supported platform (Instagram, TikTok, YouTube, X, or Twitch) may apply for complimentary WorldEye Pro. Approved applications receive 12 months of Pro at no charge. Follower counts are self-reported at application and verified by WorldEye before approval; the account must be authentic, active, and owned or controlled by the applicant. After 12 months, continued complimentary access requires re-verification of eligibility. WorldEye may decline any application, and may revoke complimentary Pro at any time for fake, purchased, or botted followers, audience misrepresentation, or other abuse.",
      "Visionary free Pro: affiliates who reach the Visionary rank receive complimentary WorldEye Pro, granted in 12-month terms, for as long as they hold Visionary rank. If an affiliate ceases to hold Visionary rank (for example, following an XP adjustment for abuse), complimentary access granted under this paragraph may be revoked at the end of its current term or immediately in cases of fraud.",
      "Complimentary Pro has no cash value, cannot be transferred, sold, or exchanged, and does not by itself earn commissions or XP. If a participant purchases a paid WorldEye subscription, the paid subscription takes precedence and these complimentary benefits pause for its duration.",
    ],
  },
  {
    n: "12",
    title: "Discount codes",
    body: [
      "Every active affiliate receives a personal discount code (for example, YOURNAME20) that gives buyers a percentage off their first WorldEye subscription payment. The percentage follows the affiliate's current rank — 5% (Explorer), 10% (Scout), 15% (Analyst), 20% (Commander), 25% (Elite), 30% (Visionary). Affiliates with an approved creator application receive a floor of 20% regardless of rank. The discount applies to the first payment only, on weekly, monthly, and annual plans, and cannot be combined with other offers unless WorldEye states otherwise.",
      "Codes follow the affiliate's current tier: when an affiliate's rank (or creator status) changes, their code rotates to the new percentage and the previous code is deactivated. Only the affiliate's current code is valid; WorldEye is not responsible for honoring retired codes shared in older content.",
      "A purchase made with an affiliate's discount code is attributed to that affiliate for commission purposes under the standard commission rules, even if the buyer did not arrive through the affiliate's referral link — unless the buyer already carries another affiliate's attribution, which takes precedence. Redeeming your own code on your own purchase is self-referral and is prohibited under Section 5. WorldEye may deactivate any code, without notice, for fraud, abuse, misleading promotion, or violation of these terms, and commissions arising from code abuse are void.",
    ],
  },
  {
    n: "13",
    title: "Studio credits & Cosmo AI requests",
    body: [
      "Marketing Studio generation — template renders, video personalization, and AI requests — is paid for with Studio credits. Active members receive a monthly credit allowance, granted once per calendar month while their membership is active. The allowance is a single monthly grant: it is not multiplied, and unspent credits simply remain in the account balance.",
      "Additional credits are sold in packs. Purchased credits are added to your account when payment completes, never expire, and have no cash value: they cannot be transferred, resold, exchanged, or redeemed for money. Purchased credits are non-refundable — with one exception: credits spent on a generation job that fails, or that WorldEye does not fulfill, are refunded to your account automatically. AI requests that remain unfulfilled for 7 days are refunded automatically.",
      "AI content in the Studio is created to order by Cosmo, WorldEye's AI assistant. It is not generated instantly: typical turnaround is a few hours, and no specific delivery time is guaranteed. AI output is provided as-is for your marketing use; you are responsible for reviewing it before publishing and for the disclosure obligations in Section 6.",
    ],
  },
];
