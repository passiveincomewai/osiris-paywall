import type { Metadata } from "next";
import Link from "next/link";
import {
  Plane,
  Globe,
  Satellite,
  Camera,
  Radio,
  Radar,
  CloudSun,
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
  title: "Free Flightradar24 Alternatives in 2026",
  description:
    "The best free Flightradar24 alternatives compared: WorldEye's 3D globe, ADS-B Exchange, airplanes.live and more — no signup needed.",
  alternates: { canonical: "/alternatives/flightradar24" },
  openGraph: {
    title: "Free Flightradar24 Alternatives in 2026 | WorldEye",
    description:
      "Free flight-tracking alternatives compared — WorldEye's 3D globe with flights, cameras and satellites, plus ADS-B Exchange and airplanes.live.",
    url: "/alternatives/flightradar24",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Free Flightradar24 Alternatives in 2026 | WorldEye",
    description:
      "Free Flightradar24 alternatives compared: WorldEye's 3D globe, ADS-B Exchange, airplanes.live and more.",
  },
};

const OPTIONS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best free all-in-one alternative",
    href: "/compare/flightradar24",
    body: "Live flight tracking on a free 3D globe — no signup — with the world attached: satellites overhead, weather systems, ~76,000 ground cameras, ships and quakes on the same screen. Best when you want flights plus everything around them.",
  },
  {
    icon: Radio,
    name: "ADS-B Exchange",
    tag: "Best unfiltered community data",
    href: "/compare/adsb-exchange",
    body: "Community-run, unfiltered ADS-B aggregation — the enthusiast's choice for seeing aircraft that other trackers filter out, including many military and government flights. Raw and powerful; the interface is utilitarian.",
  },
  {
    icon: Radar,
    name: "airplanes.live",
    tag: "Best open-source tracker",
    href: "/compare/airplanes-live",
    body: "A free, open-source flight tracker built on community feeders. Clean, fast, and transparent about its data — a strong pick if you value open infrastructure over polished apps.",
  },
  {
    icon: Plane,
    name: "FlightAware",
    tag: "Best for airport and airline operations",
    href: "/live-flight-tracker",
    body: "Long-running tracker with deep airport pages, airline fleet data and delay statistics. Strong on the operational side of aviation; its free tier is more limited than the community trackers above.",
  },
  {
    icon: Satellite,
    name: "OpenSky Network",
    tag: "Best for researchers and developers",
    href: "/live-flight-tracker",
    body: "A research-driven ADS-B network with a free API and historical data for academics. Excellent if you build or study; not designed as a consumer tracking experience.",
  },
  {
    icon: CloudSun,
    name: "Plane Finder",
    tag: "Solid mobile-first alternative",
    href: "/live-flight-tracker",
    body: "A long-standing tracker with polished mobile apps and 3D views. Worth a look if you primarily track from your phone — though its best features sit behind paid tiers.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "Free Flightradar24 Alternatives in 2026",
      "The best free Flightradar24 alternatives compared: WorldEye's 3D globe, ADS-B Exchange, airplanes.live and more.",
      "/alternatives/flightradar24"
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

export default function Flightradar24AlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "Flightradar24 Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Plane className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          Free Flightradar24 alternatives <span className="text-[#0096FF]">worth your time.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          The best free Flightradar24 alternative is WorldEye: live aircraft on
          a 3D globe with no signup — plus satellites, weather, ships and
          ~76,000 ground cameras sharing the same view. If you only need raw
          flight data, the community trackers below are excellent. Here&apos;s
          the honest breakdown.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* The honest framing */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Why look beyond Flightradar24?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Flightradar24 earned its reputation — deep coverage, flight
            history, and a polished interface make it the default tracker for
            millions. Nobody needs to tear it down. People look for
            alternatives for practical reasons: paywalled features, required
            accounts, filtered aircraft data, or simply wanting the sky in a
            bigger context than a flat map of planes.
          </p>
          <p>
            Here&apos;s the useful split. Almost every tracker draws on the
            same underlying public ADS-B ecosystem, so in most regions coverage
            is comparable — the differences are presentation, filtering policy,
            price, and what else is on screen. Choose on those, not on a
            promise of &ldquo;more planes.&rdquo;
          </p>
        </div>
      </section>

      {/* Free alternative */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Plane className="w-7 h-7 text-[#0096FF] shrink-0" />
          Is there a free alternative to Flightradar24?
        </h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            Yes — and WorldEye is the only one that puts flights on a live 3D
            globe with the rest of the planet attached. The flight layer is
            free forever with no signup: watch aircraft arc across oceans, see
            the day-night line sweep beneath them, then zoom to the destination
            and open a nearby public camera to see the actual sky. ADS-B
            Exchange and airplanes.live are also free and excellent if you want
            a traditional flat-map tracker.
          </p>
          <p>
            A note on honesty: for deep flight-number history, schedules, and
            fleet databases, dedicated aviation-data services remain the
            specialists. WorldEye&apos;s strength is the live picture — the sky
            right now, in the context of the world right now.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Six free Flightradar24 alternatives, <span className="text-[#0096FF]">compared</span>
        </h2>
        <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
          Every option here has a genuine free tier — with each one&apos;s real
          strength called out.
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
        heading="Watch the sky on a globe — free, no signup"
        body="Live aircraft on a spinning 3D Earth, with satellites, weather and cameras alongside. Open it and decide in thirty seconds."
      />

      {/* What a globe adds */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What flight tracking looks like on a globe</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            On a flat tracker, a transatlantic flight is a line on a rectangle.
            On WorldEye, it&apos;s an aircraft arcing over the curve of the
            Earth, threading around the weather system you can also see
            forming, while the destination airport&apos;s nearby cameras show
            the actual conditions on the ground. Same data, completely
            different understanding.
          </p>
          <p>
            That context compounds: military watchers can correlate aircraft
            with satellite passes overhead; storm chasers watch planes route
            around cells in real time; the curious can simply spin the planet
            and see where the sky is busiest right now. It&apos;s flight
            tracking with the planet attached — and the whole thing runs in
            the browser with nothing to install.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: Plane, label: "Live flight tracker", href: "/live-flight-tracker" },
              { icon: Satellite, label: "Satellite tracking", href: "/satellite-tracker" },
              { icon: Camera, label: "~76,000 public cameras", href: "/cameras" },
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

      {/* Unfiltered data note */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">A note on unfiltered flight data</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            One genuine difference between trackers is filtering policy. Most
            commercial trackers filter certain aircraft — military, government,
            and private owners who request it. ADS-B Exchange built its
            reputation on not filtering: if it broadcasts, it shows. That
            makes it the enthusiast and researcher favorite, and it&apos;s a
            legitimate reason to keep it bookmarked alongside any other
            tracker.
          </p>
          <p>
            WorldEye takes the opposite approach to differentiation: rather
            than competing on who shows the most filtered dots, it competes on
            what surrounds the dots. Both philosophies are valid — they just
            answer different curiosities.
          </p>
        </div>
      </section>

      {/* How to choose */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Which flight tracker should you use?</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              q: "Just want to watch planes free?",
              a: "WorldEye for the globe experience, airplanes.live for a clean flat map — both free, both need no account.",
            },
            {
              q: "Tracking military or blocked aircraft?",
              a: "ADS-B Exchange. Its unfiltered community data is the reason it exists, and nothing commercial matches it.",
            },
            {
              q: "Need history and schedules?",
              a: "FlightAware and Flightradar24's paid tiers. Free trackers are built for the live picture, not the archive.",
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
        <h2 className="text-2xl md:text-3xl font-bold">Flight tracker questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is WorldEye really free for flight tracking?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Yes. Live flight positions are part of the free map — no account,
              no signup, no credit card. Pro subscriptions fund the
              infrastructure and add intelligence tools; they never gate the
              flight layer.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Where does the flight data come from?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Like nearly every tracker, WorldEye draws on the public ADS-B
              ecosystem — aircraft broadcasting their positions on open radio
              frequencies, picked up by networks of receivers. Learn more on
              our{" "}
              <Link href="/what-is-ads-b" className="text-[#0096FF] hover:underline">
                what is ADS-B
              </Link>{" "}
              explainer.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Can I track a specific flight number?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              You can watch live aircraft on the globe as they broadcast. For
              deep per-flight-number history and schedules, the specialist
              aviation-data services are the right tools; WorldEye&apos;s
              strength is the live sky in planetary context.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          See the sky <span className="text-[#0096FF]">differently.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          One click, no signup. The globe is already spinning.
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
          Want the head-to-head?{" "}
          <Link href="/compare/flightradar24" className="text-[#0096FF] hover:underline">
            WorldEye vs Flightradar24
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "WorldEye vs Flightradar24",
            desc: "The detailed head-to-head comparison on the compare hub.",
            href: "/compare/flightradar24",
          },
          {
            label: "Best flight tracking tools",
            desc: "The full ranked guide to watching the skies in 2026.",
            href: "/best-flight-tracking-tools",
          },
          {
            label: "What is ADS-B?",
            desc: "The open radio technology behind every flight tracker, explained.",
            href: "/what-is-ads-b",
          },
          {
            label: "Pricing",
            desc: "Weekly $3.99, monthly $9.99, annual $59.99 — the flight layer stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
