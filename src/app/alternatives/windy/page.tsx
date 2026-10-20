import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  Satellite,
  CloudSun,
  Wind,
  Radar,
  Waves,
} from "lucide-react";
import {
  IntentShell,
  IntentBreadcrumbs,
  ReviewedStamp,
  HeroCtas,
  MidCta,
  webPageLd,
  itemListLd,
} from "@/components/SeoIntentLayout";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Windy Alternatives in 2026",
  description:
    "Looking for a Windy alternative? Compare free weather and live-world maps — WorldEye's 3D globe, Zoom Earth, Ventusky, NASA Worldview and more.",
  alternates: { canonical: "/alternatives/windy" },
  openGraph: {
    title: "Windy Alternatives in 2026 | WorldEye",
    description:
      "Free alternatives to Windy compared: WorldEye's live 3D globe, Zoom Earth, Ventusky, NASA Worldview, Earth Nullschool and more.",
    url: "/alternatives/windy",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Windy Alternatives in 2026 | WorldEye",
    description:
      "Free Windy alternatives compared — WorldEye's live 3D globe, Zoom Earth, Ventusky, NASA Worldview and more.",
  },
};

const OPTIONS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best free all-in-one alternative",
    href: "/compare/windy",
    body: "A free live 3D globe — no signup — with weather systems alongside live flights, satellites, earthquakes, wildfires and 74,229 public cameras on one screen. The pick when you want the weather in context, not on its own flat map.",
  },
  {
    icon: Satellite,
    name: "Zoom Earth",
    tag: "Best for live satellite imagery",
    href: "/compare/zoom-earth",
    body: "Near-real-time satellite views with storm and wildfire tracking on a fluid map. Beautiful and immediate for watching weather systems from orbit — but imagery-led, without the flight, camera or event layers.",
  },
  {
    icon: CloudSun,
    name: "Ventusky",
    tag: "Best for animated weather visualization",
    href: "/compare/ventusky",
    body: "Gorgeous animated weather maps — wind, temperature, precipitation and air quality worldwide, in a style close to Windy's own. If animated model weather is the main thing you want, it is superb; it does not cover flights, satellites or cameras.",
  },
  {
    icon: Radar,
    name: "NASA Worldview",
    tag: "Best for science-grade satellite data",
    href: "/compare/nasa-worldview",
    body: "NASA's own browser for daily global satellite imagery across hundreds of data layers. Authoritative and free; built for researchers, so the learning curve is steeper than a casual weather map.",
  },
  {
    icon: Wind,
    name: "Earth Nullschool",
    tag: "Best for global wind currents",
    href: "/weather-tracker",
    body: "A focused visualization of global weather conditions — animated wind, ocean currents and atmospheric data projected onto a globe. Elegant and educational for currents and circulation; deliberately narrow compared with a full weather platform.",
  },
  {
    icon: Waves,
    name: "RainViewer",
    tag: "Best for rain radar",
    href: "/weather-tracker",
    body: "A radar-focused service built around precipitation maps and rain tracking. Useful when the only question is where the rain is and where it is heading — a single-purpose tool rather than a general weather or world map.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "Windy Alternatives in 2026",
      "Free alternatives to Windy: WorldEye's live 3D globe, Zoom Earth, Ventusky, NASA Worldview, Earth Nullschool and more.",
      "/alternatives/windy"
    ),
    itemListLd(
      OPTIONS.map((o) => ({
        name: o.name,
        href: o.href,
        description: `${o.tag}. ${o.body}`,
      }))
    ),
  ],
};

export default function WindyAlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "Windy Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Wind className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          Windy alternatives that put weather <span className="text-[#0096FF]">in context.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          The best free Windy alternative for most people is WorldEye: a live
          3D globe streaming weather alongside flights, satellites,
          earthquakes, wildfires and 74,229 public cameras — no signup. If
          your need is purely forecast models and animated wind, a weather
          specialist below may fit better.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What Windy is */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What is Windy, exactly?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Windy is a weather-model visualization platform: it renders
            forecast data — wind, radar, rain, temperature, clouds, waves and
            many other layers — as animated maps you can step through in time.
            Pilots, sailors, surfers and weather enthusiasts use it because it
            makes model output readable at a glance, and it also carries a
            webcam layer alongside the forecast layers.
          </p>
          <p>
            Windy offers a Premium subscription on top of its free tier, which
            unlocks extras for heavier weather users. So the first question in
            choosing an alternative isn&apos;t &ldquo;which map looks
            best&rdquo; — it&apos;s &ldquo;do I need deep forecast models, or
            do I need live weather as one part of a bigger live picture?&rdquo;
          </p>
        </div>
      </section>

      {/* Free alternative */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Globe className="w-7 h-7 text-[#0096FF] shrink-0" />
          Is there a free alternative to Windy?
        </h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            Yes. WorldEye&apos;s entire map is free with no account: a 3D globe
            carrying weather systems, live aircraft positions, satellite
            tracks, earthquake and wildfire activity, and roughly 74,229
            publicly accessible cameras. That breadth is the point — most free
            weather maps cover the forecast well, while WorldEye puts live
            weather on the same spinning globe as everything it affects.
          </p>
          <p>
            The Pro tier (weekly $7.99, monthly $13.99, annual $74.99) adds
            intelligence tooling — the OSINT toolkit, maritime and cyber/GDELT
            intel feeds, satellite imagery view, advanced search filters and the AI
            analyst — but it never gates the live map. Zoom Earth, NASA
            Worldview, Ventusky and Earth Nullschool are also free for their
            specialties.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Six Windy alternatives, <span className="text-[#0096FF]">compared</span>
        </h2>
        <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
          Each one&apos;s honest best-fit is noted — the right alternative is
          the one that matches what you actually watch.
        </p>
        <div className="mt-10 grid gap-5 max-w-4xl mx-auto">
          {OPTIONS.map((o, i) => (
            <div
              key={o.name}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-8 hover:border-[#0096FF]/40 transition"
            >
              <div className="flex items-start gap-5">
                <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#0096FF]/10 border border-[#0096FF]/25 text-sm font-bold text-[#0096FF] shrink-0">
                  {i + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold">{o.name}</h3>
                    <span className="text-xs font-semibold text-[#0096FF] bg-[#0096FF]/10 border border-[#0096FF]/25 rounded-full px-3 py-1">
                      {o.tag}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed mt-3">{o.body}</p>
                  <Link
                    href={o.href}
                    className="inline-flex items-center gap-1.5 text-sm text-[#0096FF] hover:underline mt-4 font-medium"
                  >
                    Compare {o.name} vs WorldEye
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <MidCta
        heading="One globe. Every live layer. Free."
        body="Weather, flights, satellites, quakes, fires and cameras — streaming on a 3D globe with no signup. See the storm and everything around it."
      />

      {/* Why context */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Why weather reads better with context</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            A forecast map answers one question: what is the model predicting?
            A live globe answers a richer one: what is happening right now, and
            what is it affecting? On WorldEye you can watch a storm system on
            the weather layer while aircraft route around it, wildfires show on
            the fire layer, and public cameras show conditions on the ground —
            all in one frame.
          </p>
          <p>
            That does not replace a forecast model when you are planning around
            the weather. It complements it: models for what comes next, a live
            globe for what is already here. Many Windy users keep both — the
            specialist for the deep forecast dive, and the globe for the live
            picture around it.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: CloudSun, label: "Weather tracker", href: "/weather-tracker" },
              { icon: Satellite, label: "Satellite tracking", href: "/satellite-tracker" },
              { icon: Globe, label: "All features", href: "/features" },
            ].map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 hover:border-[#0096FF]/40 transition"
              >
                <c.icon className="w-4 h-4 text-[#0096FF]" /> {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Honest limits */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">When Windy or a weather specialist wins</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Honestly: if your work depends on forecast models — comparing
            model runs, stepping animated wind and precipitation forward in
            time, or reading detailed forecast layers for sailing, flying or
            surfing — Windy and Ventusky go deeper than WorldEye. That depth
            is their whole product, and WorldEye does not try to replicate it.
          </p>
          <p>
            WorldEye&apos;s bet is different: most people checking the weather
            also want to see the world it is happening to. Use the specialist
            for the forecast, and the globe for everything live around it.
          </p>
        </div>
      </section>

      {/* How to choose */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">How to choose your Windy alternative</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              q: "Forecast or live picture?",
              a: "Planning around future weather calls for a model specialist like Windy or Ventusky. Watching live conditions in context calls for a globe.",
            },
            {
              q: "Weather only, or everything?",
              a: "Single-topic watchers may prefer a weather-only map. If you also follow flights, quakes, fires or cameras, one globe beats five tabs.",
            },
            {
              q: "Free or Premium?",
              a: "Casual checking is fully served by free tiers. Heavy forecast users should compare what each Premium or Pro tier actually adds before paying.",
            },
          ].map((c) => (
            <div key={c.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="font-semibold text-white/90 mb-2">{c.q}</p>
              <p className="text-sm text-white/50 leading-relaxed">{c.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Windy alternative questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is WorldEye a forecast tool like Windy?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No — and it does not pretend to be. WorldEye is a live monitoring
              globe: weather systems as they are now, alongside flights,
              satellites, earthquakes, wildfires and cameras. For detailed
              forecast-model work, a specialist like Windy or Ventusky is the
              stronger tool.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Do I need an account to use WorldEye&apos;s weather layer?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No. The map — globe, weather, flights, satellites, earthquakes,
              wildfires, cameras — is free with no signup. Accounts exist only
              for Pro subscribers and affiliates, never as a gate in front of
              the map.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">What does WorldEye Pro cost?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Weekly $7.99, monthly $13.99, or annual $74.99. Pro adds the
              OSINT toolkit, maritime intel, cyber/GDELT intel, satellite
              imagery view, advanced search filters and the AI analyst. The free map
              stays free regardless.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          The weather, live, <span className="text-[#0096FF]">on one globe.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Open the globe and watch the world move — free, no signup, nothing to install.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-2xl bg-[#0096FF] text-white font-bold hover:bg-[#0077d6] transition"
          >
            Explore WorldEye
          </Link>
          <Link
            href="/pricing"
            className="inline-block px-8 py-4 rounded-2xl border border-white/15 text-white/85 font-semibold hover:border-[#0096FF]/50 hover:bg-white/5 transition"
          >
            Unlock WorldEye PRO
          </Link>
        </div>
        <p className="mt-6 text-sm text-white/40">
          Prefer the head-to-head?{" "}
          <Link href="/compare/windy" className="text-[#0096FF] hover:underline">
            WorldEye vs Windy
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "WorldEye vs Windy",
            desc: "The detailed head-to-head comparison on the compare hub.",
            href: "/compare/windy",
          },
          {
            label: "Weather tracker",
            desc: "Live weather systems on a 3D globe, with the world around them.",
            href: "/weather-tracker",
          },
          {
            label: "Features",
            desc: "Everything the globe can do — free layers and Pro intelligence tools.",
            href: "/features",
          },
          {
            label: "Pricing",
            desc: "Weekly $7.99, monthly $13.99, annual $74.99 — the map itself stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
