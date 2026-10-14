import Link from "next/link";
import { CloudLightning, Newspaper, Plane, Radar, Sparkles, Video } from "lucide-react";
import { HOME_FAQS } from "@/lib/home-faqs";
import GlobeHomeLink from "./GlobeHomeLink";
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
// cover the app. The first block is the hero-exit strip — the moment the
// cinematic finishes, the H1 and the calls to action are the first thing
// the visitor meets. "Explore the live globe" scrolls back up into the app
// (GlobeHomeLink); it is not a navigation.
export default function HomeSeoShell() {
  return (
    <section aria-label="About WorldEye" className="home-seo-shell relative bg-[#06060C] text-white">
      {/* ── Hero-exit strip: H1 + CTAs, immediately below the cinematic ── */}
      <div className="border-t border-[#D4AF37]/25 bg-gradient-to-b from-[#0096FF]/[0.07] to-transparent">
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-2">
          <p className="text-[11px] font-bold tracking-[0.25em] text-[#D4AF37] mb-4">
            WORLDEYE — LIVE PLANETARY INTELLIGENCE
          </p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            WorldEye — the world, live on one globe
          </h1>
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
          <p className="mt-6 text-base md:text-lg text-white/65 leading-relaxed max-w-3xl">
            WorldEye is a live 3D globe that shows you the planet as it is right
            now — not yesterday, not a recording. Watch 36,000+ public cameras,
            follow flights and satellites in real time, and keep an eye on
            weather, earthquakes and wildfires, all on one map. It is free, it
            runs in your browser, and there is nothing to install.
          </p>

          {/* ── Stats band ── */}
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              ["36,000+", "live public cameras"],
              ["11", "live layers on by default"],
              ["24/7", "real-time global coverage"],
              ["$0", "to explore the globe"],
            ].map(([stat, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 flex flex-col">
                <dt className="order-2 text-xs text-white/50 mt-1">{label}</dt>
                <dd className="order-1 text-2xl md:text-3xl font-bold text-white">{stat}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-4 pb-4">
        <h2 className="text-2xl font-bold mt-12 mb-4">What is WorldEye?</h2>
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

        {/* ── Imagery: a real frame from the cinematic intro ── */}
        <figure className="mt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/worldeye-cinematic-poster.jpg"
            alt="The WorldEye eye over a live view of Earth from orbit"
            width={1920}
            height={1080}
            loading="lazy"
            className="w-full h-auto rounded-2xl border border-white/10"
          />
          <figcaption className="text-xs text-white/40 mt-2.5">
            WorldEye opens on the living planet — every feed on the globe is live.
          </figcaption>
        </figure>

        <h2 className="text-2xl font-bold mt-14 mb-4">Everything live, on one globe</h2>
        <p className="text-white/60 leading-relaxed max-w-3xl">
          Every layer is live, and every layer is in one place:
        </p>
        <div className="grid md:grid-cols-3 gap-5 mt-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <Video className="w-6 h-6 text-[#0096FF]" aria-hidden />
            <h3 className="font-semibold text-white mt-3">36,000+ live cameras</h3>
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
            <Plane className="w-6 h-6 text-[#0096FF]" aria-hidden />
            <h3 className="font-semibold text-white mt-3">Flights and satellites</h3>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              Aircraft tracked in real time from ADS-B broadcasts, plus
              satellites and the International Space Station on their live
              orbits.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <CloudLightning className="w-6 h-6 text-[#0096FF]" aria-hidden />
            <h3 className="font-semibold text-white mt-3">Weather and hazards</h3>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              Live weather radar, earthquakes as they are reported, and
              wildfires detected from satellite data — so you see events as
              they unfold, not after.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <Newspaper className="w-6 h-6 text-[#0096FF]" aria-hidden />
            <h3 className="font-semibold text-white mt-3">Live news and incidents</h3>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              Breaking reports and global incidents plotted where they happen,
              as they are published — the story and the place, on the same
              screen.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <Radar className="w-6 h-6 text-[#D4AF37]" aria-hidden />
            <h3 className="font-semibold text-white mt-3">
              OSINT toolkit{" "}
              <span className="ml-1 align-middle text-[10px] font-bold tracking-widest text-[#D4AF37] border border-[#D4AF37]/40 rounded px-1.5 py-0.5">PRO</span>
            </h3>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              Cyber threats, maritime tracking and premium intelligence feeds
              layered over the globe for deeper investigations.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <Sparkles className="w-6 h-6 text-[#D4AF37]" aria-hidden />
            <h3 className="font-semibold text-white mt-3">
              OI, the AI analyst{" "}
              <span className="ml-1 align-middle text-[10px] font-bold tracking-widest text-[#D4AF37] border border-[#D4AF37]/40 rounded px-1.5 py-0.5">PRO</span>
            </h3>
            <p className="text-sm text-white/55 leading-relaxed mt-2">
              Ask questions about what you are seeing and get answers grounded
              in the live data on the globe.
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
          questions about what you are seeing — powered by WorldEye's built-in
          AI, with nothing to set up. Compare the plans on the{" "}
          <Link href="/pricing" className="text-[#0096FF] hover:underline">
            pricing page
          </Link>{" "}
          or read the full{" "}
          <Link href="/features" className="text-[#0096FF] hover:underline">
            feature list
          </Link>
          .
        </p>

        {/* ── Imagery: the product card ── */}
        <figure className="mt-10 max-w-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/og-image.png"
            alt="WorldEye — the world, live on one globe"
            width={1200}
            height={630}
            loading="lazy"
            className="w-full h-auto rounded-2xl border border-white/10"
          />
        </figure>

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
