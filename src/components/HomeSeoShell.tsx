import Link from "next/link";
import { HOME_FAQS } from "@/lib/home-faqs";
import SiteFooter from "./SiteFooter";

// Server-rendered content shell for the homepage. The globe app above it is
// a fullscreen client application, so crawlers (and anyone on a slow
// connection) otherwise meet a page with almost no readable content. This
// section ships in the initial HTML: one H1, plain-language copy about what
// WorldEye is, the FAQ (same source as the FAQPage JSON-LD), clear calls to
// action, and a clickable contact email.
//
// Placement is handled by the .home-seo-shell rule in globals.css: in flow
// it follows the cinematic scroll track, so a visitor who keeps scrolling
// past the globe reaches it; ad traffic that skips the hero never sees it
// cover the app.
export default function HomeSeoShell() {
  return (
    <section aria-label="About WorldEye" className="home-seo-shell relative bg-[#06060C] text-white">
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-4">
        <p className="text-[11px] font-bold tracking-[0.25em] text-[#D4AF37] mb-4">
          WORLDEYE — LIVE PLANETARY INTELLIGENCE
        </p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          WorldEye — the world, live on one globe
        </h1>
        <p className="mt-5 text-base md:text-lg text-white/65 leading-relaxed max-w-3xl">
          WorldEye is a live 3D globe that shows you the planet as it is right
          now — not yesterday, not a recording. Watch 36,000+ public cameras,
          follow flights and satellites in real time, and keep an eye on
          weather, earthquakes and wildfires, all on one map. It is free, it
          runs in your browser, and there is nothing to install.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center px-5 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white text-sm font-semibold transition"
          >
            Explore the live globe
          </Link>
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

        <h2 className="text-2xl font-bold mt-16 mb-4">What is WorldEye?</h2>
        <p className="text-white/60 leading-relaxed max-w-3xl">
          Most maps show you the past: photos taken months or years ago.
          WorldEye is a map of the present. It pulls live public data from
          around the world — camera networks, aircraft transponders, satellite
          positions, weather radar and hazard feeds — and fuses it into a
          single interactive globe you can spin, zoom and search.
        </p>
        <p className="text-white/60 leading-relaxed max-w-3xl mt-4">
          Open a camera in Tokyo, follow a flight over the Atlantic, or check
          the storm building off the coast — it all happens on the same
          screen, updated as the data arrives.
        </p>

        <h2 className="text-2xl font-bold mt-14 mb-4">Everything live, on one globe</h2>
        <p className="text-white/60 leading-relaxed max-w-3xl">
          Every layer is live, and every layer is in one place:
        </p>
        <div className="grid md:grid-cols-3 gap-5 mt-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="font-semibold text-white">36,000+ live cameras</h3>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              Traffic, city streets, landmarks, beaches, airports and wildlife
              from public camera networks worldwide. Click a dot, watch the
              world go by. Browse the{" "}
              <Link href="/cameras" className="text-[#0096FF] hover:underline">
                live cameras
              </Link>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="font-semibold text-white">Flights and satellites</h3>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              Aircraft tracked in real time from ADS-B broadcasts, plus
              satellites and the International Space Station on their live
              orbits.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="font-semibold text-white">Weather and hazards</h3>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              Live weather radar, earthquakes as they are reported, and
              wildfires detected from satellite data — so you see events as
              they unfold, not after.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mt-14 mb-4">Free to explore. Pro when you want more.</h2>
        <p className="text-white/60 leading-relaxed max-w-3xl">
          The globe is free for everyone — no account, no trial clock, no
          catch. WorldEye Pro is for people who want to go deeper: the full
          OSINT toolkit, satellite map view, global search and premium
          intelligence feeds, including cyber threats, maritime tracking and
          live news. Pro also includes the OI AI analyst, which answers
          questions about what you are seeing; it runs on your own AI provider
          key, billed by the provider at cost. Compare the plans on the{" "}
          <Link href="/pricing" className="text-[#0096FF] hover:underline">
            pricing page
          </Link>{" "}
          or read the full{" "}
          <Link href="/features" className="text-[#0096FF] hover:underline">
            feature list
          </Link>
          .
        </p>

        <h2 className="text-2xl font-bold mt-14 mb-4">Who WorldEye is for</h2>
        <p className="text-white/60 leading-relaxed max-w-3xl">
          Curious minds checking a place before they travel. Weather watchers
          and plane spotters. Journalists, researchers and OSINT analysts
          following events as they break. Teachers showing a class the living
          planet. If it is happening somewhere on Earth right now, WorldEye is
          how you watch it — including the hosted, no-install{" "}
          <Link href="/gods-eye-view" className="text-[#0096FF] hover:underline">
            God&apos;s Eye View
          </Link>{" "}
          of the planet.
        </p>

        <h2 className="text-2xl font-bold mt-14 mb-6">Frequently asked questions</h2>
        <div className="space-y-6 max-w-3xl">
          {HOME_FAQS.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-white">{f.q}</h3>
              <p className="text-sm md:text-base text-white/55 leading-relaxed mt-1.5">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-xl font-bold">Questions? Talk to a human.</h2>
          <p className="text-sm md:text-base text-white/55 leading-relaxed mt-2 max-w-3xl">
            Ideas, feedback, or a camera source we should add — email us at{" "}
            <a
              href="mailto:passiveincomewai@gmail.com"
              className="text-[#0096FF] hover:underline"
            >
              passiveincomewai@gmail.com
            </a>{" "}
            and we will get back to you. You can also reach us through the{" "}
            <Link href="/contact" className="text-[#0096FF] hover:underline">
              contact page
            </Link>{" "}
            or read more{" "}
            <Link href="/about" className="text-[#0096FF] hover:underline">
              about WorldEye
            </Link>
            .
          </p>
        </div>
      </div>
      <SiteFooter />
    </section>
  );
}
