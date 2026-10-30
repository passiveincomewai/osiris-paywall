/**
 * Server gate for the Powder Pass popup (#6). Renders NOTHING while
 * the powderPassEnabled flag is off — exactly the discipline the
 * pricing page's Powder Pass card follows — so the popup ships dark
 * with the rest of the Powder Pass launch and lights up the moment
 * POWDER_PASS_ENABLED flips (the Stripe price id is still pending;
 * nothing here can render before then). The pin test
 * (powder-pass-gate.test.ts) locks this: no flag → no trigger markup,
 * and the trigger module is only reachable behind this gate.
 */

import { powderPassEnabled } from "@/lib/ski/access";
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";
import PowderPassTrigger from "./PowderPassTrigger";

export default function PowderPassGate() {
  if (!powderPassEnabled()) return null;
  // Terms from the same summary PowderPassPromo renders from —
  // CHECKOUT_PLAN_SUMMARIES.ski ($4.99/month, 10-day trial). The CTA
  // label mirrors the promo's own ("Start 10-Day Free Trial"),
  // composed from the summary's trialDays so it cannot drift.
  const ski = CHECKOUT_PLAN_SUMMARIES.ski;
  return (
    <PowderPassTrigger
      option={{
        price: ski.price,
        per: ski.per,
        trialLabel: ski.trialLabel ?? "",
        cta: `Start ${ski.trialDays}-Day Free Trial`,
      }}
    />
  );
}
