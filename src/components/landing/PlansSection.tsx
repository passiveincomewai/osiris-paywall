import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import PlansCards from "./PlansCards";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";

/**
 * Section 5 — Free vs Pro. The two plan cards are built from the
 * code-verified entitlement table in the design plan (see PlansCards);
 * the shell carries the headline and the comparison-page line, which
 * keeps the shell's /gods-eye-view internal link alive.
 *
 * Copy comes from the home dictionary (plans block); the pricing link
 * localizes, the comparison link keeps its English URL.
 */
export default function PlansSection({
  copy = enHome,
  locale = "en",
}: {
  copy?: HomeCopy;
  locale?: LocaleCode;
} = {}) {
  const plans = copy.plans;
  return (
    <section aria-label={plans.ariaLabel} data-landing-view="plans" className="relative bg-gradient-to-b from-transparent via-[#D4AF37]/[0.04] to-transparent">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <SectionHeader
          eyebrow={plans.eyebrow}
          title={plans.title}
        />
        <Reveal delay={0.1} className="mt-10">
          <PlansCards copy={copy} locale={locale} />
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-8 text-sm md:text-base text-white/55">
            {plans.compareBefore}{" "}
            <Link
              href="/gods-eye-view"
              className="text-[#0096FF] underline decoration-[#0096FF]/40 underline-offset-2 hover:decoration-[#0096FF] font-semibold"
            >
              {plans.compareLink}
            </Link>
            {plans.compareAfter}
          </p>
          <Link
            href={localizedPath("pricing", locale)}
            className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition"
          >
            {plans.pricingLink} <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
