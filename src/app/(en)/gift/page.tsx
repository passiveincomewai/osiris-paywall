import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import { auth } from "@/auth";
import { resolvePlans, type PlanKey } from "@/lib/billing/plans";
import { giftSubscriptionsEnabled } from "@/lib/billing/gift-flag";
import { GIFT_PLAN_KEYS } from "@/lib/billing/gift";
import GiftClient, { type GiftPlanOption } from "./GiftClient";

/**
 * /gift — buy one prepaid term of a WorldEye plan for someone else.
 *
 * Dark with the feature: notFound() while GIFT_SUBSCRIPTIONS_ENABLED
 * is off (the /developers pattern), and giftPublicPaths() keeps it
 * out of the sitemap until then. The plan list renders from the
 * central plan config (lib/billing/plans) — the same display names
 * and prices the picker sells — and only plans whose price id is
 * configured are offered.
 */
export const metadata: Metadata = {
  title: "Gift a WorldEye Plan",
  description:
    "Send someone a prepaid term of WorldEye Lite, Pro or Ultra. One term, paid up front — gifts never auto-renew.",
  alternates: { canonical: "/gift" },
};

export default async function GiftPage() {
  if (!giftSubscriptionsEnabled(process.env)) notFound();

  const plans = resolvePlans(process.env);
  const options: GiftPlanOption[] = GIFT_PLAN_KEYS.map((key: PlanKey) => plans[key])
    .filter((p) => p.sellable)
    .map((p) => ({
      key: p.key,
      displayName: p.displayName,
      displayPrice: p.displayPrice,
      period: p.period ?? "monthly",
    }));

  const session = await auth();

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-[11px] font-black tracking-[0.2em] text-[#D4AF37]">
          GIFT WORLDEYE
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">
          Give the whole planet, for one term
        </h1>
        <p className="mt-4 text-base text-white/65 leading-relaxed">
          Pick a plan and the person you&apos;re sending it to. You pay for
          exactly one term up front; they get an email with a redemption
          link and the full term of access once they claim it. Gifts never
          auto-renew — nothing is charged to you or them when the term ends.
        </p>
        <Suspense>
          <GiftClient plans={options} buyerEmail={session?.user?.email ?? null} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
