import type { Metadata } from "next";
import Link from "next/link";
import {
  MonitorSmartphone,
  Globe,
  Satellite,
  CloudSun,
  Camera,
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
  title: "World Monitor Alternatives in 2026",
  description:
    "Looking for a World Monitor alternative? Compare free live-world dashboards — WorldEye's 3D globe, Zoom Earth, NASA Worldview and more.",
  alternates: { canonical: "/alternatives/world-monitor" },
  openGraph: {
    title: "World Monitor Alternatives in 2026 | WorldEye",
    description:
      "Free alternatives to world-monitor dashboards: WorldEye's live 3D globe, Zoom Earth, NASA Worldview, Ventusky and more.",
    url: "/alternatives/world-monitor",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "World Monitor Alternatives in 2026 | WorldEye",
    description:
      "Free World Monitor alternatives compared — WorldEye's live 3D globe, Zoom Earth, NASA Worldview and more.",
  },
};

const OPTIONS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best free all-in-one monitor",
    href: "/compare/world-monitor",
    body: "A free live 3D globe — no signup — fusing flights, satellites, ships, weather, earthquakes, wildfires and ~36,000 public cameras on one screen. The closest thing to a single 'monitor the planet' view that costs nothing.",
  },
  {
    icon: Radar,
    name: "World Monitor (the original)",
    tag: "Best for geopolitical depth",
    href: "/compare/world-monitor",
    body: "The product itself: Elie Habib's free, open-source (AGPL-3.0) dashboard at worldmonitor.app — 58 map layer types, 500+ feeds, ACLED and UCDP conflict data, live tracking of 13 strategic chokepoints, market data and AI country briefs, in six specialized variants. Pro ($39.99/month) adds an AI analyst, digests and API access. What it doesn't have: a live public-camera network — it's panels and data, not a camera globe.",
  },
  {
    icon: Satellite,
    name: "Zoom Earth",
    tag: "Best for live satellite imagery",
    href: "/compare/zoom-earth",
    body: "Near-real-time satellite views with storm and wildfire tracking on a fluid map. Beautiful and immediate for weather and terrain — but imagery only, without the flight, camera or intel layers.",
  },
  {
    icon: Radar,
    name: "NASA Worldview",
    tag: "Best for science-grade satellite data",
    href: "/compare/nasa-worldview",
    body: "NASA's own browser for daily global satellite imagery across hundreds of data layers. Authoritative and free; built for researchers, so the learning curve is steeper than a casual monitor.",
  },
  {
    icon: CloudSun,
    name: "Ventusky",
    tag: "Best for weather visualization",
    href: "/compare/ventusky",
    body: "Gorgeous animated weather maps — wind, temperature, precipitation and air quality worldwide. If weather is the main thing you monitor, it's superb; it doesn't cover flights, ships or cameras.",
  },
  {
    icon: MonitorSmartphone,
    name: "Liveuamap",
    tag: "Best for conflict news monitoring",
    href: "/compare/liveuamap",
    body: "Live conflict and crisis news pinned to a world map. The specialist pick when the events you monitor are conflicts — narrow by design, which is also its limit.",
  },
  {
    icon: Waves,
    name: "Sentinel Hub / Copernicus Browser",
    tag: "Best for free Earth-observation imagery",
    href: "/compare/sentinel-hub",
    body: "Free access to Copernicus Sentinel satellite imagery through ESA's browser tools. Excellent for recent high-quality imagery; an analyst's tool rather than an always-on live monitor.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "World Monitor Alternatives in 2026",
      "Free alternatives to world-monitor dashboards: WorldEye's live 3D globe, Zoom Earth, NASA Worldview, Ventusky and more.",
      "/alternatives/world-monitor"
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

export default function WorldMonitorAlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "World Monitor Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <MonitorSmartphone className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          World Monitor alternatives that watch <span className="text-[#0096FF]">the whole planet.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          The best free World Monitor alternative is WorldEye: a live 3D globe
          streaming flights, satellites, ships, weather, earthquakes, wildfires
          and ~36,000 public cameras — no signup, no paywall on the map. If
          your monitoring is mostly one thing (weather, conflicts, satellite
          imagery), a specialist below may fit better.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What a world monitor is */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What is a world monitor, exactly?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            &ldquo;World monitor&rdquo; describes a category more than a single
            product: dashboards and maps that stream live global events onto one
            screen — conflicts, disasters, weather, sometimes flights or
            shipping — so you can watch the planet without hunting across a
            dozen tabs. People usually land on them for one of three reasons:
            professional situational awareness, open-source research, or plain
            curiosity about what&apos;s happening right now.
          </p>
          <p>
            The name usually points at one product:{" "}
            <span className="text-white/85 font-semibold">World Monitor
            (worldmonitor.app)</span>, a free hosted dashboard by Elie Habib,
            open source under AGPL-3.0. It&apos;s genuinely good at its job —
            58 map layer types fed by hundreds of sources, ACLED and UCDP
            conflict data, live chokepoint tracking, market data and
            AI-written country briefs, with a Pro tier ($39.99/month) adding
            an AI analyst, scheduled digests and API access. Most people
            searching for an alternative aren&apos;t unhappy with its data —
            they want a different shape: a globe instead of panels, cameras
            instead of only feeds, or a cheaper Pro tier.
          </p>
          <p>
            The other catch with most monitors is specialization. A conflict
            monitor won&apos;t show you the storm over the conflict zone. A
            weather monitor won&apos;t show the ships in the harbor. So the
            first question in choosing an alternative isn&apos;t &ldquo;which
            is best&rdquo; — it&apos;s &ldquo;how many layers do I need on one
            screen?&rdquo;
          </p>
        </div>
      </section>

      {/* Free alternative */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Globe className="w-7 h-7 text-[#0096FF] shrink-0" />
          Is there a free alternative to World Monitor dashboards?
        </h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            Yes. WorldEye&apos;s entire map is free with no account: a 3D globe
            carrying live aircraft positions, satellite tracks, ship locations,
            weather systems, earthquake and wildfire activity, and roughly
            36,000 publicly accessible cameras. That breadth is the point —
            most free monitors cover one data type well, while WorldEye puts
            all of them on the same spinning globe.
          </p>
          <p>
            The Pro tier (weekly $3.99, monthly $9.99, annual $59.99) adds
            intelligence tooling — the AI analyst assistant, OSINT toolkit,
            premium intel feeds, high-res satellite imagery, and global search
            — but it never gates the live map. Zoom Earth, NASA Worldview and
            Ventusky are also free for their specialties.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          World Monitor and its alternatives, <span className="text-[#0096FF]">compared</span>
        </h2>
        <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
          Each one&apos;s honest best-fit is noted — the right monitor is the
          one that matches what you actually watch.
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
        body="Flights, satellites, ships, weather, quakes, fires and cameras — streaming on a 3D globe with no signup. See what a real world monitor feels like."
      />

      {/* Why a globe */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Why a globe beats a dashboard</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Flat dashboards are built for one dataset. A globe is built for
            context — and context is what turns data into understanding. On
            WorldEye you can watch a typhoon spin up in the Pacific while
            container ships reroute around it and aircraft thread the edges of
            the storm, all in one frame. No dashboard with separate tabs for
            weather, shipping and aviation gives you that picture, because the
            picture only exists when the layers share a screen.
          </p>
          <p>
            The 3D view also changes scale perception: ocean crossings, the
            day-night terminator sweeping across continents, satellite
            constellations arcing overhead — these are spatial stories, and
            they read instantly on a globe in a way they never do in a list.
            For situational awareness, that immediacy matters.
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
        <h2 className="text-2xl md:text-3xl font-bold">When a specialist monitor wins</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Breadth has a trade-off, and it&apos;s worth stating plainly. If
            you need publication-grade satellite analysis, NASA Worldview and
            the Copernicus Browser give you deeper data access than a live
            globe. If your whole job is forecasting, Ventusky&apos;s weather
            models go further. If it&apos;s conflict news, a curated news map
            reads faster.
          </p>
          <p>
            WorldEye&apos;s bet is different: most people don&apos;t monitor one
            thing — they monitor the world, and the world doesn&apos;t come in
            separate tabs. Use the specialist for the deep dive, and the globe
            for everything around it.
          </p>
        </div>
      </section>

      {/* How to choose */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">How to choose your monitor</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              q: "One topic or everything?",
              a: "Single-topic watchers (storms, conflicts, quakes) may prefer a specialist. Multi-topic watchers get more from one globe with all layers.",
            },
            {
              q: "Casual or professional?",
              a: "Casual monitoring is fully served by free tiers. Professionals needing alerts, feeds and analysis tools should look at Pro tiers or enterprise platforms.",
            },
            {
              q: "Data or picture?",
              a: "Researchers who query datasets want GDELT or NASA Worldview. People who need to see and understand fast want a visual monitor like WorldEye.",
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
        <h2 className="text-2xl md:text-3xl font-bold">World Monitor questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Do I need an account to monitor the world on WorldEye?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No. The map — globe, flights, satellites, ships, weather,
              earthquakes, wildfires, cameras — is free with no signup. Accounts
              exist only for Pro subscribers and affiliates, never as a gate in
              front of the map.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Can WorldEye send me alerts like a professional monitor?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              WorldEye is a visual monitoring platform, not an enterprise
              alerting system. Pro adds premium intel feeds and the AI analyst
              assistant for deeper monitoring workflows; organizations needing
              automated vetted alerting typically pair a visual tool with a
              dedicated risk-intelligence service.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">How much does World Monitor cost?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              The dashboard itself is free — no signup, no trial clock.
              World Monitor Pro is $39.99/month ($359.99/year) and adds the WM
              Analyst AI chat, scenario engine, scheduled digests, alerts and
              MCP/API access, with higher API tiers above that. WorldEye&apos;s
              map is also free; its Pro tier is $3.99/week, $9.99/month or
              $59.99/year.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">What does WorldEye Pro cost?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Weekly $3.99, monthly $9.99, or annual $59.99. Pro adds the AI
              analyst assistant, OSINT toolkit, premium intel feeds,
              high-resolution satellite imagery, and global search with advanced
              filters. The free map stays free regardless.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          The planet, live, <span className="text-[#0096FF]">on one screen.</span>
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
          <Link href="/compare/world-monitor" className="text-[#0096FF] hover:underline">
            WorldEye vs World Monitor
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "WorldEye vs World Monitor",
            desc: "The detailed head-to-head comparison on the compare hub.",
            href: "/compare/world-monitor",
          },
          {
            label: "Best global intelligence dashboards",
            desc: "Ranked dashboards for planet-scale situational awareness.",
            href: "/best-global-intelligence-dashboards",
          },
          {
            label: "Features",
            desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
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
