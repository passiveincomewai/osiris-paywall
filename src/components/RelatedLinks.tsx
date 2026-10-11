import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type RelatedLink = { label: string; desc: string; href: string };

// "Explore more" internal-link block for SEO pages. Only ever link among the
// public SEO pages (about, features, use-cases, faq, cameras, trackers, blog,
// contact, changelog, security, terms, privacy) — never to /cameras/countries
// or any directory page.
export default function RelatedLinks({ links }: { links: RelatedLink[] }) {
  return (
    <section aria-label="Related pages" className="mt-16 md:mt-20">
      <h2 className="text-2xl md:text-3xl font-bold text-center">
        Explore <span className="text-[#D4AF37]">more</span>
      </h2>
      <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#D4AF37]/40 hover:bg-white/[0.04] transition"
          >
            <p className="font-semibold text-white/90 flex items-center gap-2">
              {l.label}
              <ArrowRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
            </p>
            <p className="text-sm text-white/45 mt-1.5 leading-relaxed">{l.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
