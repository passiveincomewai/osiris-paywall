import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Globe,
  Plane,
  Satellite,
  CloudLightning,
  Flame,
  Activity,
  Eye,
  ChevronDown,
  MousePointerClick,
  Layers,
  ShieldCheck,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import DirectAnswers from "@/components/seo/DirectAnswers";
import RelatedLinks from "@/components/RelatedLinks";
import GodsEyeLiveStrip from "@/components/GodsEyeLiveStrip";
import GodsEyeStickyCta from "@/components/GodsEyeStickyCta";
import { TRIAL_PLAN_OPTIONS } from "@/lib/billing/trial-checkout";

export const metadata: Metadata = {
  title: "God's Eye View of Earth, Live — 74,229 Cameras, Flights & Satellites",
  description:
    "WorldEye is a live god's eye view of Earth: 74,229 public cameras, live flights, satellites, weather, earthquakes and wildfires on one 3D globe — free, no signup, nothing to install.",
  alternates: { canonical: "/gods-eye-view" },
  openGraph: {
    title: "God's Eye View of Earth, Live — 74,229 Cameras, Flights & Satellites | WorldEye",
    description:
      "One live 3D globe with 74,229 public cameras, live flights, satellites, weather, earthquakes and wildfires. Free, no signup, nothing to install.",
    url: "/gods-eye-view",
    type: "website",
  },
};

const LAYERS = [
  {
    icon: Camera,
    title: "74,229 live cameras",
    desc: "Public cameras from 105 countries — highways, city plazas, beaches, harbors, airports and mountain resorts — plotted where they actually stand. Click one and watch that exact spot, live.",
  },
  {
    icon: Plane,
    title: "Live flights",
    desc: "Aircraft tracked in real time via ADS-B, arcing over the curve of the Earth. Follow the sky over a city, then open a camera near the airport to see the weather it's landing into.",
  },
  {
    icon: Satellite,
    title: "Satellites overhead",
    desc: "Live satellite positions, including the ISS, crossing the same globe — so you can see what's passing over any place on Earth right now.",
  },
  {
    icon: CloudLightning,
    title: "Weather, live",
    desc: "Weather systems and severe-weather alerts on the map, in the same view as the cameras underneath them. Watch a storm arrive on a beach cam as it happens.",
  },
  {
    icon: Activity,
    title: "Earthquakes",
    desc: "Fresh seismic activity from the USGS feed, sized by magnitude. When a quake makes the news, look at the cameras near the epicenter.",
  },
  {
    icon: Flame,
    title: "Wildfires",
    desc: "Active fire detections from NASA FIRMS satellite data, mapped as they are spotted from orbit — alongside the ground cameras that show the smoke.",
  },
];

const FAQS = [
  {
    q: "What is a god's eye view?",
    a: "In film, a god's eye view is a shot taken from directly overhead — an omniscient angle that sees everything at once. Applied to Earth, it means the whole planet in a single view: every layer of live activity — cameras, aircraft, satellites, weather, earthquakes, fires — visible together instead of one feed at a time. WorldEye is that idea as a working website: one interactive 3D globe carrying the live planet.",
  },
  {
    q: "Is WorldEye's god's eye view free?",
    a: "Yes. The globe, live cameras, flights, satellites, transit, weather, earthquakes and wildfires are free with no account and no signup — basic search included. Paid plans add the rest: Pro unlocks the OSINT toolkit, satellite map view, the live traffic layer, advanced search filters, the AI analyst and the recording studio; VIP Pro adds the maritime and cyber intel layers, camera timelapse and camera alerts on top. Subscriptions fund the infrastructure.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. WorldEye runs entirely in the browser on phone, tablet or desktop. Open the page and the live globe is there — nothing to download, no API keys to configure, no setup.",
  },
  {
    q: "How is this different from the open-source project called God's Eye View?",
    a: "God's Eye View is an open-source project you install and run yourself — powerful, and a great build-it-yourself option; its photorealistic 3D tiles need a Cesium ion token or your own Google Maps API key. WorldEye is an independent hosted alternative built on the same idea — a separate product, not affiliated with the project — already running, free in the browser, with a much larger camera network (74,229 feeds vs the project's roughly 4,000-camera CCTV mesh). We compare the options honestly on our God's Eye View alternatives page.",
  },
  {
    q: "Where does the live data come from?",
    a: "Public feeds published openly by their operators and agencies: ADS-B aircraft broadcasts, USGS earthquake data, NASA FIRMS fire detections, public weather services, and tens of thousands of public cameras run by transport agencies, cities, resorts and businesses. WorldEye aggregates and maps them on one globe.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "God's Eye View of Earth, Live — WorldEye",
      description:
        "WorldEye is a live god's eye view of Earth: 74,229 public cameras, live flights, satellites, weather, earthquakes and wildfires on one 3D globe — free, no signup.",
      url: "https://worldeye.app/gods-eye-view",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/gods-eye-view",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function GodsEyeViewPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#00E5FF]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#D4AF37]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Eye className="w-3.5 h-3.5" /> THE WHOLE PLANET, LIVE
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            A god&apos;s eye view of Earth. <span className="text-[#00E5FF]">Live.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye puts the whole living planet in one view: 74,229 public
            cameras, live flights, satellites, weather, earthquakes and
            wildfires on a single interactive 3D globe — free, in your browser,
            with nothing to install.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/?utm_source=gods-eye-view&utm_medium=hero"
              className="inline-block w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open the live globe — free
            </Link>
            <Link
              href="/pricing"
              className="inline-block w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/20 text-white/85 font-bold text-lg tracking-wide hover:bg-white/5 hover:border-[#D4AF37]/40 transition"
            >
              See plans
            </Link>
          </div>
          <p className="mt-4 text-xs tracking-wide text-white/40">
            Free in your browser · No signup · Nothing to install
          </p>
        </div>

        {/* Live proof — real cameras from the catalogue, tap to open */}
        <GodsEyeLiveStrip />

        {/* Head-to-head — verified facts only, sources in the copy */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            WorldEye vs <span className="text-[#D4AF37]">God&apos;s Eye View</span>
          </h2>
          <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
            Two different ways to get this view. The open-source project is a
            genuinely good build-it-yourself option; WorldEye is the same idea
            as a hosted website. The honest differences:
          </p>
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
            <table className="w-full table-fixed text-left text-[13px] md:text-sm">
              <thead>
                <tr className="bg-white/[0.04] text-white/90">
                  <th scope="col" className="w-[24%] px-4 py-3.5 font-semibold" />
                  <th scope="col" className="w-[38%] px-4 py-3.5 font-semibold text-[#00E5FF]">
                    WorldEye
                  </th>
                  <th scope="col" className="w-[38%] px-4 py-3.5 font-semibold">
                    God&apos;s Eye View
                  </th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                {[
                  {
                    label: "Live cameras",
                    we: "74,229 public cameras on one globe",
                    gev: "~4,000 public cameras in its CCTV mesh",
                  },
                  {
                    label: "Getting started",
                    we: "Open it in your browser — nothing to install, no setup",
                    gev: "An open-source project you install and run yourself (from GitHub)",
                  },
                  {
                    label: "Account to start",
                    we: "None — the free tier needs no signup",
                    gev: "None — it starts with no account or API keys, on Esri imagery",
                  },
                  {
                    label: "Keys for the extras",
                    we: "Nothing to configure — hosted and ready",
                    gev: "Photorealistic 3D tiles need a Cesium ion token or a Google Maps key; the voice agent needs an OpenAI key",
                  },
                  {
                    label: "Price",
                    we: "Free tier; paid plans from $7.99/week — VIP Pro is $74.99/year",
                    gev: "Free — open source (MIT)",
                  },
                ].map((row) => (
                  <tr key={row.label} className="border-t border-white/10 align-top">
                    <th scope="row" className="px-4 py-3.5 font-semibold text-white/85">
                      {row.label}
                    </th>
                    <td className="px-4 py-3.5">{row.we}</td>
                    <td className="px-4 py-3.5">{row.gev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-white/40 text-xs text-center mt-4">
            Camera count for the project is from its own README. A fuller,
            sourced comparison lives on our{" "}
            <Link href="/alternatives/gods-eye-view" className="text-[#D4AF37] hover:underline">
              God&apos;s Eye View alternatives
            </Link>{" "}
            page.
          </p>
        </div>

        {/* What the term means */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Globe className="w-7 h-7 text-[#D4AF37] shrink-0" />
              What &ldquo;god&apos;s eye view&rdquo; actually means
            </h2>
            <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
              <p>
                Filmmakers use the term for the shot from directly above — the
                omniscient angle that sees the whole scene at once instead of
                one character&apos;s slice of it. For centuries it was a
                metaphor. With live public data, it stopped being one.
              </p>
              <p>
                Right now, thousands of aircraft are broadcasting their
                positions, satellites are crossing every sky, weather systems
                are moving, the ground is trembling somewhere, and tens of
                thousands of public cameras are quietly watching streets,
                beaches and harbors. A god&apos;s eye view of Earth is simply
                all of that, on one screen, at the same moment. That is what
                WorldEye is built to be.
              </p>
            </div>
          </div>
        </div>

        {/* Layers */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Everything happening, <span className="text-[#D4AF37]">one view</span>
          </h2>
          <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
            Each layer is live public data. Together they&apos;re the closest
            thing to watching the planet breathe.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {LAYERS.map((d) => (
              <div
                key={d.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <d.icon className="w-6 h-6 text-[#00E5FF] mb-4" />
                <p className="font-semibold text-white/90 text-lg mb-2">{d.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            No setup. <span className="text-[#D4AF37]">Just look.</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              There is no account to create, no software to install and no API
              key to configure. Open WorldEye and the globe is already live:
              spin it, zoom into a continent, toggle the layers you care
              about, and click anything — a plane, a satellite, a camera — to
              see it up close.
            </p>
            <p>
              The context is the point. A camera is more interesting when you
              can see the storm moving toward it. A flight means more when the
              destination&apos;s weather and runway cameras are in the same
              view. Single-purpose sites show you one feed; the god&apos;s eye
              view shows you the world the feed lives in.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { icon: MousePointerClick, label: "Open the globe", href: "/" },
                { icon: Camera, label: "Browse 74,229 cameras", href: "/cameras" },
                { icon: Layers, label: "All features", href: "/features" },
              ].map((c) => (
                <Link
                  key={c.label}
                  href={c.href}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 hover:border-[#D4AF37]/40 transition"
                >
                  <c.icon className="w-4 h-4 text-[#D4AF37]" /> {c.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Five places to start */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Five places to <span className="text-[#D4AF37]">start looking</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              A planet is a lot to take in at once. New visitors tend to fall
              into the god&rsquo;s eye view through a specific place — so
              start with one of these, and let the zooming begin:
            </p>
            <ul className="space-y-3 list-none">
              <li>
                <strong className="text-white/85">A Tokyo street at night.</strong>{" "}
                Search Tokyo and open a camera in the Kabukicho district —
                neon, crowds and crossings, live. Then pull back and notice
                how much of the city the camera grid covers.
              </li>
              <li>
                <strong className="text-white/85">A highway over the ocean.</strong>{" "}
                The Florida Keys&rsquo; US-1 runs bridge to bridge over open
                water, and its cameras (Mile Marker 70 is a favorite) show
                weather and traffic in the middle of the sea.
              </li>
              <li>
                <strong className="text-white/85">A mountain pass in a storm.</strong>{" "}
                Utah&rsquo;s SR-210 up Little Cottonwood Canyon — the road to
                Alta and Snowbird — is ringed with cameras. In winter, it is
                the difference between guessing about avalanche country and
                seeing it.
              </li>
              <li>
                <strong className="text-white/85">Whatever is overhead.</strong>{" "}
                Turn on the satellite layer and find the International Space
                Station. It circles the whole planet every 93 minutes — from
                the god&rsquo;s eye view, you can watch it cross your own sky
                and then find the cameras underneath its path.
              </li>
              <li>
                <strong className="text-white/85">Your own street.</strong>{" "}
                The most quietly radical view: zoom to where you live. If a
                public camera covers your commute, your beach or your pass,
                the abstract idea of a live planet becomes personal very
                quickly.
              </li>
            </ul>
          </div>
        </div>

        {/* What it can't do */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            What the god&apos;s eye view <span className="text-[#D4AF37]">can&rsquo;t do</span>
          </h2>
          <div className="space-y-4 text-white/60 leading-relaxed">
            <p>
              The honest limits matter as much as the spectacle. The view is
              assembled from public data: cameras see only where their
              operators point them, flights appear only when they broadcast,
              and whole categories of the world — private land, unlit ocean,
              anywhere without a published feed — stay dark. Resolution is
              what the public feeds offer, not the zoom-forever fantasy of
              film: you watch a street, not a license plate; a harbor, not a
              face.
            </p>
            <p>
              And the freshness varies by layer — a camera frame may be
              seconds old, a satellite position a calculation from orbital
              elements, a modeled effect clearly labeled as simulated. The
              god&rsquo;s eye view is not omniscience. It is something more
              useful in practice: the real, checkable, public picture of the
              planet&rsquo;s moving parts, honest about its edges.
            </p>
          </div>
        </div>

        {/* Direct answers (AEO) */}
        <DirectAnswers
          className="mt-20 max-w-3xl mx-auto"
          headingClassName="text-xl md:text-2xl font-bold leading-snug"
          items={[
            {
              q: "What's the difference between WorldEye and God's Eye View?",
              a: "God's Eye View is free open-source software you install and run yourself, with roughly 4,000 cameras; WorldEye is the same idea as a hosted website with 74,229 cameras. The two are independent projects. God's Eye View starts with no API key — keys are only needed for its photorealistic 3D tiles and voice agent — while WorldEye needs no install, no key and no setup at all.",
            },
            {
              q: "Do I need an API key to use a god's eye view?",
              a: "No — WorldEye needs no API key, no install and no setup; you open the website and the live globe is already running. The open-source God's Eye View also starts keyless — its keys are only for the optional photorealistic tiles and voice agent.",
            },
            {
              q: "What can I see in a god's eye view of Earth?",
              a: "On one WorldEye globe you can see 74,229 live cameras, flights, satellites, ships, weather radar, earthquakes and wildfires, all updating in real time. Every layer sits on the same 3D Earth, so a storm, the cameras underneath it and the flights rerouting around it share a single view.",
            },
          ]}
        />

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            God&apos;s eye view <span className="text-[#D4AF37]">FAQ</span>
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden group"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none">
                  <span className="font-medium text-white/90">{f.q}</span>
                  <ChevronDown className="w-5 h-5 text-[#D4AF37] shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-5 text-sm text-white/60 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Free trials — plan facts from the billing config, guarantee verbatim */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            The globe is free. <span className="text-[#D4AF37]">The locked layers aren&apos;t.</span>
          </h2>
          <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
            Everything above is free with no signup. Paid plans unlock the
            intelligence toolkit, intel layers, timelapse, camera alerts and
            the recording studio — and every plan starts with a free trial.
            We email you before your trial&apos;s first charge.
          </p>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {TRIAL_PLAN_OPTIONS.map((p) => (
              <div
                key={p.plan}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center"
              >
                <p className="text-xs font-semibold tracking-[0.25em] text-[#00E5FF]">
                  {p.trialLabel.toUpperCase()}
                </p>
                <p className="font-display text-xl font-semibold mt-3">{p.name}</p>
                <p className="mt-2">
                  <span className="font-mono text-3xl font-bold">{p.price}</span>
                  <span className="text-white/50 text-sm">{p.per}</span>
                </p>
                <p className="text-xs text-white/40 mt-1">about {p.perDay} a day</p>
                <p className="text-xs text-white/50 mt-3 leading-relaxed">{p.note}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/pricing"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Compare plans &amp; start a free trial
            </Link>
            <p className="mt-5 inline-flex items-start sm:items-center gap-2 text-sm text-white/50 max-w-xl">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]/80 shrink-0 mt-0.5 sm:mt-0" />
              Covered by a 7-day money-back guarantee on your first charge — email us
              within 7 days of the charge for a full refund, no questions asked.
            </p>
          </div>
        </div>

        {/* Closing CTA */}
        <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10">
          <h2 className="text-2xl md:text-3xl font-bold">
            See the whole planet <span className="text-[#D4AF37]">at once</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            One globe. Every live layer. Zero signup.
          </p>
          <Link
            href="/?utm_source=gods-eye-view&utm_medium=closing"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open WorldEye
          </Link>
          <p className="mt-6 text-sm text-white/40">
            Comparing options? See the{" "}
            <Link href="/alternatives/gods-eye-view" className="text-[#D4AF37] hover:underline">
              God&apos;s Eye View alternatives
            </Link>{" "}
            page.
          </p>
        </div>

        <RelatedLinks
          links={[
            {
              label: "God's Eye View alternatives",
              desc: "Want the self-hosted open-source project instead? The honest comparison of every way to get this view.",
              href: "/alternatives/gods-eye-view",
            },
            {
              label: "Live cameras",
              desc: "The full camera directory — 74,229 live public cameras in 105 countries.",
              href: "/cameras",
            },
            {
              label: "An EarthCam alternative",
              desc: "How WorldEye's aggregated camera globe compares with the classic webcam network.",
              href: "/earthcam-alternative",
            },
            {
              label: "Features",
              desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
              href: "/features",
            },
          ]}
        />
      </div>

      <GodsEyeStickyCta />
      <SiteFooter />
    </main>
  );
}
