/**
 * /support/thanks — the donation return_url (2026-11-09). Redirect-
 * based payment methods finish here. The Stripe session is verified
 * SERVER-SIDE: only a session whose metadata marks it as a donation
 * AND that Stripe reports paid renders the thank-you (with the real
 * amount); anything else gets a neutral confirmation-pending panel —
 * this page never trusts the URL alone, and the donation itself is
 * recorded by the webhook, not by this page.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import DonateThanksPanel from "@/components/donate/DonateThanksPanel";
import { stripe } from "@/lib/stripe";
import type { DonateFrequency } from "@/lib/donate/config";

export const metadata: Metadata = {
  title: "Thank You for Supporting WorldEye | WorldEye",
  description: "Your support helps keep WorldEye free for everyone.",
  alternates: { canonical: "/support/thanks" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function verifyDonation(sessionId: string | undefined): Promise<{
  amount: number;
  frequency: DonateFrequency;
} | null> {
  if (!sessionId) return null;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.type !== "donation") return null;
    if (session.payment_status !== "paid") return null;
    return {
      amount: Math.round((session.amount_total ?? 0) / 100),
      frequency: session.metadata.frequency === "monthly" ? "monthly" : "once",
    };
  } catch {
    return null;
  }
}

export default async function SupportThanksPage({
  searchParams,
}: {
  searchParams?: Promise<{ session_id?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const verified = await verifyDonation(sp.session_id);

  return (
    <div className="min-h-screen bg-[#060809] text-zinc-100">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-zinc-300 transition hover:text-white"
        >
          <ArrowLeft size={15} />
          Back to map
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/worldeye-header-logo.png"
          alt="WorldEye"
          width={1063}
          height={290}
          className="h-8 w-auto"
        />
        <span className="w-[92px]" aria-hidden />
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 pb-4 pt-6">
        {verified && sp.session_id ? (
          <DonateThanksPanel
            sessionId={sp.session_id}
            amount={verified.amount}
            frequency={verified.frequency}
          />
        ) : (
          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,#14171C,#0B0C10)] px-6 py-10 text-center">
            <h1 className="text-2xl font-bold text-white">
              We couldn&rsquo;t confirm that payment yet
            </h1>
            <p className="mx-auto mt-3 max-w-[420px] text-sm leading-relaxed text-zinc-400">
              If you just completed a donation, it may still be processing —
              your receipt email from Stripe is the confirmation. Nothing
              here affects your donation either way.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-2xl bg-[linear-gradient(90deg,#8BEAFA,#22D3EE)] px-6 py-3 text-sm font-bold text-[#06202B] transition hover:brightness-105"
            >
              Back to the globe
            </Link>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
