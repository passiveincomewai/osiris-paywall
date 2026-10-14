import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import TrackingDemoMount from "./TrackingDemoMount";

/**
 * Section 2 — flights, satellites & maritime tracking. The demo stage
 * (recordings of the real globe + tabs + sample telemetry panel) mounts
 * behind the IoGate; the server-rendered fallback is a real frame from
 * the product's intro film, used as a still, never presented as live.
 */
function StaticStage() {
  return (
    <figure className="relative rounded-2xl border border-white/10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/worldeye-cinematic-poster.jpg"
        alt="Earth from orbit with live tracking overlays in WorldEye"
        width={1920}
        height={1080}
        loading="lazy"
        className="w-full h-auto"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06060C]/70 via-transparent to-transparent" />
    </figure>
  );
}

export default function TrackingSection() {
  return (
    <section aria-label="Flight, satellite and maritime tracking" data-landing-view="tracking" className="relative">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <SectionHeader
          eyebrow="Live Tracking"
          title="Track the Planet in Motion."
          sub="Follow aircraft, satellites, and maritime activity from one interactive platform."
        />
        <Reveal delay={0.1} className="mt-8">
          <TrackingDemoMount fallback={<StaticStage />} />
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/live-flight-tracker"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white text-sm font-semibold transition"
            >
              Explore Tracking <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link href="/satellite-tracker" className="text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition">
              Satellite tracker
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
