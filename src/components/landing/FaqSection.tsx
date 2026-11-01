import Link from "next/link";
import { Plus } from "lucide-react";
import Reveal from "./Reveal";
import MicroLabel from "../design/MicroLabel";
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
 *
 * Visual transformation (W4, FAQ consolidation): the section now sits
 * on the design system — token container, MicroLabel header, token
 * hairlines and text — replacing the SectionHeader gold eyebrow and
 * the #0096FF SEO-blue dialect. Copy, links and the accordion are
 * unchanged. (SectionHeader itself is untouched: PlansSection still
 * uses it, and the pricing surface is locked.)
 */
export default function FaqSection({
  copy = enHome,
}: {
  copy?: HomeCopy;
} = {}) {
  const faq = copy.faq;
  const linkStyle = {
    color: "var(--we-blue-strong)",
    textDecorationColor: "var(--we-line-3)",
  } as const;
  return (
    <section aria-label={faq.ariaLabel} data-landing-view="faq" className="relative">
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: "var(--we-wide)",
          paddingLeft: "var(--we-gutter)",
          paddingRight: "var(--we-gutter)",
          paddingTop: "var(--we-section-y)",
          paddingBottom: "var(--we-section-y)",
        }}
      >
        <Reveal>
          <MicroLabel>{faq.eyebrow}</MicroLabel>
          <h2
            className="font-[family-name:var(--we-font-display)]"
            style={{
              color: "var(--we-text-1)",
              fontSize: "var(--we-size-display-2)",
              lineHeight: "var(--we-leading-display)",
              fontWeight: 560,
              marginTop: "var(--we-space-4)",
            }}
          >
            {faq.title}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div
            className="mt-8 max-w-3xl"
            style={{ borderTop: "1px solid var(--we-line-2)" }}
          >
            {faq.items.map((f, i) => (
              <details
                key={f.q}
                className="group"
                style={{ borderBottom: "1px solid var(--we-line-2)" }}
                open={i === 0}
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 list-none [&::-webkit-details-marker]:hidden">
                  <h3
                    className="font-[family-name:var(--we-font-display)] text-lg font-medium"
                    style={{ color: "var(--we-text-1)" }}
                  >
                    {f.q}
                  </h3>
                  <Plus
                    className="w-5 h-5 shrink-0 transition-transform duration-300 group-open:rotate-45"
                    style={{ color: "var(--we-blue-strong)" }}
                    aria-hidden
                  />
                </summary>
                <p
                  className="pb-5 text-sm md:text-base"
                  style={{
                    color: "var(--we-text-2)",
                    lineHeight: "var(--we-leading-body)",
                  }}
                >
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <p
            className="mt-12 text-sm md:text-base"
            style={{ color: "var(--we-text-2)" }}
          >
            {faq.contactBefore}{" "}
            <a
              href="mailto:contact@worldeye.app"
              className="underline underline-offset-2"
              style={linkStyle}
            >
              {faq.contactEmailLink}
            </a>
            {faq.contactMiddle1}{" "}
            <Link href="/contact" className="underline underline-offset-2" style={linkStyle}>
              {faq.contactPageLink}
            </Link>
            {faq.contactMiddle2}{" "}
            <Link href="/about" className="underline underline-offset-2" style={linkStyle}>
              {faq.contactAboutLink}
            </Link>
            {faq.contactAfter}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
