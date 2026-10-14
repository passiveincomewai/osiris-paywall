import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import PlansCards from "./PlansCards";

/**
 * Section 5 — Free vs Pro. The two plan cards are built from the
 * code-verified entitlement table in the design plan (see PlansCards);
 * the shell carries the headline and the comparison-page line, which
 * keeps the shell's /gods-eye-view internal link alive.
 */
export default function PlansSection() {
  return (
    <section aria-label="Free and Pro plans" className="relative bg-gradient-to-b from-transparent via-[#D4AF37]/[0.04] to-transparent">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <SectionHeader
          eyebrow="Plans"
          title="Free to Explore. Pro When You Want More."
        />
        <Reveal delay={0.1} className="mt-10">
          <PlansCards />
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-8 text-sm md:text-base text-white/55">
            Comparing tools?{" "}
            <Link
              href="/gods-eye-view"
              className="text-[#0096FF] underline decoration-[#0096FF]/40 underline-offset-2 hover:decoration-[#0096FF] font-semibold"
            >
              See how WorldEye compares to God&apos;s Eye View
            </Link>
            .
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition"
          >
            Compare plans on the pricing page <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
