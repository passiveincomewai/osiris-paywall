/**
 * Support WorldEye donation copy (English source).
 *
 * Every string from Jameson's 2026-11-09 spec, verbatim. Guardrails
 * baked into the copy itself: donations go to WorldEye (never the
 * separate open-source God's Eye View project), they are NOT
 * tax-deductible, and no copy claims donations fund a specific number
 * of cameras or any specific outcome. `{count}` in `body` is replaced
 * with the locked live-camera headline label (74,229) at render time.
 */
export interface DonateCopy {
  eyebrow: string;
  tagline: string;
  headlineA: string;
  headlineB: string;
  body: string;
  oneTime: string;
  monthly: string;
  mostImpact: string;
  presetLabels: Record<"5" | "10" | "25" | "50", string>;
  suggested: string;
  otherAmount: string;
  otherAmountPlaceholder: string;
  minHintOnce: string;
  minHintMonthly: string;
  donateCtaOnce: string;
  donateCtaMonthly: string;
  fineSecure: string;
  fineOnce: string;
  fineMonthly: string;
  fineNoAds: string;
  upsellA: string;
  upsellB: string;
  upsellC: string;
  seePlans: string;
  maybeLater: string;
  close: string;
  changeAmount: string;
  secureCheckout: string;
  checkoutTitle: string;
  summaryOnceTitle: string;
  summaryOnceSub: string;
  summaryMonthlyTitle: string;
  summaryMonthlySub: string;
  perMonthSuffix: string;
  paymentsNote: string;
  loadError: string;
  retry: string;
  thanksTitleA: string;
  thanksTitleB: string;
  thanksBody: string;
  receiptOnce: string;
  receiptMonthly: string;
  backToGlobe: string;
  share: string;
  linkCopied: string;
  toastHeadline: string;
  toastBody: string;
  toastDonate: string;
  stripBold: string;
  stripRest: string;
  stripCta: string;
  heroButton: string;
  cardHeadline: string;
  cardBody: string;
  supportPageTitle: string;
  supportPageSub: string;
  faqHeading: string;
  faq: { q: string; a: string }[];
}

export const enDonate: DonateCopy = {
  eyebrow: "SUPPORT WORLDEYE",
  tagline: "Free for everyone. Funded by people like you.",
  headlineA: "Enjoying the free globe?",
  headlineB: "Help keep it free.",
  body: "{count} cameras, live flights and satellites, free with no signup and no ads. Servers and data feeds cost money every day. If WorldEye is useful to you, chip in.",
  oneTime: "One-time",
  monthly: "Monthly",
  mostImpact: "Most impact",
  presetLabels: {
    "5": "Coffee",
    "10": "Supporter",
    "25": "Backer",
    "50": "Champion",
  },
  suggested: "SUGGESTED",
  otherAmount: "Other amount",
  otherAmountPlaceholder: "Other amount",
  minHintOnce: "min $1",
  minHintMonthly: "per month · min $1",
  donateCtaOnce: "Donate {amount}",
  donateCtaMonthly: "Donate {amount} / month",
  fineSecure: "Secure payment by Stripe",
  fineOnce: "One-time, no account needed",
  fineMonthly: "Cancel monthly anytime",
  fineNoAds: "No ads, ever",
  upsellA: "Want more for your money?",
  upsellB: "Paid plans unlock every camera",
  upsellC: "+ the AI analyst, from $3.75/mo.",
  seePlans: "See plans",
  maybeLater: "Maybe later",
  close: "Close",
  changeAmount: "Change amount",
  secureCheckout: "Secure checkout",
  checkoutTitle: "Thank you for supporting WorldEye",
  summaryOnceTitle: "One-time donation",
  summaryOnceSub: "Charged once",
  summaryMonthlyTitle: "Monthly support",
  summaryMonthlySub: "Billed monthly · cancel anytime",
  perMonthSuffix: "/mo",
  paymentsNote: "Payments handled securely by Stripe",
  loadError: "Couldn't load checkout. Try again",
  retry: "Try again",
  thanksTitleA: "Thank you.",
  thanksTitleB: "You're keeping the planet live.",
  thanksBody:
    "Your support helps cover the servers and data feeds that keep WorldEye free for everyone. A receipt is on its way to your inbox.",
  receiptOnce: "One-time donation",
  receiptMonthly: "Monthly support",
  backToGlobe: "Back to the globe",
  share: "Share WorldEye",
  linkCopied: "Link copied",
  toastHeadline: "Like watching the planet live?",
  toastBody: "WorldEye is independent and ad-free. Chip in to keep it running.",
  toastDonate: "Donate",
  stripBold: "WorldEye is independent and ad-free.",
  stripRest: "If it's useful to you, help cover the servers and data feeds.",
  stripCta: "Support WorldEye",
  heroButton: "Support WorldEye",
  cardHeadline: "Enjoying the free globe?",
  cardBody:
    "WorldEye is independent and ad-free. Chip in to help cover the servers and data feeds.",
  supportPageTitle: "Support WorldEye",
  supportPageSub: "Free for everyone. Funded by people like you.",
  faqHeading: "Questions",
  faq: [
    {
      q: "Is my donation tax-deductible?",
      a: "No. WorldEye isn't a registered charity, so donations aren't tax-deductible.",
    },
    {
      q: "Can I cancel monthly support?",
      a: "Yes, anytime, from the link in your receipt email or by contacting us.",
    },
    {
      q: "Do donors get Pro?",
      a: "No. Donations support the free globe. If you want the paid features, see the plans.",
    },
  ],
};
