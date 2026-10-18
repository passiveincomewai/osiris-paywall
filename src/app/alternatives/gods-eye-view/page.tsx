import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  GitBranch,
  CloudSun,
  Radar,
  Eye,
  Camera,
  Plane,
  Satellite,
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
  title: "God's Eye View Alternatives in 2026 — Hosted vs Self-Hosted",
  description:
    "God's Eye View is open-source software you install yourself. Compare the alternatives: WorldEye's hosted live globe (36,000+ cameras, no setup), the original project, Zoom Earth and LiveUAMap.",
  alternates: { canonical: "/alternatives/gods-eye-view" },
  openGraph: {
    title: "God's Eye View Alternatives in 2026 — Hosted vs Self-Hosted | WorldEye",
    description:
      "The original God's Eye View is self-hosted open source. WorldEye is the same idea, already running: a live 3D globe with 36,000+ cameras, flights and satellites — free, no install.",
    url: "/alternatives/gods-eye-view",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "God's Eye View Alternatives in 2026 — Hosted vs Self-Hosted | WorldEye",
    description:
      "Compare God's Eye View alternatives: WorldEye's hosted live globe, the original open-source project, Zoom Earth and LiveUAMap.",
  },
};

const OPTIONS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best hosted alternative — no install",
    href: "/gods-eye-view",
    linkLabel: "See WorldEye's god's eye view",
    body: "The same idea as God's Eye View — one live globe carrying cameras, flights, satellites, weather, quakes and fires — but already hosted and running. Open it in a browser: no clone, no build, no API keys for the core experience, and a camera network of 36,000+ public feeds instead of roughly 4,000. Free with no signup; Pro adds OSINT and intel layers.",
  },
  {
    icon: GitBranch,
    name: "God's Eye View (the original)",
    tag: "Best if you want to self-host open source",
    href: "https://www.opensourcealternatives.to/item/gods-eye-view",
    linkLabel: "About the original project",
    body: "Bilawal Sidhu and Sameh Khamis's open-source project (MIT, released August 2026) is the real thing for builders: live data layers over a Cesium globe, sensor-style visual modes and a voice-controlled AI agent. The trade-offs are the setup — you install and run it yourself — and the keys: photorealistic 3D tiles need a Cesium ion token or your own Google Maps API key, and the voice agent needs an OpenAI key.",
  },
  {
    icon: CloudSun,
    name: "Zoom Earth",
    tag: "Best for live satellite weather imagery",
    href: "/compare/zoom-earth",
    linkLabel: "Compare Zoom Earth vs WorldEye",
    body: "If your god's eye view craving is really about weather — live satellite imagery refreshed every 10–15 minutes, storm tracking, rain radar — Zoom Earth is the specialist. It doesn't do cameras, flights or satellites-as-objects; it does Earth's weather from orbit, beautifully.",
  },
  {
    icon: Radar,
    name: "LiveUAMap",
    tag: "Best for conflict and event mapping",
    href: "/alternatives/liveuamap",
    linkLabel: "LiveUAMap alternatives",
    body: "A long-running live map of conflicts and geopolitical events, built around curated event reports rather than raw sensor feeds. Pick it when the question is 'what happened where' in a war zone, not 'what does the world look like right now'.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "God's Eye View Alternatives in 2026 — Hosted vs Self-Hosted",
      "God's Eye View is open-source software you install yourself. Compare the alternatives: WorldEye's hosted live globe, the original project, Zoom Earth and LiveUAMap.",
      "/alternatives/gods-eye-view"
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

export default function GodsEyeViewAlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "God's Eye View Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Eye className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          God&apos;s Eye View alternatives, <span className="text-[#0096FF]">hosted and self-hosted.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          The original God&apos;s Eye View is open-source software you install
          and run yourself. If you want that same live planet — 36,000+
          cameras, flights, satellites, weather — already running in your
          browser, that&apos;s WorldEye. Here&apos;s the honest breakdown of
          every route to the view.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* The honest framing */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Why look for an alternative at all?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            God&apos;s Eye View earned its viral moment honestly: a
            photorealistic 3D Earth carrying live aircraft, ships, satellites,
            earthquakes, fires and cameras, released free and open source in
            August 2026. Nobody needs to tear it down. People look for
            alternatives for one practical reason — it&apos;s a project you
            set up, not a website you open.
          </p>
          <p>
            Running it means installing it on your own machine (a one-click
            Pinokio installer, Docker, or a manual clone), keeping it
            updated, and bringing your own keys for the best of it: the base
            globe starts keyless on satellite imagery, but photorealistic 3D
            tiles need a Cesium ion token or a Google Maps API key on your
            account, and the voice AI agent runs on your OpenAI key. For
            builders, that&apos;s the fun. For everyone else, it&apos;s a
            wall between them and the view.
          </p>
        </div>
      </section>

      {/* Hosted answer */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Globe className="w-7 h-7 text-[#0096FF] shrink-0" />
          Is there a hosted version of God&apos;s Eye View?
        </h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            Not an official one — God&apos;s Eye View ships as software, not
            a website, and its creators don&apos;t run a hosted version.
            WorldEye is an <span className="text-white/85 font-semibold">independent
            alternative</span> built on the same concept: one interactive 3D
            globe with live flights, satellites, weather, earthquakes and
            wildfires, plus a public-camera network of 36,000+ feeds (the
            open-source project&apos;s CCTV mesh lists roughly 4,000). No
            install, no build step, no API keys for the core globe — open the
            page and it&apos;s already live, on phone or desktop. To be plain:
            WorldEye is a separate product from a separate team, with no
            affiliation with the God&apos;s Eye View project.
          </p>
          <p>
            The honest trade: you can&apos;t fork a website. If you want to
            modify the code, bolt on your own layers or run the whole thing on
            your own machine, the open-source project is the right choice and
            it&apos;s genuinely excellent. WorldEye is for watching, not
            tinkering.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Four ways to get the view, <span className="text-[#0096FF]">compared</span>
        </h2>
        <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
          Each option is the right answer for somebody — here&apos;s who.
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
                    {o.linkLabel}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <MidCta
        heading="The view, without the setup"
        body="WorldEye's globe is live right now — 36,000+ cameras, flights, satellites and weather on one screen. Open it and decide in thirty seconds."
      />

      {/* Hosted vs self-hosted */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Hosted vs self-hosted: what actually differs</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            <span className="text-white/85 font-semibold">Getting started.</span>{" "}
            Self-hosted: clone, install, configure, keep it running. Hosted:
            open a URL. If the goal is to watch the world tonight, this is the
            whole argument.
          </p>
          <p>
            <span className="text-white/85 font-semibold">Keys and costs.</span>{" "}
            The open-source project is free code, but its photorealistic tiles
            run on your Cesium ion token or bill against your Google account,
            and its AI agent bills against your OpenAI account. WorldEye&apos;s core globe is free with no keys at
            all; an optional Pro subscription ($3.99/week, $9.99/month,
            $59.99/year) unlocks the intelligence toolkit.
          </p>
          <p>
            <span className="text-white/85 font-semibold">Cameras.</span>{" "}
            The biggest data gap: roughly 4,000 public cameras in the
            open-source project&apos;s CCTV mesh versus 36,000+ live public
            feeds from 105 countries on WorldEye. If cameras are why
            you&apos;re here, it isn&apos;t close.
          </p>
          <p>
            <span className="text-white/85 font-semibold">Control.</span>{" "}
            Self-hosting wins this one outright — your machine, your code,
            your layers, sensor-style visual modes included. A hosted site
            gives you the view, not the source.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: Globe, label: "The hosted globe", href: "/gods-eye-view" },
              { icon: Camera, label: "36,000+ cameras", href: "/cameras" },
              { icon: Plane, label: "Live flights", href: "/live-flight-tracker" },
              { icon: Satellite, label: "Satellites", href: "/satellite-tracker" },
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

      {/* How to choose */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Which one should you use?</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              q: "Just want to watch the world live?",
              a: "WorldEye. It's already running — free, no signup, no keys, on any device with a browser.",
            },
            {
              q: "Want to build on it or self-host?",
              a: "The original God's Eye View. MIT-licensed, well documented, and made to be extended with your own layers.",
            },
            {
              q: "Mostly care about storms and satellite imagery?",
              a: "Zoom Earth for weather from orbit — or WorldEye when you want the weather plus the cameras underneath it.",
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
        <h2 className="text-2xl md:text-3xl font-bold">God&apos;s Eye View questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is God&apos;s Eye View free?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              The code is free and open source (MIT), and the base globe now
              starts with no keys at all. The full experience isn&apos;t
              entirely free, though: photorealistic 3D tiles use a Cesium ion
              token or your own Google Maps API key (metered by Google), and
              the voice agent uses your OpenAI key. WorldEye&apos;s core globe
              is free with no keys; Pro is optional.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Can I use God&apos;s Eye View without installing it?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              The original project is software you run yourself — there&apos;s
              no official hosted version. WorldEye is the hosted alternative:
              the same live-globe concept at worldeye.app, in the browser, with
              a far larger camera network.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Which has more cameras?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              WorldEye, by a wide margin: 36,000+ live public cameras from 105
              countries, versus roughly 4,000 in the open-source
              project&apos;s CCTV mesh (the figure in its README). Both draw
              on public feeds; WorldEye&apos;s directory is simply much
              larger.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          Skip the setup. <span className="text-[#0096FF]">See the planet.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          One click, no signup, no API keys. The globe is already spinning.
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
          New to the idea? Start with{" "}
          <Link href="/gods-eye-view" className="text-[#0096FF] hover:underline">
            what a god&apos;s eye view is
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "God's eye view of Earth, live",
            desc: "The concept explained — and the live globe that delivers it, free in your browser.",
            href: "/gods-eye-view",
          },
          {
            label: "An EarthCam alternative",
            desc: "How WorldEye's aggregated camera globe compares with the classic webcam network.",
            href: "/earthcam-alternative",
          },
          {
            label: "Best interactive 3D globes",
            desc: "The full ranked guide to spinning the planet in 2026.",
            href: "/best-interactive-3d-globes",
          },
          {
            label: "Pricing",
            desc: "Weekly $3.99, monthly $9.99, annual $59.99 — the core globe stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
