import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe2,
  Globe,
  Satellite,
  Camera,
  Plane,
  History,
  Telescope,
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
  title: "Google Earth Alternatives: Live Views",
  description:
    "Google Earth alternatives compared: WorldEye's live 3D globe, Zoom Earth, NASA Worldview and more — for when you need the planet right now.",
  alternates: { canonical: "/alternatives/google-earth" },
  openGraph: {
    title: "Google Earth Alternatives: Live Views | WorldEye",
    description:
      "Google Earth shows the past beautifully. These alternatives show the present: WorldEye's live globe, Zoom Earth, NASA Worldview and more.",
    url: "/alternatives/google-earth",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Google Earth Alternatives: Live Views | WorldEye",
    description:
      "Google Earth alternatives for live views: WorldEye's live 3D globe, Zoom Earth, NASA Worldview and more.",
  },
};

const OPTIONS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best live-planet alternative",
    href: "/compare/google-earth",
    body: "A free live 3D globe — no signup — where the Earth moves: live flights, satellites, ships, weather, earthquakes, wildfires and 74,229 public cameras. Google Earth shows you the planet's past; WorldEye shows you its present.",
  },
  {
    icon: Satellite,
    name: "Zoom Earth",
    tag: "Best for near-real-time satellite views",
    href: "/compare/zoom-earth",
    body: "Satellite imagery updated intraday with live storm and wildfire tracking. The closest free answer to 'what does it look like right now from space' — imagery-focused, without flight or camera layers.",
  },
  {
    icon: Telescope,
    name: "NASA Worldview",
    tag: "Best for science-grade imagery",
    href: "/compare/nasa-worldview",
    body: "Daily global satellite imagery across hundreds of scientific layers, straight from NASA. Authoritative and free; a research instrument first, not a casual exploration globe.",
  },
  {
    icon: Camera,
    name: "Sentinel Hub / Copernicus Browser",
    tag: "Best free high-res Earth observation",
    href: "/compare/sentinel-hub",
    body: "Free access to Europe's Copernicus Sentinel imagery with custom band combinations. Superb image quality for analysis; requires more expertise than opening a globe.",
  },
  {
    icon: Plane,
    name: "Windy / Ventusky",
    tag: "Best for live atmospheric views",
    href: "/weather-tracker",
    body: "Stunning animated weather globes — wind, rain, temperature, air quality. If 'live Earth' to you means the atmosphere in motion, these are unmatched at it.",
  },
  {
    icon: History,
    name: "Google Earth itself",
    tag: "Still best for historical imagery",
    href: "/compare/google-earth",
    body: "Honest inclusion: for timelapse and historical imagery — watching a city grow over decades — nothing here beats Google Earth's archive. Keep it bookmarked for the past; use a live globe for the present.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "Google Earth Alternatives: Live Views",
      "Google Earth alternatives compared: WorldEye's live 3D globe, Zoom Earth, NASA Worldview and more.",
      "/alternatives/google-earth"
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

export default function GoogleEarthAlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "Google Earth Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Globe2 className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          Google Earth alternatives for <span className="text-[#0096FF]">the planet right now.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Google Earth is unmatched at showing the planet&apos;s past — its
          historical imagery archive is a treasure. But its imagery is months
          or years old. If you want the Earth live, the best free alternative
          is WorldEye: a 3D globe streaming flights, satellites, ships,
          weather, quakes and cameras right now, with no signup.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* The core distinction */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">The past vs. the present</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            This is the entire comparison in one sentence: Google Earth is a
            time machine, and every alternative on this page is a window.
            Google Earth lets you scrub back through decades of satellite
            imagery, watch glaciers retreat and cities sprawl, and drop into
            Street View. That archive took billions of dollars to build, and
            nothing free matches it.
          </p>
          <p>
            But open Google Earth during a hurricane, a wildfire, or a
            breaking news event and you&apos;ll see the same calm, months-old
            imagery as always. The alternatives below trade the archive for
            immediacy: what the planet looks like <em>today</em>, what&apos;s
            moving across it <em>right now</em>. Different question, different
            tool — and most curious people end up wanting both.
          </p>
        </div>
      </section>

      {/* Free alternative */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Globe className="w-7 h-7 text-[#0096FF] shrink-0" />
          Is there a free alternative to Google Earth?
        </h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            Several — and WorldEye is the only free 3D globe built around
            live data. No signup, no install: spin the Earth and watch
            aircraft cross oceans, satellites arc overhead, storms spin up,
            the ground shake, and public cameras show you the street level —
            all streaming. Zoom Earth, NASA Worldview and the Copernicus
            Browser are also free, each strongest at satellite imagery.
          </p>
          <p>
            What none of them replace is Google Earth&apos;s historical
            timelapse. If your question is &ldquo;how did this place change
            over 20 years,&rdquo; keep Google Earth. If it&apos;s
            &ldquo;what&apos;s happening there right now,&rdquo; a live globe
            is the answer.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Six Google Earth alternatives, <span className="text-[#0096FF]">compared</span>
        </h2>
        <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
          Each option&apos;s honest best-fit — because &ldquo;live&rdquo; means
          different things to different people.
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
        heading="The Earth, live — free, no signup"
        body="Flights, satellites, storms, quakes and cameras streaming on a 3D globe. Google Earth shows the past; come see the present."
      />

      {/* Live layers */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What &ldquo;live&rdquo; actually looks like</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            &ldquo;Live globe&rdquo; is easy to say and worth pinning down. On
            WorldEye it means: aircraft positions updating as they broadcast,
            satellites tracked along their actual orbits, ships moving through
            shipping lanes, weather systems evolving, earthquakes plotted as
            they&apos;re reported, wildfire activity, and tens of thousands of
            public cameras you can open for a ground-level view. It&apos;s a
            planet with a pulse, not a photograph of one.
          </p>
          <p>
            The experience difference is hard to overstate. Reading about a
            storm is one thing; watching it spin on a globe while aircraft
            route around it and cameras on the coastline show the surf is
            another. That&apos;s the use case Google Earth was never built for
            — and the reason live globes have their own growing audience.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: Satellite, label: "Satellite tracking", href: "/satellite-tracker" },
              { icon: Plane, label: "Live flight tracking", href: "/live-flight-tracker" },
              { icon: Camera, label: "74,229 public cameras", href: "/cameras" },
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

      {/* What Google Earth still wins */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What Google Earth still does best</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Credit where it&apos;s due: historical imagery timelapse remains
            Google Earth&apos;s killer feature and nobody on this list touches
            it. Urban planning, environmental research, pure curiosity about
            how your hometown changed — the archive wins. Street View, too,
            has no free equivalent at its coverage.
          </p>
          <p>
            The practical setup most people land on: Google Earth for the
            past, a live globe for the present. They answer different
            questions, and keeping both bookmarked costs nothing.
          </p>
        </div>
      </section>

      {/* Making the switch */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Making the switch from Google Earth</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            The honest starting point: WorldEye is not a clone of Google
            Earth with live data bolted on, and two parts of your Google
            Earth life do not transfer — your saved places and KML files, and
            Earth&rsquo;s historical imagery archive. What does transfer is
            the habit itself, and it maps across like this:
          </p>
          <ul className="space-y-3 list-none">
            <li>
              <strong className="text-white/85">Flying to a place.</strong>{" "}
              The same gesture, a different engine: search any place, address
              or coordinates and the globe flies there — basic search is free
              with no signup. What greets you is not a static photograph but
              the place as it is now: its weather, its traffic in the air,
              and its public cameras on the ground.
            </li>
            <li>
              <strong className="text-white/85">Dropping to street level.</strong>{" "}
              WorldEye&rsquo;s ground truth is live cameras first — 74,229 of
              them — plus community street-level photography from Panoramax,
              every frame dated and credited, and labeled as photography
              rather than a live feed. It is not Street View&rsquo;s coverage;
              it is something Street View can&rsquo;t do at all — the street
              as it looks this minute.
            </li>
            <li>
              <strong className="text-white/85">Looking from above.</strong>{" "}
              Pro adds a true-color satellite imagery basemap for the
              top-down inspection Google Earth users know, while the free
              globe tracks the satellites themselves overhead.
            </li>
            <li>
              <strong className="text-white/85">Exploring for its own sake.</strong>{" "}
              This is where switchers get hooked: a globe where things move.
              Idle curiosity — a storm spinning up, a ship queue at a canal,
              rush hour in a city you&rsquo;ve never visited, live on its own
              cameras — is a different pastime from browsing an archive.
            </li>
          </ul>
        </div>
      </section>

      {/* How to choose */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Which live-Earth tool should you use?</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              q: "Want everything live on one globe?",
              a: "WorldEye. Flights, satellites, ships, weather, quakes, fires and cameras — free, no signup, in the browser.",
            },
            {
              q: "Want the freshest satellite pictures?",
              a: "Zoom Earth for quick looks, NASA Worldview or Copernicus Browser for deeper imagery work.",
            },
            {
              q: "Want the past, not the present?",
              a: "Stay with Google Earth. Its historical timelapse is genuinely irreplaceable.",
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
        <h2 className="text-2xl md:text-3xl font-bold">Google Earth alternative questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is WorldEye a replacement for Google Earth?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              For live viewing, yes — and it goes further, with flights,
              satellites, cameras and weather that Google Earth doesn&apos;t
              stream. For historical imagery and Street View, no; Google Earth
              remains the tool for those. Most users keep both.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Do I need to install anything?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No. WorldEye runs entirely in the browser — phone, tablet or
              desktop. The globe, the live layers and the cameras are one tap
              away with nothing to download.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">What does WorldEye Pro add?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              High-resolution satellite imagery view, the AI analyst assistant,
              premium intel feeds, the OSINT toolkit, and advanced search filters. Weekly $7.99, monthly $13.99, annual $74.99 —
              the live globe itself stays free.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Does WorldEye have Street View?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Not Google&rsquo;s Street View — nothing outside Google does.
              WorldEye&rsquo;s street level works differently: live public
              cameras for the present moment, and Panoramax community
              street-level photography for ground detail, with the capture
              date and credit on every frame. For walking a street
              photograph-by-photograph at global coverage, Google Earth
              remains the tool; for seeing the street live, that is the
              globe&rsquo;s whole point.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Can I use WorldEye offline, like Google Earth&rsquo;s cached areas?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No — and by design. WorldEye is a live product: its flights,
              cameras, weather and earthquakes only mean anything with a
              connection, so there is no offline mode. If your work is
              offline fieldwork with downloaded imagery, keep Google Earth
              for it.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          The past is archived. <span className="text-[#0096FF]">The present is live.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Spin the globe and watch the planet move — free, no signup.
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
          <Link href="/compare/google-earth" className="text-[#0096FF] hover:underline">
            WorldEye vs Google Earth
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "WorldEye vs Google Earth",
            desc: "The detailed head-to-head comparison on the compare hub.",
            href: "/compare/google-earth",
          },
          {
            label: "Best interactive 3D globes",
            desc: "Ranked 3D globes for exploring the planet in 2026.",
            href: "/best-interactive-3d-globes",
          },
          {
            label: "Features",
            desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
            href: "/features",
          },
          {
            label: "Pricing",
            desc: "Weekly $7.99, monthly $13.99, annual $74.99 — the live globe stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
