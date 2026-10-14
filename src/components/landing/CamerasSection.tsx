import Link from "next/link";
import { ArrowRight } from "lucide-react";
import GlobeHomeLink from "../GlobeHomeLink";
import Reveal from "./Reveal";

/**
 * Section 1 — live cameras. Opens with the shell's header block: the
 * homepage H1 (same text as always, re-homed here from the old hero-exit
 * strip), the brief's camera headline as H2, and the strip's three CTAs.
 * Below it, the camera gallery island mounts (see CameraGallery); until it
 * does — and for crawlers — these category cards carry the section.
 */
export const CAMERA_CATEGORIES = [
  { label: "Cities", href: "/city-webcams" },
  { label: "Ski Resorts", href: "/ski-webcams" },
  { label: "Beaches", href: "/beach-webcams" },
  { label: "Highways", href: "/live-traffic-cameras" },
  { label: "Mountains", href: "/ski-webcams" },
  { label: "Airports", href: "/airport-webcams" },
] as const;

export default function CamerasSection({ gallery }: { gallery?: React.ReactNode }) {
  return (
    <section aria-label="Live cameras" className="relative">
      <div className="border-t border-[#D4AF37]/25 bg-gradient-to-b from-[#0096FF]/[0.07] to-transparent">
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-10">
          <Reveal>
            <p className="text-[11px] font-bold tracking-[0.25em] text-[#D4AF37]">
              WORLDEYE — LIVE PLANETARY INTELLIGENCE
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mt-4">
              WorldEye — the world, live on one globe
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-white/90 mt-6">
              36,000+ Live Cameras. One World.
            </h2>
            <p className="text-base md:text-lg text-white/60 leading-relaxed mt-3 max-w-2xl">
              Explore cities, highways, mountains, beaches, and landmarks around the planet.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <GlobeHomeLink className="inline-flex items-center px-5 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white text-sm font-semibold transition">
                Explore the live globe
              </GlobeHomeLink>
              <Link
                href="/signup"
                className="inline-flex items-center px-5 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 text-sm font-semibold transition"
              >
                Get started free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center px-5 py-3 rounded-xl border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-sm font-semibold transition"
              >
                See Pro plans
              </Link>
            </div>
          </Reveal>

          {gallery ?? (
            <Reveal delay={0.1} className="mt-10">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {CAMERA_CATEGORIES.map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[#0096FF]/50 hover:bg-white/[0.05] transition p-5 flex items-center gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#0096FF] shrink-0" aria-hidden />
                    <span className="font-semibold text-white">{label}</span>
                    <ArrowRight className="w-4 h-4 ml-auto text-white/30 group-hover:text-[#0096FF] transition" aria-hidden />
                  </Link>
                ))}
              </div>
              <Link
                href="/cameras"
                className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition"
              >
                Explore Live Cameras <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
