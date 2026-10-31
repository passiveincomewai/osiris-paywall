import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { giftSubscriptionsEnabled } from "@/lib/billing/gift-flag";

/**
 * /gift/sent — where a completed gift checkout lands. Fulfilment is
 * webhook-driven, so this page makes no claim the email has already
 * arrived — it says exactly what happens next.
 */
export const metadata: Metadata = {
  title: "Gift sent — WorldEye",
  description: "Your WorldEye gift is on its way.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/gift/sent" },
};

export default function GiftSentPage() {
  if (!giftSubscriptionsEnabled(process.env)) notFound();
  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-[11px] font-black tracking-[0.2em] text-[#D4AF37]">
          GIFT WORLDEYE
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Your gift is on its way</h1>
        <p className="mt-4 text-base text-white/65 leading-relaxed">
          As soon as your payment finishes processing, the recipient gets an
          email with a redemption link. When they claim it — signed in with
          the email address you sent it to — their plan starts with the full
          prepaid term you bought.
        </p>
        <p className="mt-4 text-base text-white/65 leading-relaxed">
          Nothing renews and nothing more is charged when the term ends.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:bg-[#e5c558]"
          >
            Back to the globe
          </Link>
          <Link
            href="/gift"
            className="rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-white/80 transition hover:border-white/35"
          >
            Send another gift
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
