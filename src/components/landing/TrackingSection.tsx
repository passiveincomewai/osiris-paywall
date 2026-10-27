import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import TrackingDemoMount from "./TrackingDemoMount";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { isPublished } from "@/i18n/manifest";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";

/**
 * Section 2 — flights, satellites & maritime tracking. The demo stage
 * (recordings of the real globe + tabs + sample telemetry panel) mounts
 * behind the IoGate; the server-rendered fallback is a real frame from
 * the product's intro film, used as a still, never presented as live.
 *
 * Copy comes from the home dictionary (tracking block). The flight
 * tracker link localizes when that page is published in the locale;
 * the satellite tracker keeps its English URL until its own tranche.
 */
function StaticStage({ alt }: { alt: string }) {
  return (
    <figure className="relative rounded-2xl border border-white/10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/worldeye-cinematic-poster.jpg"
        alt={alt}
        width={1920}
        height={1080}
        loading="lazy"
        className="w-full h-auto"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06060C]/70 via-transparent to-transparent" />
    </figure>
  );
}

export default function TrackingSection({
  copy = enHome,
  locale = "en",
}: {
  copy?: HomeCopy;
  locale?: LocaleCode;
} = {}) {
  const tracking = copy.tracking;
  const flightHref = isPublished("live-flight-tracker", locale)
    ? localizedPath("live-flight-tracker", locale)
    : "/live-flight-tracker";
  return (
    <section aria-label={tracking.ariaLabel} data-landing-view="tracking" className="relative">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <SectionHeader
          eyebrow={tracking.eyebrow}
          title={tracking.title}
          sub={tracking.sub}
        />
        <Reveal delay={0.1} className="mt-8">
          <TrackingDemoMount fallback={<StaticStage alt={tracking.stageAlt} />} />
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href={flightHref}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white text-sm font-semibold transition"
            >
              {tracking.ctaFlight} <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link href="/satellite-tracker" className="text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition">
              {tracking.satelliteLink}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
