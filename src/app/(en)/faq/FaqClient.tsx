import { ChevronDown } from "lucide-react";

export type Faq = { q: string; a: React.ReactNode };

/**
 * Server-rendered FAQ accordion built on native <details>/<summary>.
 *
 * The previous implementation was a client component that only mounted an
 * answer into the DOM after a click (`open && ...`), so the server-rendered
 * HTML contained the questions but none of the answers — the answer text
 * existed solely in the RSC/JS payload, leaving the visible body nearly
 * empty for no-JS visitors and crawlers. Native <details> keeps every
 * answer in the server HTML, works with zero JavaScript, and preserves
 * the same card design and click-to-expand interaction.
 *
 * Each item carries data-faq-item / data-faq-q hooks and each group
 * section a data-faq-group hook: the FaqSearch client enhancer
 * filters these server-rendered nodes in place (hide/show + open),
 * so search never re-renders or removes answers from the HTML.
 */
function faqId(q: string): string {
  const slug = q
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `faq-${slug || "q"}`;
}

function FaqItem({ q, a }: Faq) {
  return (
    <details
      id={faqId(q)}
      data-faq-item=""
      data-faq-q={q}
      className="group border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden scroll-mt-24"
    >
      <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-left [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-white/90">{q}</span>
        <ChevronDown className="w-5 h-5 text-[#D4AF37] shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="faq-answer px-6 pb-5 text-sm text-white/60 leading-relaxed space-y-2">
        {a}
      </div>
    </details>
  );
}

export default function FaqAccordion({ groups }: { groups: { title: string; faqs: Faq[] }[] }) {
  return (
    <div className="space-y-10">
      {/* Subtle fade/slide when an answer opens, echoing the old motion
          accordion's 0.25s ease. Pure CSS so it needs no client JS. */}
      <style>{`
        @keyframes faq-answer-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        details[open] .faq-answer { animation: faq-answer-in 0.25s ease; }
      `}</style>
      {groups.map((g) => (
        <section key={g.title} data-faq-group="">
          <h2 className="text-xl md:text-2xl font-bold mb-5">
            <span className="text-[#D4AF37]">{g.title}</span>
          </h2>
          <div className="space-y-3">
            {g.faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
