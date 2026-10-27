import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";

/**
 * Section 4 — the professional OSINT toolkit. Every card is a real,
 * implemented Pro capability (verified against the app's gating code).
 * No OI / AI-analyst content appears here, by explicit direction.
 * Card visuals are captured screenshots of the actual panels; the icon
 * treatment is the pre-capture shell.
 *
 * Card titles/descriptions come from the home dictionary (osint block,
 * in OSINT_CARDS order); slugs and hrefs stay in code — routes are
 * never translated. NOTE: the imagery alt texts in HomeSeoShell's
 * OSINT_VISUALS stay English in this tranche (alt copy for the
 * satellite/maritime/search captures was not part of the dictionary
 * extraction; flagged in the build REPORT).
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
    title: "Advanced Search",
    desc: "Pro filters across places, cameras and intel — basic search is free.",
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

export default function OsintSection({
  visuals,
  copy = enHome,
}: {
  visuals?: Record<string, React.ReactNode>;
  copy?: HomeCopy;
}) {
  const osint = copy.osint;
  return (
    <section aria-label={osint.ariaLabel} data-landing-view="osint" className="relative">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <SectionHeader
          eyebrow={osint.eyebrow}
          eyebrowClass="text-[#D4AF37]"
          title={osint.title}
          sub={osint.sub}
        />
        <div className="mt-10 flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {OSINT_CARDS.map((card, i) => {
            const localized = osint.cards[i] ?? card;
            return (
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
                        {localized.title.split(" ").map((w) => w[0]).join("")}
                      </span>
                    )}
                    <span className="absolute top-3 left-3 text-[10px] font-bold tracking-widest text-[#D4AF37] border border-[#D4AF37]/40 rounded px-1.5 py-0.5 bg-black/40">
                      {osint.proBadge}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white">{localized.title}</h3>
                    <p className="text-sm text-white/55 leading-relaxed mt-1">{localized.desc}</p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={0.15}>
          <Link
            href="/features"
            className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-[#D4AF37] hover:text-[#e8c55a] transition"
          >
            {osint.exploreLink} <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
