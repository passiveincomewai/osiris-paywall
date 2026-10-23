import type { Metadata } from "next";
import Link from "next/link";
import {
  Plane,
  Globe,
  Radio,
  Radar,
  Satellite,
  Building2,
  Smartphone,
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
  title: "Best Flight Tracking Tools in 2026",
  description:
    "The best flight tracking tools for 2026 compared: WorldEye's free 3D globe, Flightradar24, ADS-B Exchange, airplanes.live and more.",
  alternates: { canonical: "/best-flight-tracking-tools" },
  openGraph: {
    title: "Best Flight Tracking Tools in 2026 | WorldEye",
    description:
      "Compare the best flight trackers for 2026 — WorldEye's free 3D globe, Flightradar24, ADS-B Exchange, airplanes.live and more.",
    url: "/best-flight-tracking-tools",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Best Flight Tracking Tools in 2026 | WorldEye",
    description:
      "The best flight tracking tools for 2026 compared — free and paid picks.",
  },
};

const TOOLS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best free immersive tracker",
    href: "/compare/flightradar24",
    body: "Live flight tracking on a free 3D globe — no signup — with the planet attached: satellites overhead, weather systems, 74,229 ground cameras, ships and quakes on the same screen. The pick for watching the sky as part of the world, not as dots on a rectangle. The flight layer is free forever; Pro adds analyst tools, not more planes.",
  },
  {
    icon: Plane,
    name: "Flightradar24",
    tag: "Best-known all-rounder",
    href: "/compare/flightradar24",
    body: "The default tracker for millions: deep coverage, flight history, fleet data and a polished interface across web and apps. Earned its reputation honestly. The free tier is capable; the best features — history, advanced filters — sit behind paid plans.",
  },
  {
    icon: Radio,
    name: "ADS-B Exchange",
    tag: "Best unfiltered data",
    href: "/compare/adsb-exchange",
    body: "Community-run and deliberately unfiltered — shows military, government and otherwise-blocked aircraft that commercial trackers hide. The enthusiast and researcher favorite. Utilitarian interface, unmatched data philosophy.",
  },
  {
    icon: Radar,
    name: "airplanes.live",
    tag: "Best open-source tracker",
    href: "/compare/airplanes-live",
    body: "Free, open-source, community-fed flight tracking with a clean interface. Transparent about its data and infrastructure — the pick if you care about open systems as well as open skies.",
  },
  {
    icon: Building2,
    name: "FlightAware",
    tag: "Best for airport operations",
    href: "/live-flight-tracker",
    body: "Deep airport pages, airline operational data, delay statistics and fleet tracking. Strongest when your question is about the aviation system rather than a single aircraft — the operations analyst's tracker.",
  },
  {
    icon: Satellite,
    name: "OpenSky Network",
    tag: "Best for researchers and developers",
    href: "/live-flight-tracker",
    body: "Research-driven ADS-B network with free API access and historical data for academics and developers. Built for building on, not for casual browsing — but invaluable if you work with the data programmatically.",
  },
  {
    icon: Smartphone,
    name: "Plane Finder",
    tag: "Best mobile-first experience",
    href: "/live-flight-tracker",
    body: "Long-standing tracker with polished mobile apps and augmented-reality views. Worth a look if you track primarily from your phone — note its strongest features are in paid tiers.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "Best Flight Tracking Tools in 2026",
      "The best flight tracking tools for 2026 compared: WorldEye's free 3D globe, Flightradar24, ADS-B Exchange, airplanes.live and more.",
      "/best-flight-tracking-tools"
    ),
    itemListLd(
      TOOLS.map((t) => ({
        name: t.name,
        href: t.href,
        description: `${t.tag}. ${t.body}`,
      }))
    ),
  ],
};

export default function BestFlightTrackingToolsPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Best tools", href: "/compare" },
          { label: "Best Flight Tracking Tools" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Plane className="w-3.5 h-3.5" /> RANKED GUIDE
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          The best flight tracking tools <span className="text-[#0096FF]">for 2026.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Seven trackers compared on what actually differs between them —
          presentation, filtering, price, and context. WorldEye is our pick
          for free immersive tracking on a 3D globe; Flightradar24 remains the
          best-known all-rounder; ADS-B Exchange wins on unfiltered data.
          Here&apos;s how to choose.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What differs */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What actually differs between flight trackers?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Almost every tracker draws on the same public ADS-B ecosystem —
            aircraft broadcasting positions on open radio, received by ground
            networks. So in most regions, coverage is comparable, and
            &ldquo;which shows more planes&rdquo; is usually the wrong
            question. What differs: <strong className="text-white/85">filtering
            policy</strong> (some hide military and blocked aircraft, some
            don&apos;t), <strong className="text-white/85">presentation</strong>
            (flat map, 3D globe, AR), <strong className="text-white/85">history
            and data depth</strong>, <strong className="text-white/85">price</strong>,
            and <strong className="text-white/85">context</strong> — what else
            shares the screen with the aircraft.
          </p>
          <p>
            Rank accordingly: pick the tracker whose differences match your
            reason for tracking. The list below is organized by genuine
            best-fit, not by who spent most on marketing.
          </p>
        </div>
      </section>

      {/* Ranked list */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Seven trackers, <span className="text-[#0096FF]">ranked by best-fit</span>
        </h2>
        <div className="mt-10 grid gap-5 max-w-4xl mx-auto">
          {TOOLS.map((t, i) => (
            <article
              key={t.name}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-8 hover:border-[#0096FF]/40 transition"
            >
              <div className="flex items-start gap-5">
                <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#0096FF]/10 border border-[#0096FF]/25 text-sm font-bold text-[#0096FF] shrink-0">
                  {i + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold">{t.name}</h3>
                    <span className="text-xs font-semibold text-[#0096FF] bg-[#0096FF]/10 border border-[#0096FF]/25 rounded-full px-3 py-1">
                      {t.tag}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed mt-3">{t.body}</p>
                  <Link
                    href={t.href}
                    className="inline-flex items-center gap-1.5 text-sm text-[#0096FF] hover:underline mt-4 font-medium"
                  >
                    Compare {t.name} vs WorldEye
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MidCta
        heading="Watch the sky on a globe — free, no signup"
        body="Live aircraft on a spinning 3D Earth, with weather, satellites and cameras alongside. Open it and look up."
      />

      {/* ADS-B explainer */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">How does flight tracking actually work?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            The short version: most aircraft continuously broadcast their
            position, altitude, speed and identity on an open radio protocol
            called ADS-B. Networks of ground receivers — many run by
            volunteers — pick up those broadcasts and feed them to tracking
            services, which plot them on maps. No satellites required, no
            airline permission needed: it&apos;s public radio.
          </p>
          <p>
            That openness is why so many good trackers exist and why coverage
            is broadly similar. It&apos;s also why filtering policy matters:
            the data is public, but each service chooses what to display. Our{" "}
            <Link href="/what-is-ads-b" className="text-[#0096FF] hover:underline">
              ADS-B explainer
            </Link>{" "}
            goes deeper if you&apos;re curious.
          </p>
        </div>
      </section>

      {/* Use cases */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Which tracker for which job?</h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {[
            {
              q: "Watching planes for fun",
              a: "WorldEye's free globe — the 3D view with weather, satellites and cameras turns casual plane-spotting into exploring the planet. No account needed.",
            },
            {
              q: "Tracking military or blocked aircraft",
              a: "ADS-B Exchange, no contest. Its unfiltered community data shows what commercial trackers deliberately hide.",
            },
            {
              q: "Following a specific commercial flight",
              a: "Flightradar24 or FlightAware — flight-number search, history and airport context are their home turf.",
            },
            {
              q: "Building apps or doing research",
              a: "OpenSky Network's API and historical data, or airplanes.live's open infrastructure. Build on open systems.",
            },
          ].map((c) => (
            <div key={c.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="font-semibold text-white/90 mb-2">{c.q}</p>
              <p className="text-sm text-white/50 leading-relaxed">{c.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free vs paid */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Free vs. paid flight tracking: what&apos;s actually paywalled?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            The live picture — aircraft positions right now — is essentially
            free everywhere, because the underlying ADS-B data is public and
            cheap to redistribute. What you pay for on commercial trackers is
            everything around the live picture: months of flight history,
            advanced filters and alerts, fleet and airport statistics, weather
            layers, and ad-free apps. None of that is necessary to watch the
            sky; all of it is valuable once tracking becomes a habit or a job.
          </p>
          <p>
            The practical advice: start free and notice what you actually miss.
            If you never look up yesterday&apos;s flights, you don&apos;t need
            history. If you find yourself wanting storm overlays, satellite
            context, or ground cameras alongside the aircraft, that&apos;s a
            sign to try a multi-layer globe rather than a paid flat-map tier.
            Pay for the capability you can name, not the plan with the most
            checkmarks.
          </p>
        </div>
      </section>

      {/* Coverage honesty */}
      <div className="mt-16">
        <h2 className="text-2xl md:text-3xl font-bold">A word on coverage claims</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
          <p>
            Every tracker advertises a flights-tracked number, and every one
            of those numbers is a snapshot of a moving target: airborne
            traffic swings by thousands between the North Atlantic morning
            peak and the Pacific night, and coverage depends on where the
            volunteer receiver networks are dense. Over the US and Europe,
            all the major trackers are strong; over oceans, central Africa
            and parts of Asia, the maps thin out for everyone, filled in by
            satellite ADS-B and estimates of varying honesty.
          </p>
          <p>
            The practical test is your own sky. Open two trackers over your
            home airport at a busy hour and compare what&rsquo;s actually
            drawn — the count over your head beats any global claim. It is
            also the test this list was built on: trackers earn their places
            here by drawing real flights, in real places, not by winning the
            headline-number contest.
          </p>
        </div>
      </div>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Flight tracking questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">What&apos;s the best free flight tracker?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              For a traditional map: airplanes.live or ADS-B Exchange, both
              free. For something different: WorldEye&apos;s free 3D globe —
              live aircraft with satellites, weather and cameras on the same
              screen, no signup. Try the globe once; most people don&apos;t go
              back to flat.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Why do some trackers hide certain aircraft?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Commercial services filter military, government, and private
              aircraft whose owners request blocking — a business and
              liability choice. Community trackers like ADS-B Exchange choose
              not to filter, displaying everything broadcast. Same sky,
              different philosophy.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Can I see flight history for free?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Limited history is available on several free tiers, but deep
              historical flight data — months of per-flight records — is
              generally a paid feature. Free trackers are built for the live
              picture; archives cost money to maintain.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          Look up. <span className="text-[#0096FF]">The sky is live.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Free flight tracking on a 3D globe — no signup, nothing to install.
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
          Prefer the dedicated tracker page?{" "}
          <Link href="/live-flight-tracker" className="text-[#0096FF] hover:underline">
            Open the live flight tracker
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
            label: "Live flight tracker",
            desc: "Aircraft on a 3D globe — the page this guide is about.",
            href: "/live-flight-tracker",
          },
          {
            label: "What is ADS-B?",
            desc: "The open radio technology behind every flight tracker, explained.",
            href: "/what-is-ads-b",
          },
          {
            label: "Pricing",
            desc: "Weekly $7.99, monthly $13.99, annual $74.99 — the flight layer stays free.",
            href: "/pricing",
          },
          {
            label: "Flightradar24 alternative",
            desc: "Looking beyond Flightradar24? Where a free all-in-one globe fits instead.",
            href: "/alternatives/flightradar24",
          },
        ]}
      />
    </IntentShell>
  );
}
