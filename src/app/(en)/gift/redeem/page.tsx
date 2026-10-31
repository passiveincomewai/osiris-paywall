import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import { giftSubscriptionsEnabled } from "@/lib/billing/gift-flag";
import RedeemClient from "./RedeemClient";

/**
 * /gift/redeem?code=… — the recipient's claim page, linked from the
 * gift email. Dark with the feature (notFound while the flag is
 * off). Transactional: noindex, and the sitemap never lists it.
 */
export const metadata: Metadata = {
  title: "Redeem your WorldEye gift",
  description: "Claim the WorldEye plan you were gifted.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/gift/redeem" },
};

export default function GiftRedeemPage() {
  if (!giftSubscriptionsEnabled(process.env)) notFound();
  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-[11px] font-black tracking-[0.2em] text-[#D4AF37]">
          YOUR WORLDEYE GIFT
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Redeem your gift</h1>
        <Suspense>
          <RedeemClient />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
