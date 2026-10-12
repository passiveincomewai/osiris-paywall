// WorldEye Affiliate Program — Terms & Conditions (server component).
import { SectionTitle } from "@/components/affiliate/ui";

export const metadata = {
  title: "Affiliate Terms & Conditions — WorldEye",
  description: "Terms and conditions for the WorldEye affiliate program.",
};

const SECTIONS: { n: string; title: string; body: string[] }[] = [
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
      "Payouts are processed through supported providers (such as Stripe Connect or PayPal Payouts, depending on eligibility) or by manual arrangement, after administrator approval. Affiliates are solely responsible for reporting and paying all taxes on their commission income. WorldEye may require identity verification and tax documentation (e.g., W-9/W-8BEN or local equivalents) before releasing payouts, and may withhold where required by law.",
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
];

export default function AffiliateTerms() {
  return (
    <div className="max-w-3xl mx-auto">
      <SectionTitle kicker="Legal" title="Affiliate Terms & Conditions" />
      <p className="text-sm text-slate-400 font-mono mb-8">Last updated: October 2026</p>

      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] backdrop-blur-md p-5 mb-8 text-sm text-amber-100/90 leading-relaxed">
        <span className="font-mono font-bold text-amber-300">IMPORTANT — PLEASE READ: </span>
        Multi-level referral payouts are subject to legal review in each jurisdiction where the Program
        operates. WorldEye may adjust network depth, override rates, or eligibility by region to remain
        compliant with applicable law. This page summarizes the Program&apos;s terms; it is not legal advice.
      </div>

      <div className="space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.n}
            className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 md:p-6"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" }}>
            <h2 className="text-lg font-bold text-white">
              <span className="font-mono text-[#0096FF] mr-2">{s.n}.</span>
              {s.title}
            </h2>
            <div className="mt-3 space-y-3">
              {s.body.map((p, i) => (
                <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-500 font-mono leading-relaxed">
        // Questions about these terms? Contact the WorldEye team before promoting.
        Participation in the Program constitutes acceptance of these terms.
      </p>
    </div>
  );
}
