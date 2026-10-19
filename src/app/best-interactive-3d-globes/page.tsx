import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  Globe2,
  Satellite,
  Telescope,
  Camera,
  History,
  Boxes,
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
  title: "Best Interactive 3D Globes in 2026",
  description:
    "The best interactive 3D globes for 2026: WorldEye's live globe, Google Earth, NASA Worldview, Zoom Earth and more — compared honestly.",
  alternates: { canonical: "/best-interactive-3d-globes" },
  openGraph: {
    title: "Best Interactive 3D Globes in 2026 | WorldEye",
    description:
      "Compare the best 3D globes for exploring Earth — WorldEye's live globe, Google Earth, NASA Worldview, Zoom Earth and more.",
    url: "/best-interactive-3d-globes",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Best Interactive 3D Globes in 2026 | WorldEye",
    description:
      "The best interactive 3D globes for 2026 compared — live, imagery and exploration picks.",
  },
};

const GLOBES = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best live globe",
    href: "/compare/google-earth",
    body: "The only free 3D globe built around live data: aircraft, satellites, ships, weather, earthquakes, wildfires and ~76,000 public cameras streaming on a spinning Earth — no signup, in the browser. Pro adds high-res satellite imagery view, the AI analyst assistant and intel feeds. If your question is 'what's happening on Earth right now,' this is the globe.",
  },
  {
    icon: History,
    name: "Google Earth",
    tag: "Best historical imagery globe",
    href: "/compare/google-earth",
    body: "The classic: decades of satellite imagery with timelapse, Street View integration, and Voyager stories. Unmatched for exploring how places changed over time. Its imagery isn't live — but for the past, nothing else comes close.",
  },
  {
    icon: Satellite,
    name: "Zoom Earth",
    tag: "Best near-real-time satellite globe",
    href: "/compare/zoom-earth",
    body: "Satellite imagery refreshed intraday, with live storm, fire and weather overlays on a smooth globe. The best free answer to 'what does Earth look like from space today' — imagery-first, without flight or camera layers.",
  },
  {
    icon: Telescope,
    name: "NASA Worldview",
    tag: "Best science-data globe",
    href: "/compare/nasa-worldview",
    body: "Hundreds of NASA satellite data layers on a browsable globe — fires, floods, aerosols, sea ice, all authoritative and free. A research instrument that happens to be beautiful; steeper learning curve than casual globes.",
  },
  {
    icon: Camera,
    name: "Sentinel Hub / Copernicus Browser",
    tag: "Best free EO imagery globe",
    href: "/compare/sentinel-hub",
    body: "Free access to Europe's Copernicus Sentinel imagery with true-color and analytical views. Superb image quality for anyone working with Earth observation — an analyst's globe rather than a live one.",
  },
  {
    icon: Boxes,
    name: "Cesium-based open globes",
    tag: "Best open-source globe tech",
    href: "/compare/copernicus-browser",
    body: "CesiumJS powers many of the web's best 3D globes, and open demos built on it show what's possible with open tooling. For developers, it's the platform; for everyone else, it's the engine behind several globes on this list.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "Best Interactive 3D Globes in 2026",
      "The best interactive 3D globes for 2026: WorldEye's live globe, Google Earth, NASA Worldview, Zoom Earth and more.",
      "/best-interactive-3d-globes"
    ),
    itemListLd(
      GLOBES.map((g) => ({
        name: g.name,
        href: g.href,
        description: `${g.tag}. ${g.body}`,
      }))
    ),
  ],
};

export default function BestInteractive3DGlobesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Best tools", href: "/compare" },
          { label: "Best Interactive 3D Globes" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Globe2 className="w-3.5 h-3.5" /> RANKED GUIDE
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          The best interactive 3D globes <span className="text-[#0096FF]">for 2026.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Six globes compared on what actually matters: is it live, is it
          free, and what can you see? WorldEye is our pick for a living
          planet; Google Earth still owns the past; NASA Worldview owns the
          science. Here&apos;s the honest breakdown.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What to look for */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What makes a 3D globe great?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            A globe is a lens, and lenses differ. The three questions that
            separate them: <strong className="text-white/85">when</strong> does
            it show (live data, recent imagery, or historical archive?),{" "}
            <strong className="text-white/85">what</strong> does it show
            (imagery only, or flights, weather, cameras, ships?), and{" "}
            <strong className="text-white/85">who</strong> is it for (casual
            explorers, researchers, developers?).
          </p>
          <p>
            Most &ldquo;best globe&rdquo; lists ignore the first question and
            compare imagery archives against live platforms as if they were
            the same product. They aren&apos;t. A timelapse globe and a live
            globe answer different curiosities — this guide keeps them
            distinct so you pick the right lens.
          </p>
        </div>
      </section>

      {/* Ranked list */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Six globes, <span className="text-[#0096FF]">ranked by best-fit</span>
        </h2>
        <div className="mt-10 grid gap-5 max-w-4xl mx-auto">
          {GLOBES.map((g, i) => (
            <article
              key={g.name}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-8 hover:border-[#0096FF]/40 transition"
            >
              <div className="flex items-start gap-5">
                <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#0096FF]/10 border border-[#0096FF]/25 text-sm font-bold text-[#0096FF] shrink-0">
                  {i + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold">{g.name}</h3>
                    <span className="text-xs font-semibold text-[#0096FF] bg-[#0096FF]/10 border border-[#0096FF]/25 rounded-full px-3 py-1">
                      {g.tag}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed mt-3">{g.body}</p>
                  <Link
                    href={g.href}
                    className="inline-flex items-center gap-1.5 text-sm text-[#0096FF] hover:underline mt-4 font-medium"
                  >
                    Compare {g.name} vs WorldEye
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MidCta
        heading="Spin a living planet — free, no signup"
        body="WorldEye's globe streams the Earth as it is right now. Open it in your browser and see."
      />

      {/* Live vs archive */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Live globes vs. archive globes</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            The deepest split in this category: <strong className="text-white/85">archive
            globes</strong> (Google Earth) show you the planet&apos;s past in
            extraordinary detail — timelapse a coastline across thirty years —
            while <strong className="text-white/85">live globes</strong> (WorldEye,
            Zoom Earth) show you its present — the storm forming now, the
            flights overhead now, the camera on that street now.
          </p>
          <p>
            Neither replaces the other, and the price of both is zero, so the
            real answer is to use both. But if you&apos;ve only ever used an
            archive globe, the live side is the revelation: the Earth stops
            being a photograph and starts being a place — with weather,
            traffic, and ten thousand moving parts you can watch.
          </p>
        </div>
      </section>

      {/* What live looks like */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What can you actually see on a live globe?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            On WorldEye, right now: thousands of aircraft arcing between
            continents, the ISS and Starlink satellites sweeping overhead,
            container ships threading straits, storms spinning in the oceans,
            earthquakes as they&apos;re reported, wildfire activity — and
            roughly 76,000 public cameras you can open for a street-level view
            of anywhere interesting. The day-night terminator sweeps the
            planet in real time.
          </p>
          <p>
            It&apos;s the kind of thing that&apos;s hard to describe and
            instant to understand: open the globe, spin it, and watch. Thirty
            seconds is enough. That immediacy is why live globes keep winning
            converts from flat maps — the planet was never flat, and now your
            map doesn&apos;t have to pretend it is.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: Satellite, label: "Satellite tracking", href: "/satellite-tracker" },
              { icon: Globe, label: "Live flight tracking", href: "/live-flight-tracker" },
              { icon: Camera, label: "~76,000 public cameras", href: "/cameras" },
              { icon: Globe2, label: "All features", href: "/features" },
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

      {/* Which globe */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Which globe should you use?</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              q: "Want the planet live?",
              a: "WorldEye. Nothing else puts flights, satellites, ships, weather, quakes and cameras on one free globe with no signup.",
            },
            {
              q: "Want the planet's past?",
              a: "Google Earth. Historical timelapse remains unmatched — watch decades of change in seconds.",
            },
            {
              q: "Want satellite science?",
              a: "NASA Worldview for research layers, Zoom Earth for quick fresh imagery, Copernicus Browser for EO analysis.",
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
        <h2 className="text-2xl md:text-3xl font-bold">3D globe questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">What&apos;s the best free 3D globe?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              For live data: WorldEye — free, no signup, broadest live layers.
              For historical imagery: Google Earth. For fresh satellite
              pictures: Zoom Earth. All free; they answer different questions.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Do I need to install anything to use WorldEye?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No. It runs entirely in the browser on phone, tablet or desktop
              — the globe, live layers and cameras are one tap away with
              nothing to download.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">What does WorldEye Pro add to the globe?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              High-resolution satellite imagery view, the AI analyst assistant,
              premium intel feeds, the OSINT toolkit, and advanced search filters. Weekly $3.99, monthly $9.99, annual $59.99 —
              the live globe itself stays free.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          The Earth is round. <span className="text-[#0096FF]">Your map should be too.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Open the live globe — free, no signup, nothing to install.
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
          Into live views?{" "}
          <Link href="/alternatives/google-earth" className="text-[#0096FF] hover:underline">
            See Google Earth alternatives
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "Google Earth alternatives",
            desc: "Live-view alternatives to Google Earth's archive, compared.",
            href: "/alternatives/google-earth",
          },
          {
            label: "Best global intelligence dashboards",
            desc: "When your globe needs to be a situation room.",
            href: "/best-global-intelligence-dashboards",
          },
          {
            label: "Features",
            desc: "Everything the globe can do — free forever layers and Pro tools.",
            href: "/features",
          },
          {
            label: "Pricing",
            desc: "Weekly $3.99, monthly $9.99, annual $59.99 — the globe stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
