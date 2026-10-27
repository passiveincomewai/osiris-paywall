import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import HazardsDemoMount from "./HazardsDemoMount";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";

/**
 * Section 3 — weather, wildfires & earthquakes. The stage + live-data
 * side panel mount behind the IoGate; the static shell keeps the
 * headline, the CTA and the tracker links. Nothing here states or
 * implies a current event: live numbers only ever come from the real
 * feeds inside the island.
 *
 * Copy comes from the home dictionary (hazards block); the tracker
 * links keep their English URLs until those pages get their own
 * localized tranches.
 */
export default function HazardsSection({
  copy = enHome,
}: {
  copy?: HomeCopy;
} = {}) {
  const hazards = copy.hazards;
  return (
    <section aria-label={hazards.ariaLabel} data-landing-view="hazards" className="relative bg-gradient-to-b from-transparent via-[#0096FF]/[0.04] to-transparent">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <SectionHeader
          eyebrow={hazards.eyebrow}
          title={hazards.title}
          sub={hazards.sub}
        />
        <Reveal delay={0.1} className="mt-8">
          <HazardsDemoMount />
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/weather-tracker"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white text-sm font-semibold transition"
            >
              {hazards.exploreLink} <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link href="/earthquake-tracker" className="text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition">
              {hazards.earthquakeLink}
            </Link>
            <Link href="/wildfire-tracker" className="text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition">
              {hazards.wildfireLink}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
