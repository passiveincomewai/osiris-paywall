import Link from "next/link";
import { Plus } from "lucide-react";
import { HOME_FAQS } from "@/lib/home-faqs";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";

/**
 * Section 6 — FAQ + contact. The FAQ renders the same HOME_FAQS that feed
 * the FAQPage JSON-LD in page.tsx, as a native <details> accordion: every
 * answer is in the server-rendered HTML (crawlable, zero JS, keyboard
 * accessible), visible only when expanded. The contact line preserves the
 * old contact card's three paths (mailto, /contact, /about).
 */
export default function FaqSection() {
  return (
    <section aria-label="Frequently asked questions" data-landing-view="faq" className="relative">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <SectionHeader eyebrow="FAQ" title="Frequently asked questions" />
        <Reveal delay={0.1}>
          <div className="mt-8 max-w-3xl border-t border-white/10">
            {HOME_FAQS.map((f, i) => (
              <details key={f.q} className="group border-b border-white/10" open={i === 0}>
                <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 list-none [&::-webkit-details-marker]:hidden">
                  <h3 className="font-semibold text-white">{f.q}</h3>
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
            Questions? Talk to a human —{" "}
            <a
              href="mailto:passiveincomewai@gmail.com"
              className="text-[#0096FF] underline decoration-[#0096FF]/40 underline-offset-2 hover:decoration-[#0096FF]"
            >
              email us
            </a>
            , use the{" "}
            <Link href="/contact" className="text-[#0096FF] underline decoration-[#0096FF]/40 underline-offset-2 hover:decoration-[#0096FF]">
              contact page
            </Link>
            , or read{" "}
            <Link href="/about" className="text-[#0096FF] underline decoration-[#0096FF]/40 underline-offset-2 hover:decoration-[#0096FF]">
              about WorldEye
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}
