import Link from "next/link";
import { Plus } from "lucide-react";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";

/**
 * Section 6 — FAQ + contact. The FAQ renders the home dictionary's
 * items — the same list the homepage's FAQPage JSON-LD is built from
 * (src/lib/home-faqs.ts re-exports the English dictionary items, so
 * the two can never drift apart) — as a native <details> accordion:
 * every answer is in the server-rendered HTML (crawlable, zero JS,
 * keyboard accessible), visible only when expanded. The contact line
 * preserves the old contact card's three paths (mailto, /contact,
 * /about).
 */
export default function FaqSection({
  copy = enHome,
}: {
  copy?: HomeCopy;
} = {}) {
  const faq = copy.faq;
  return (
    <section aria-label={faq.ariaLabel} data-landing-view="faq" className="relative">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <SectionHeader eyebrow={faq.eyebrow} title={faq.title} />
        <Reveal delay={0.1}>
          <div className="mt-8 max-w-3xl border-t border-white/10">
            {faq.items.map((f, i) => (
              <details key={f.q} className="group border-b border-white/10" open={i === 0}>
                <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 list-none [&::-webkit-details-marker]:hidden">
                  <h3 className="font-display text-lg font-medium text-white">{f.q}</h3>
                  <Plus
                    className="w-5 h-5 shrink-0 text-[#0096FF] transition-transform duration-300 group-open:rotate-45"
                    aria-hidden
                  />
                </summary>
                <p className="pb-5 text-sm md:text-base text-white/55 leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-12 text-sm md:text-base text-white/55">
            {faq.contactBefore}{" "}
            <a
              href="mailto:passiveincomewai@gmail.com"
              className="text-[#0096FF] underline decoration-[#0096FF]/40 underline-offset-2 hover:decoration-[#0096FF]"
            >
              {faq.contactEmailLink}
            </a>
            {faq.contactMiddle1}{" "}
            <Link href="/contact" className="text-[#0096FF] underline decoration-[#0096FF]/40 underline-offset-2 hover:decoration-[#0096FF]">
              {faq.contactPageLink}
            </Link>
            {faq.contactMiddle2}{" "}
            <Link href="/about" className="text-[#0096FF] underline decoration-[#0096FF]/40 underline-offset-2 hover:decoration-[#0096FF]">
              {faq.contactAboutLink}
            </Link>
            {faq.contactAfter}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
