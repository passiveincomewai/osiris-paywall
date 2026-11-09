/**
 * /support — Support WorldEye (2026-11-09). The footer's COMPANY
 * "Support WorldEye" link lands here: the donation form (the same
 * step-1 component as the popup) full width, plus the donation FAQ
 * with the spec's exact answers. Donations are gifts to WorldEye —
 * never tax-deductible, never a plan purchase.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import DonateSupportPanel from "@/components/donate/DonateSupportPanel";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { getDonateCopy } from "@/i18n/dictionaries";

export const metadata: Metadata = {
  title: "Support WorldEye — Keep the Free Globe Free | WorldEye",
  description:
    "WorldEye is free for everyone, with no signup and no ads. Chip in with a one-time or monthly donation to help cover the servers and data feeds that keep it running.",
  alternates: { canonical: "/support" },
  openGraph: {
    title: "Support WorldEye — Keep the Free Globe Free | WorldEye",
    description:
      "Free for everyone. Funded by people like you. Support the live globe with a one-time or monthly donation.",
    url: "/support",
    type: "website",
  },
};

export default function SupportPage() {
  const copy = getDonateCopy("en");
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
        <LanguageHeaderControl />
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 pb-4 pt-6">
        <DonateSupportPanel />

        <section aria-label={copy.faqHeading} className="mt-14">
          <h2 className="text-xl font-bold text-white">{copy.faqHeading}</h2>
          <div className="mt-4 space-y-3">
            {copy.faq.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
              >
                <h3 className="text-[15px] font-semibold text-white">{item.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
