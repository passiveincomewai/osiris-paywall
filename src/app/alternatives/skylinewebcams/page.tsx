import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  Camera,
  Video,
  Wind,
  MapPin,
  MonitorSmartphone,
  Eye,
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
  title: "SkylineWebcams Alternatives in 2026",
  description:
    "Looking for a SkylineWebcams alternative? Compare free live webcam platforms — WorldEye's 3D globe, EarthCam, Explore.org, Windy webcams and more.",
  alternates: { canonical: "/alternatives/skylinewebcams" },
  openGraph: {
    title: "SkylineWebcams Alternatives in 2026 | WorldEye",
    description:
      "Free alternatives to SkylineWebcams compared: WorldEye's live 3D globe, EarthCam, Explore.org, Windy webcams, WebcamTaxi and more.",
    url: "/alternatives/skylinewebcams",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SkylineWebcams Alternatives in 2026 | WorldEye",
    description:
      "Free SkylineWebcams alternatives compared — WorldEye's live 3D globe, EarthCam, Explore.org and more.",
  },
};

const OPTIONS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best free all-in-one alternative",
    href: "/compare/skylinewebcams",
    body: "A free live 3D globe — no signup — carrying ~76,000 public cameras alongside live flights, satellites, weather, earthquakes and wildfires. The pick when you want cameras placed on the planet they are filming, not in a directory list.",
  },
  {
    icon: Video,
    name: "EarthCam",
    tag: "Best for famous landmark cams",
    href: "/compare/earthcam",
    body: "The best-known webcam network: famous landmark and city cameras, plus construction cameras used professionally. Polished and long-running; a destination directory rather than a live world map.",
  },
  {
    icon: Eye,
    name: "Explore.org",
    tag: "Best for wildlife and nature cams",
    href: "/compare/explore-org",
    body: "A nonprofit live-camera network focused on wildlife and nature — animal sanctuaries, nests, watering holes and landscapes, with an educational mission. Superb for nature; not a general city or travel directory.",
  },
  {
    icon: Wind,
    name: "Windy webcams",
    tag: "Best for webcams with weather",
    href: "/compare/windy",
    body: "Windy's webcam layer puts cameras alongside its forecast maps, so you can check the sky in the model and the sky on camera in the same place. A weather platform first — the cameras are one layer among many.",
  },
  {
    icon: MapPin,
    name: "WebcamTaxi",
    tag: "Best simple webcam directory",
    href: "/live-webcams",
    body: "A straightforward directory of live webcams around the world, organized by place and category. Easy to browse when you simply want to find a camera in a location; a directory, not a live data platform.",
  },
  {
    icon: MonitorSmartphone,
    name: "YouTube live webcams",
    tag: "Best for long-running live streams",
    href: "/live-webcams",
    body: "Thousands of always-on live streams hosted on YouTube — beaches, cities, wildlife and landmarks. Huge and free, but scattered: there is no single map or directory tying them together.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "SkylineWebcams Alternatives in 2026",
      "Free alternatives to SkylineWebcams: WorldEye's live 3D globe, EarthCam, Explore.org, Windy webcams, WebcamTaxi and more.",
      "/alternatives/skylinewebcams"
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

export default function SkylineWebcamsAlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "SkylineWebcams Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Camera className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          SkylineWebcams alternatives that put cameras <span className="text-[#0096FF]">on the map.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          The best free SkylineWebcams alternative is WorldEye: ~76,000 public
          cameras on a live 3D globe — no signup — with flights, satellites,
          weather, earthquakes and wildfires around them. If you mainly browse
          scenic cameras by category, a directory below may fit better.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What SkylineWebcams is */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What is SkylineWebcams, exactly?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            SkylineWebcams is a large scenic webcam directory: live cameras
            organized by destination and category — beaches, cities,
            landscapes, landmarks and more — free to watch with advertising.
            It is built for browsing beautiful places and checking a view
            before a trip, and it does that job well.
          </p>
          <p>
            Its limit is the directory model itself. A list tells you a camera
            exists; it does not show you the weather over it, the flights
            above it, or what else is happening nearby. So the first question
            in choosing an alternative is &ldquo;do I want a better directory,
            or a different way of exploring cameras altogether?&rdquo;
          </p>
        </div>
      </section>

      {/* Free alternative */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Globe className="w-7 h-7 text-[#0096FF] shrink-0" />
          Is there a free alternative to SkylineWebcams?
        </h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            Yes. WorldEye&apos;s entire map is free with no account: roughly
            76,000 publicly accessible cameras on a 3D globe, alongside live
            aircraft positions, satellite tracks, weather systems, and
            earthquake and wildfire activity. Instead of picking a destination
            from a list, you spin the planet and open the cameras where they
            actually are.
          </p>
          <p>
            The Pro tier (weekly $3.99, monthly $9.99, annual $59.99) adds
            intelligence tooling — the OSINT toolkit, maritime and cyber/GDELT
            intel feeds, satellite imagery view, advanced search filters and the AI
            analyst — but it never gates the cameras or the live map.
            EarthCam, Explore.org and WebcamTaxi are also free for their
            specialties.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Six SkylineWebcams alternatives, <span className="text-[#0096FF]">compared</span>
        </h2>
        <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
          Each one&apos;s honest best-fit is noted — the right alternative is
          the one that matches how you actually watch.
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
        heading="76,000+ cameras. One globe. Free."
        body="Spin the planet, open a camera, and see the weather, flights and satellites around it — no signup, nothing to install."
      />

      {/* Why a globe */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Why cameras belong on a globe</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            A directory answers &ldquo;is there a camera in this town?&rdquo; A
            globe answers &ldquo;what does the world look like right
            now?&rdquo; On WorldEye you can follow the sunrise across
            continents camera by camera, check a beach while its weather
            system spins overhead, or drop from a satellite view straight into
            a street-level feed — context a category list cannot give you.
          </p>
          <p>
            The camera is also the ground truth for everything else on the
            map. A storm layer says rain is likely; the camera shows the wet
            street. That pairing — live data above, live eyes below — is what
            turns browsing into exploring.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: Camera, label: "~76,000 public cameras", href: "/cameras" },
              { icon: Video, label: "Live webcams", href: "/live-webcams" },
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
        <h2 className="text-2xl md:text-3xl font-bold">When a webcam directory wins</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Breadth has a trade-off, and it&apos;s worth stating plainly. If
            you know exactly which famous viewpoint you want, EarthCam&apos;s
            landmark cameras and SkylineWebcams&apos; category browsing get
            you there in fewer clicks. If it&apos;s wildlife you are after,
            Explore.org&apos;s nature cameras — with their educational
            framing — are the deeper, more focused experience.
          </p>
          <p>
            WorldEye&apos;s bet is different: most people don&apos;t watch one
            camera — they explore. Use the directory for the one view you
            already know, and the globe for discovering the ones you
            didn&apos;t.
          </p>
        </div>
      </section>

      {/* How to choose */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">How to choose your webcam platform</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              q: "Known place or exploring?",
              a: "A known landmark or beach points to a directory like EarthCam or SkylineWebcams. Open-ended exploring points to a globe with cameras in place.",
            },
            {
              q: "Scenery or wildlife?",
              a: "Nature and animal cameras are Explore.org's home turf. Cities, coasts and everyday places are better served by a general platform.",
            },
            {
              q: "Cameras only, or context too?",
              a: "If you only ever open one feed, any free directory works. If you want weather, flights and events around the feed, pick the multi-layer option.",
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
        <h2 className="text-2xl md:text-3xl font-bold">SkylineWebcams alternative questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">How many cameras does WorldEye have?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Roughly 76,000 publicly accessible cameras on the free map —
              no signup required to open them. They sit on the same 3D globe
              as the flight, satellite, weather, earthquake and wildfire
              layers.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is SkylineWebcams free?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Yes, SkylineWebcams is free to watch with advertising. The
              alternatives on this page are also free at their core —
              WorldEye&apos;s map and cameras are free with no account at
              all.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">What does WorldEye Pro cost?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Weekly $3.99, monthly $9.99, or annual $59.99. Pro adds the
              OSINT toolkit, maritime intel, cyber/GDELT intel, satellite
              imagery view, advanced search filters and the AI analyst. The free map
              and cameras stay free regardless.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          Every camera, <span className="text-[#0096FF]">in its place.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Open the globe and explore the world live — free, no signup, nothing to install.
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
          <Link href="/compare/skylinewebcams" className="text-[#0096FF] hover:underline">
            WorldEye vs SkylineWebcams
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "WorldEye vs SkylineWebcams",
            desc: "The detailed head-to-head comparison on the compare hub.",
            href: "/compare/skylinewebcams",
          },
          {
            label: "Live webcams",
            desc: "Public cameras around the world, on a live 3D globe.",
            href: "/live-webcams",
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
