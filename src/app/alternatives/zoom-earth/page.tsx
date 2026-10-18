import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  Satellite,
  CloudSun,
  Wind,
  Radar,
  Camera,
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
  title: "Zoom Earth Alternatives in 2026",
  description:
    "Looking for a Zoom Earth alternative? Compare free live satellite and world maps — WorldEye's 3D globe, Windy, Ventusky, NASA Worldview and more.",
  alternates: { canonical: "/alternatives/zoom-earth" },
  openGraph: {
    title: "Zoom Earth Alternatives in 2026 | WorldEye",
    description:
      "Free alternatives to Zoom Earth compared: WorldEye's live 3D globe, Windy, Ventusky, NASA Worldview, Sentinel Hub and more.",
    url: "/alternatives/zoom-earth",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Zoom Earth Alternatives in 2026 | WorldEye",
    description:
      "Free Zoom Earth alternatives compared — WorldEye's live 3D globe, Windy, NASA Worldview and more.",
  },
};

const OPTIONS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best free all-in-one alternative",
    href: "/compare/zoom-earth",
    body: "A free live 3D globe — no signup — fusing live flights, satellites, weather, earthquakes, wildfires and ~36,000 public cameras on one screen. The pick when you want the satellite-style view plus everything happening underneath it.",
  },
  {
    icon: Wind,
    name: "Windy",
    tag: "Best for weather-model maps",
    href: "/compare/windy",
    body: "Weather-model visualization at depth — wind, radar, forecast layers and a webcam layer, with a Premium subscription for heavier use. Superb for forecast work; a weather platform rather than a general live-world globe.",
  },
  {
    icon: CloudSun,
    name: "Ventusky",
    tag: "Best for animated weather visualization",
    href: "/compare/ventusky",
    body: "Gorgeous animated weather maps — wind, temperature, precipitation and air quality worldwide. If animated weather is the main thing you watch, it's superb; it doesn't cover flights, satellites or cameras.",
  },
  {
    icon: Radar,
    name: "NASA Worldview",
    tag: "Best for science-grade satellite data",
    href: "/compare/nasa-worldview",
    body: "NASA's own browser for daily global satellite imagery across hundreds of data layers. Authoritative and free; built for researchers, so the learning curve is steeper than a casual live map.",
  },
  {
    icon: Satellite,
    name: "Sentinel Hub / Copernicus Browser",
    tag: "Best for free Earth-observation imagery",
    href: "/compare/sentinel-hub",
    body: "Free access to Copernicus Sentinel satellite imagery through ESA's browser tools. Excellent for recent high-quality imagery and analysis; an analyst's tool rather than an always-on live globe.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "Zoom Earth Alternatives in 2026",
      "Free alternatives to Zoom Earth: WorldEye's live 3D globe, Windy, Ventusky, NASA Worldview, Sentinel Hub and more.",
      "/alternatives/zoom-earth"
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

export default function ZoomEarthAlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "Zoom Earth Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Satellite className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          Zoom Earth alternatives that go <span className="text-[#0096FF]">beyond the imagery.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          The best free Zoom Earth alternative is WorldEye: a live 3D globe
          streaming flights, satellites, weather, earthquakes, wildfires and
          ~36,000 public cameras — no signup. If your watching is mostly
          satellite imagery or forecast models, a specialist below may fit
          better.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What Zoom Earth is */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What is Zoom Earth, exactly?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Zoom Earth is a live satellite-imagery map: near-real-time views
            from orbit with weather, storm and wildfire tracking layered over
            a fluid, zoomable Earth. It made its name on immediacy — watching
            a hurricane or a fire from space, updated frequently, in a
            browser, for free.
          </p>
          <p>
            Its focus is also its boundary. Zoom Earth shows you the planet
            from above; it does not put aircraft, ships, ground cameras or
            event intelligence on the same screen. So the first question in
            choosing an alternative is &ldquo;is the view from orbit enough,
            or do I want the live world underneath it too?&rdquo;
          </p>
        </div>
      </section>

      {/* Free alternative */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Globe className="w-7 h-7 text-[#0096FF] shrink-0" />
          Is there a free alternative to Zoom Earth?
        </h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            Yes. WorldEye&apos;s entire map is free with no account: a 3D globe
            carrying live aircraft positions, satellite tracks, weather
            systems, earthquake and wildfire activity, and roughly 36,000
            publicly accessible cameras. Where Zoom Earth stops at the imagery,
            WorldEye keeps going down to street level — the storm from orbit
            and the camera inside it, on one screen.
          </p>
          <p>
            The Pro tier (weekly $3.99, monthly $9.99, annual $59.99) adds
            intelligence tooling — the OSINT toolkit, maritime and cyber/GDELT
            intel feeds, a dedicated satellite imagery view, global search and
            the AI analyst — but it never gates the live map. NASA Worldview
            and Ventusky are also free for their specialties.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Five Zoom Earth alternatives, <span className="text-[#0096FF]">compared</span>
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
        body="Flights, satellites, weather, quakes, fires and cameras — streaming on a 3D globe with no signup. From orbit to street level in one zoom."
      />

      {/* Why layers */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Why imagery is only the first layer</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Satellite imagery shows you the shape of an event. Live layers
            show you its consequences. On WorldEye you can watch a storm
            system on the weather layer while aircraft thread around it,
            satellites pass overhead, and public cameras show conditions where
            it makes landfall — the full stack, in one frame, without opening
            a second tool.
          </p>
          <p>
            The 3D globe also preserves the geometry that flat imagery maps
            flatten away: ocean crossings, the day-night terminator, orbital
            paths arcing over the poles. For understanding where things are in
            relation to each other, that spatial honesty matters.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: Satellite, label: "Satellite tracking", href: "/satellite-tracker" },
              { icon: Camera, label: "~36,000 public cameras", href: "/cameras" },
              { icon: CloudSun, label: "Weather tracker", href: "/weather-tracker" },
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
        <h2 className="text-2xl md:text-3xl font-bold">When Zoom Earth or a specialist wins</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Honestly: if your whole interest is the satellite picture itself —
            the freshest near-real-time imagery, storm imagery in particular —
            Zoom Earth is purpose-built for exactly that and does it
            beautifully. For publication-grade or scientific work, NASA
            Worldview and the Copernicus Browser go far deeper still, and for
            forecast models, Windy is the stronger tool.
          </p>
          <p>
            WorldEye&apos;s bet is different: most people don&apos;t watch one
            layer — they watch the world, and the world doesn&apos;t come in
            separate tabs. Use the specialist for the deep dive, and the globe
            for everything around it.
          </p>
        </div>
      </section>

      {/* How to choose */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">How to choose your Zoom Earth alternative</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              q: "Imagery or live world?",
              a: "Pure satellite viewing points to Zoom Earth or NASA Worldview. Imagery plus flights, cameras and events points to a multi-layer globe.",
            },
            {
              q: "Casual or analytical?",
              a: "Casual watching is fully served by free live maps. Analysts needing raw Earth-observation data should look at the Copernicus tools.",
            },
            {
              q: "Weather models too?",
              a: "If forecast-model depth matters as much as imagery, Windy or Ventusky earns a place alongside whichever live globe you choose.",
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
        <h2 className="text-2xl md:text-3xl font-bold">Zoom Earth alternative questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Does WorldEye show satellite imagery?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              The free globe tracks live satellite positions overhead, and Pro
              adds a dedicated satellite imagery view. For deep scientific
              imagery archives, NASA Worldview and the Copernicus Browser
              remain the specialist tools — this page says so plainly.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Do I need an account to use WorldEye?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No. The map — globe, flights, satellites, weather, earthquakes,
              wildfires, cameras — is free with no signup. Accounts exist only
              for Pro subscribers and affiliates, never as a gate in front of
              the map.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">What does WorldEye Pro cost?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Weekly $3.99, monthly $9.99, or annual $59.99. Pro adds the
              OSINT toolkit, maritime intel, cyber/GDELT intel, satellite
              imagery view, global search and the AI analyst. The free map
              stays free regardless.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          From orbit <span className="text-[#0096FF]">to street level.</span>
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
          <Link href="/compare/zoom-earth" className="text-[#0096FF] hover:underline">
            WorldEye vs Zoom Earth
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "WorldEye vs Zoom Earth",
            desc: "The detailed head-to-head comparison on the compare hub.",
            href: "/compare/zoom-earth",
          },
          {
            label: "Satellite tracker",
            desc: "Live satellite positions on a 3D globe, free with no signup.",
            href: "/satellite-tracker",
          },
          {
            label: "Features",
            desc: "Everything the globe can do — free layers and Pro intelligence tools.",
            href: "/features",
          },
          {
            label: "Pricing",
            desc: "Weekly $3.99, monthly $9.99, annual $59.99 — the map itself stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
