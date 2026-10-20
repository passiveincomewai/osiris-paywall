import type { Metadata } from "next";
import Link from "next/link";
import {
  Satellite,
  Globe,
  Radio,
  Eye,
  Radar,
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
  title: "5 Best Satellite Tracking Tools for 2026 (Ranked)",
  description:
    "The best satellite tracking tools for 2026 compared: WorldEye's free satellite layer, N2YO, CelesTrak, Heavens-Above and SatNOGS.",
  alternates: { canonical: "/best-satellite-tracking-tools" },
  openGraph: {
    title: "5 Best Satellite Tracking Tools for 2026 (Ranked) | WorldEye",
    description:
      "Compare the best satellite trackers for 2026 — WorldEye's free 3D globe, N2YO, CelesTrak, Heavens-Above, SatNOGS and more.",
    url: "/best-satellite-tracking-tools",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "5 Best Satellite Tracking Tools for 2026 (Ranked) | WorldEye",
    description:
      "The best satellite tracking tools for 2026 compared — free picks ranked by best-fit.",
  },
};

const TOOLS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best free all-in-one tracker",
    href: "/satellite-tracker",
    body: "Live satellite tracking on a free 3D globe — no signup — with the planet attached: flights below, weather systems, earthquakes, wildfires and 74,229 ground cameras on the same screen. The pick for watching orbit as part of the living world, not as dots on a chart. The satellite layer is free; Pro adds a satellite imagery view and analyst tools.",
  },
  {
    icon: Satellite,
    name: "N2YO",
    tag: "Best for satellite-by-satellite detail",
    href: "/satellite-tracker",
    body: "A long-running satellite tracking site with live positions, maps and pass predictions for individual satellites, organized by category and object. The enthusiast's reference when you follow specific satellites and want their details in one place.",
  },
  {
    icon: Radar,
    name: "CelesTrak",
    tag: "Best for orbital data (TLE catalog)",
    href: "/satellite-tracker",
    body: "The authoritative public catalog of orbital element data — the TLE sets that trackers, researchers and software use to compute where satellites are. Not a casual viewer; it is the data source much of the ecosystem is built on, and invaluable if you work with orbits programmatically.",
  },
  {
    icon: Eye,
    name: "Heavens-Above",
    tag: "Best for pass predictions",
    href: "/satellite-tracker",
    body: "A classic observer's site that predicts when satellites and the space station will pass over your location, and how bright they will be. If your question is 'when can I go outside and see it?', this is the specialist built to answer exactly that.",
  },
  {
    icon: Radio,
    name: "SatNOGS",
    tag: "Best open ground-station network",
    href: "/satellite-tracker",
    body: "An open network of satellite ground stations run by volunteers worldwide, sharing observations and telemetry. A different kind of tool — participation as much as tracking — and the pick if you want to receive satellites, not just watch them plotted.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "5 Best Satellite Tracking Tools for 2026 (Ranked)",
      "The best satellite tracking tools for 2026 compared: WorldEye's free satellite layer, N2YO, CelesTrak, Heavens-Above and SatNOGS.",
      "/best-satellite-tracking-tools"
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

export default function BestSatelliteTrackingToolsPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Best tools", href: "/compare" },
          { label: "Best Satellite Tracking Tools" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Satellite className="w-3.5 h-3.5" /> RANKED GUIDE
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          The best satellite tracking tools <span className="text-[#0096FF]">for 2026.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Five satellite tools compared on what actually differs between
          them — viewing, pass prediction, raw data, and participation.
          WorldEye is our pick for free tracking in context on a 3D globe;
          Heavens-Above wins on pass predictions; CelesTrak is the data
          source. Here&apos;s how to choose.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What differs */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What actually differs between satellite trackers?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Almost every tracker computes positions from the same public
            orbital element data — the TLE catalog — propagated with standard
            models. So positions broadly agree, and &ldquo;which is most
            accurate&rdquo; is usually the wrong question. What differs:{" "}
            <strong className="text-white/85">purpose</strong> (watching live,
            predicting visible passes, or consuming raw data),{" "}
            <strong className="text-white/85">presentation</strong> (flat map,
            3D globe, tables), and <strong className="text-white/85">context</strong>{" "}
            — what else shares the screen with the satellites.
          </p>
          <p>
            Rank accordingly: pick the tool whose purpose matches yours. The
            list below is organized by genuine best-fit, not by catalog size.
          </p>
        </div>
      </section>

      {/* Ranked list */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Five trackers, <span className="text-[#0096FF]">ranked by best-fit</span>
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
        heading="Watch orbit on a globe — free, no signup"
        body="Live satellites arcing over a spinning 3D Earth, with flights, weather and cameras below. Open it and look up."
      />

      {/* How it works */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">How does satellite tracking actually work?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            The short version: tracked objects in Earth orbit are cataloged
            with orbital element sets — TLEs — that describe each orbit
            mathematically. Software propagates those elements forward in
            time to compute where each satellite is right now and where it
            will be next. CelesTrak distributes much of that catalog data
            publicly, which is why so many good trackers exist on top of it.
          </p>
          <p>
            Two consequences follow. First, positions are predictions from a
            model, not live telemetry — excellent ones, refreshed as new
            elements are published. Second, the interesting differences
            between tools are what they do with the same math: a globe for
            watching, pass tables for observing with your own eyes, or a
            ground-station network for actually receiving the signals.
          </p>
        </div>
      </section>

      {/* Use cases */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Which tracker for which job?</h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {[
            {
              q: "Watching satellites for fun",
              a: "WorldEye's free globe — satellites in motion over the real planet, with flights, weather and cameras underneath. No account needed.",
            },
            {
              q: "Seeing a satellite with your own eyes",
              a: "Heavens-Above — location-based pass predictions with brightness estimates are exactly what it was built for.",
            },
            {
              q: "Following a specific satellite",
              a: "N2YO — per-satellite pages, maps and pass details make it the enthusiast reference for individual objects.",
            },
            {
              q: "Building apps or receiving signals",
              a: "CelesTrak for the orbital data itself; SatNOGS if you want to join the open ground-station network and receive satellites for real.",
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
        <h2 className="text-2xl md:text-3xl font-bold">Free vs. paid satellite tracking: what&apos;s actually paywalled?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Unusually for a tracking category, the core of satellite tracking
            is free: the orbital catalog is public, pass prediction sites are
            free, and live viewers like WorldEye&apos;s satellite layer cost
            nothing with no signup. Money enters at the edges — professional
            conjunction and space-situational-awareness services, commercial
            data products, and premium features inside general platforms.
          </p>
          <p>
            On WorldEye specifically: tracking satellites live on the globe
            is free, full stop. The optional Pro tier (weekly $3.99, monthly
            $9.99, annual $59.99) adds a satellite imagery view — looking at
            the Earth from orbit, a different thing from tracking orbits —
            alongside the OSINT toolkit, maritime and cyber/GDELT intel,
            advanced search filters and the AI analyst. If all you want is to watch
            satellites move, you never need it.
          </p>
        </div>
      </section>

      {/* Honest specialist note */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">When a specialist tracker wins</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Plainly: if your question is &ldquo;when will the station pass
            over my house tonight, and how bright?&rdquo; Heavens-Above
            answers it better than a globe does. If you need the raw orbital
            elements themselves, CelesTrak is not a competitor to any viewer
            — it is the source the viewers are built on. Specialists win
            their specialties; this guide ranks WorldEye first only for the
            job most people actually have: watching orbit live, in context,
            for free.
          </p>
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Satellite tracking questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">What&apos;s the best free satellite tracker?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              For watching live: WorldEye&apos;s free 3D globe or N2YO, both
              free. For pass predictions: Heavens-Above. For the underlying
              data: CelesTrak. &ldquo;Best&rdquo; depends entirely on which of
              those jobs you mean.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Can I track the space station?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Yes — large, bright objects like the space station are the
              easiest satellites to follow on any tool here, and the ones
              worth predicting with Heavens-Above for a naked-eye sighting
              when a pass lines up with darkness at your location.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">What is a TLE?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              A two-line element set: a compact text format describing a
              satellite&apos;s orbit at a moment in time. Trackers propagate
              TLEs with orbital models to compute live positions. CelesTrak
              is the best-known public distributor of these catalog sets.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          Orbit is busy. <span className="text-[#0096FF]">Watch it move.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Free satellite tracking on a 3D globe — no signup, nothing to install.
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
          <Link href="/satellite-tracker" className="text-[#0096FF] hover:underline">
            Open the satellite tracker
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "Satellite tracker",
            desc: "Live satellite positions on a 3D globe — the page this guide is about.",
            href: "/satellite-tracker",
          },
          {
            label: "Space station tracker",
            desc: "Follow the station's orbit on the same live globe.",
            href: "/space-station-tracker",
          },
          {
            label: "Features",
            desc: "Everything the globe can do — free layers and Pro intelligence tools.",
            href: "/features",
          },
          {
            label: "Pricing",
            desc: "Weekly $3.99, monthly $9.99, annual $59.99 — satellite tracking stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
