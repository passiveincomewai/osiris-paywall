import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";

/**
 * Section 4 — the professional OSINT toolkit. Every card is a real,
 * implemented Pro capability (verified against the app's gating code).
 * No OI / AI-analyst content appears here, by explicit direction.
 * Card visuals are captured screenshots of the actual panels; the icon
 * treatment is the pre-capture shell.
 */
export const OSINT_CARDS = [
  {
    slug: "satellite-maps",
    title: "Satellite Maps",
    desc: "Full-screen satellite imagery on the globe.",
    href: "/features",
  },
  {
    slug: "maritime-tracking",
    title: "Maritime Tracking",
    desc: "Ships, ports and naval movements, live.",
    href: "/features",
  },
  {
    slug: "global-search",
    title: "Global Search",
    desc: "Search places and intel across the map.",
    href: "/features",
  },
  {
    slug: "cyber-intelligence",
    title: "Cyber Intelligence",
    desc: "Malware, botnets and outages as they surface.",
    href: "/features",
  },
  {
    slug: "camera-recording",
    title: "Camera Recording",
    desc: "Record clips from live cameras in your browser.",
    href: "/recording",
  },
] as const;

export default function OsintSection({ visuals }: { visuals?: Record<string, React.ReactNode> }) {
  return (
    <section aria-label="Professional OSINT toolkit" className="relative">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <SectionHeader
          eyebrow="Pro Toolkit"
          eyebrowClass="text-[#D4AF37]"
          title="Your Global Intelligence Command Center."
          sub="Powerful monitoring and research tools, together in one place."
        />
        <div className="mt-10 flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {OSINT_CARDS.map((card, i) => (
            <Reveal key={card.slug} delay={i * 0.06} className="min-w-[240px] snap-start md:min-w-0">
              <Link
                href={card.href}
                data-landing-event={`osint_card:${card.slug}`}
                className="group block h-full rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[#D4AF37]/50 hover:bg-white/[0.05] transition overflow-hidden"
              >
                <div className="relative aspect-[4/3] bg-gradient-to-br from-[#0096FF]/15 via-transparent to-[#D4AF37]/10 flex items-center justify-center overflow-hidden">
                  {visuals?.[card.slug] ?? (
                    <span
                      aria-hidden
                      className="w-14 h-14 rounded-full border border-[#0096FF]/40 flex items-center justify-center font-mono text-lg font-bold text-[#0096FF]/90"
                    >
                      {card.title.split(" ").map((w) => w[0]).join("")}
                    </span>
                  )}
                  <span className="absolute top-3 left-3 text-[10px] font-bold tracking-widest text-[#D4AF37] border border-[#D4AF37]/40 rounded px-1.5 py-0.5 bg-black/40">
                    PRO
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white">{card.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed mt-1">{card.desc}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <Link
            href="/features"
            className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-[#D4AF37] hover:text-[#e8c55a] transition"
          >
            Explore Pro Features <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
