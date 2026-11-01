import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  Download,
  Eye,
  KeyRound,
  MousePointerClick,
  Layers,
  Smartphone,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import EmailCaptureCard from "@/components/EmailCaptureCard";
import JsonLd from "@/components/JsonLd";
import DirectAnswers from "@/components/seo/DirectAnswers";
import RelatedLinks from "@/components/RelatedLinks";
import GodsEyeLiveStrip from "@/components/GodsEyeLiveStrip";
import MediaFrame from "@/components/design/MediaFrame";
import TrialCtaSection from "@/components/TrialCtaSection";

export const metadata: Metadata = {
  title: "God's Eye View Online — Free Live Globe, No Install",
  description:
    "The hosted way to get a god's eye view online: 74,229 live cameras, flights and satellites on one 3D globe. Free in your browser — no install, no API keys, no signup.",
  alternates: { canonical: "/gods-eye-view-online" },
  openGraph: {
    title: "God's Eye View Online — Free Live Globe, No Install | WorldEye",
    description:
      "God's Eye View is software you install and run yourself. WorldEye is the independent hosted alternative — the same live globe, open in your browser.",
    url: "/gods-eye-view-online",
    type: "website",
  },
};

const FAQS = [
  {
    q: "Is there a God's Eye View website?",
    a: "Not an official one. God's Eye View is open-source software you install on your own computer — with the Pinokio one-click installer, Docker, or a manual clone — and it then runs locally, in a browser on your own machine. The project does not operate a public hosted version — its team has only waitlisted a future one. WorldEye is an independent hosted alternative: a website anyone can open, built on the same live-globe idea, with no affiliation with the project.",
  },
  {
    q: "Can I use God's Eye View online for free?",
    a: "Yes — through a hosted alternative. WorldEye's globe (cameras, flights, satellites, weather, earthquakes and wildfires) is free to open and browse with no account, and your first 5 camera opens are free too; paid plans remove the camera limits and add the monitoring and intel tools. The original project is also free — it is open source under the MIT licence — but it runs on your own machine, not online.",
  },
  {
    q: "Do I need an API key to use God's Eye View online?",
    a: "Not with WorldEye: no keys, no install, no setup. With the original project you also start with no key at all — keys are upgrades you add yourself. Its photorealistic 3D tiles need a Cesium ion token or your own Google Maps API key, and its voice agent runs on your OpenAI key.",
  },
  {
    q: "Is WorldEye affiliated with God's Eye View?",
    a: "No. God's Eye View is an open-source project created by Bilawal Sidhu. WorldEye is a separate, independent product from a different team. The two share an idea — one live globe of public data — not code, and neither endorses the other.",
  },
  {
    q: "Does God's Eye View work on a phone?",
    a: "The original is an install that runs on your own computer; recent versions adapt its interface to small screens, but it still runs from your own setup. WorldEye is hosted, so it opens directly in a phone or tablet browser — nothing to install first, and nothing to keep updated.",
  },
  {
    q: "What's the difference between installing it and opening it online?",
    a: "Installing gives you the code: you can inspect it, modify it, run everything on your own keys, and use the voice agent no hosted site offers. Opening it online gives you the view with none of the upkeep — no installer, no updates, no keys to manage — and a much larger camera network: 74,229 feeds versus roughly 4,000 in the project's CCTV mesh.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "God's Eye View Online — WorldEye",
      description:
        "WorldEye is the hosted way to get a god's eye view online: 74,229 public cameras, live flights, satellites, weather, earthquakes and wildfires on one 3D globe — free, no install, no API keys.",
      url: "https://worldeye.app/gods-eye-view-online",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/gods-eye-view-online",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const ROUTE_ROWS = [
  {
    label: "Getting started",
    install: "Download and install it yourself — Pinokio one-click, Docker, or clone and run",
    online: "Open worldeye.app in a browser tab",
  },
  {
    label: "Where it runs",
    install: "On your own computer, served locally",
    online: "Hosted — any phone, tablet or desktop browser",
  },
  {
    label: "API keys",
    install:
      "Starts with none; photorealistic 3D tiles need a Cesium ion token or a Google Maps key, and the voice agent needs an OpenAI key",
    online: "None — nothing to configure",
  },
  {
    label: "Live cameras",
    install: "~4,000 public cameras (a shared cap, per its README)",
    online: "74,229 public cameras",
  },
  {
    label: "Keeping it current",
    install: "You update your own install",
    online: "Hosted — always the current version",
  },
  {
    label: "Price",
    install: "Free — open source (MIT); the metered keys are billed to your accounts",
    online: "Free tier with no signup; optional paid plans for the extra tools",
  },
];

export default function GodsEyeViewOnlinePage() {
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
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5 mb-6">
            <Eye className="w-3.5 h-3.5" /> THE LIVE GLOBE, HOSTED
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            God&apos;s Eye View, <span className="text-[#00E5FF]">online.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            The original God&apos;s Eye View is open-source software you
            install and run on your own machine. WorldEye is the same idea as
            a website: one live 3D globe with 74,229 public cameras, flights,
            satellites, weather, earthquakes and wildfires — open in your
            browser, free, with nothing to install and no API keys to set up.
            An independent alternative, not the project&apos;s official site.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/?utm_source=gods-eye-view-online&utm_medium=hero"
              className="inline-block w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open the live globe — free
            </Link>
            <Link
              href="/gods-eye-view"
              className="inline-block w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/20 text-white/85 font-bold text-lg tracking-wide hover:bg-white/5 hover:border-[#D4AF37]/40 transition"
            >
              What is a god&apos;s eye view?
            </Link>
          </div>
          <p className="mt-4 text-xs tracking-wide text-white/40">
            Free in your browser · No signup · Nothing to install · No API keys
          </p>
        </div>

        {/* The network itself — a real capture of the camera index
            over one region (layers panel cropped out). */}
        <div className="mt-12 md:mt-16">
          <MediaFrame
            state="none"
            caption="Camera markers web the road network — one region of the live index"
            source="WorldEye"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/camera-web.jpg"
              alt="Camera markers webbing the road network across Utah and Colorado"
              width={1200}
              height={763}
              loading="lazy"
              className="block w-full h-auto"
            />
          </MediaFrame>
        </div>

        {/* Live proof — real cameras from the catalogue, tap to open */}
        <GodsEyeLiveStrip />

        {/* What the search actually means */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold">
              What &ldquo;God&apos;s Eye View online&rdquo; actually means
            </h2>
            <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
              <p>
                Most people typing this search have just watched the videos —
                a photorealistic globe carrying live planes, ships, satellites
                and thousands of public cameras, all at once — and want to
                open it. Then they land on a GitHub page. God&apos;s Eye View,
                Bilawal Sidhu&apos;s open-source project, is software: you
                install it (a one-click Pinokio installer, Docker, or a manual
                clone), it runs locally on your computer, and its best extras
                — photorealistic 3D tiles, the voice agent — run on API keys
                you supply yourself.
              </p>
              <p>
                There is no official hosted version the public can open —
                the project&apos;s team has only waitlisted a future one — and
                that gap is exactly
                what this page is for. WorldEye runs the same concept as a
                website someone else hosts for you: open the page and the
                globe is already live. It is a separate, independent product —
                not affiliated with the project, and not a copy of its code —
                that trades the workbench for a window.
              </p>
            </div>
          </div>
        </div>

        {/* Two routes, compared */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Install it, or <span className="text-[#D4AF37]">open it online</span>
          </h2>
          <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
            Both routes are legitimate — they just ask different things of
            you. The honest differences:
          </p>
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
            <table className="w-full table-fixed text-left text-[13px] md:text-sm">
              <thead>
                <tr className="bg-white/[0.04] text-white/90">
                  <th scope="col" className="w-[24%] px-4 py-3.5 font-semibold" />
                  <th scope="col" className="w-[38%] px-4 py-3.5 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <Download className="w-4 h-4" /> Install the project
                    </span>
                  </th>
                  <th scope="col" className="w-[38%] px-4 py-3.5 font-semibold text-[#00E5FF]">
                    Open it online — WorldEye
                  </th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                {ROUTE_ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-white/10 align-top">
                    <th scope="row" className="px-4 py-3.5 font-semibold text-white/85">
                      {row.label}
                    </th>
                    <td className="px-4 py-3.5">{row.install}</td>
                    <td className="px-4 py-3.5">{row.online}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-white/40 text-xs text-center mt-4">
            The project&apos;s camera count and key requirements are from its
            own README. A fuller, sourced comparison lives on our{" "}
            <Link href="/alternatives/gods-eye-view" className="text-[#D4AF37] hover:underline">
              God&apos;s Eye View alternatives
            </Link>{" "}
            page.
          </p>
        </div>

        {/* Why people open it online */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Why people open it <span className="text-[#D4AF37]">online</span> instead
          </h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              {
                icon: Smartphone,
                title: "It works on your phone",
                desc: "The install runs on a desktop you own. The hosted globe opens on the phone in your pocket, a tablet, or any computer — the distance from this page to the live planet is one tap.",
              },
              {
                icon: KeyRound,
                title: "No keys to manage",
                desc: "No Cesium ion token, no Google Maps billing account, no OpenAI key, no .env file. The hosted version carries its own infrastructure; you just watch.",
              },
              {
                icon: Camera,
                title: "A much bigger camera network",
                desc: "74,229 live public cameras against roughly 4,000 in the project's CCTV mesh — searchable by country and city, from ski slopes to volcanoes.",
              },
            ].map((d) => (
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
          <div className="mt-8 max-w-3xl mx-auto space-y-4 text-white/60 leading-relaxed">
            <p>
              And the honest counterweight: if you want to{" "}
              <strong className="text-white/85">build</strong>, the install is
              the right call. It is MIT-licensed code you can inspect, fork and
              extend with your own layers; its 30-tool voice agent — flying
              the globe and querying layers by speech — has no hosted
              equivalent; and everything runs on your machine, under your
              control. Plenty of people keep the install for tinkering and
              open WorldEye for watching. Both can be true.
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

        {/* Direct answers (AEO) */}
        <DirectAnswers
          className="mt-20 max-w-3xl mx-auto"
          headingClassName="text-xl md:text-2xl font-bold leading-snug"
          items={[
            {
              q: "Is there a God's Eye View website?",
              a: "God's Eye View itself has no official website version — it is open-source software you install and run locally. WorldEye is an independent hosted alternative: the same kind of live 3D globe, open in any browser at worldeye.app, with 74,229 cameras and no install.",
            },
            {
              q: "How do I open a god's eye view online, for free?",
              a: "Open worldeye.app. The live globe — 74,229 public cameras, flights, satellites, weather, earthquakes and wildfires — loads in the browser free, with no signup and no API key. Free browsing includes your first 5 camera opens.",
            },
            {
              q: "Do I need an API key for God's Eye View online?",
              a: "No. WorldEye needs no API key and nothing installed. API keys belong to the self-installed route: the open-source project starts keyless, and you add your own Cesium ion or Google Maps key only if you want its photorealistic 3D tiles, plus an OpenAI key for its voice agent.",
            },
          ]}
        />

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            God&apos;s Eye View online <span className="text-[#D4AF37]">FAQ</span>
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

        {/* Free trials — the shared TrialCtaSection, facts from the
            billing config, checkout in place. */}
        <TrialCtaSection
          utmSource="gods-eye-view-online"
          blurb="The globe above is free with no signup. Paid plans unlock the intelligence toolkit, intel layers, timelapse, camera alerts and the recording studio — and every plan starts with a free trial. We email you before your trial's first charge."
        />

        {/* Closing CTA */}
        <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10">
          <h2 className="text-2xl md:text-3xl font-bold">
            Skip the install. <span className="text-[#D4AF37]">See the planet.</span>
          </h2>
          <p className="text-white/55 mt-3 mb-8">
            One globe. Every live layer. Zero setup.
          </p>
          <Link
            href="/?utm_source=gods-eye-view-online&utm_medium=closing"
            className="inline-block px-8 py-4 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open WorldEye
          </Link>
          <p className="mt-6 text-sm text-white/40">
            Weighing the routes? See the{" "}
            <Link href="/alternatives/gods-eye-view" className="text-[#D4AF37] hover:underline">
              God&apos;s Eye View alternatives
            </Link>{" "}
            page.
          </p>
        </div>

        <RelatedLinks
          links={[
            {
              label: "A god's eye view of Earth, live",
              desc: "The concept explained — and the live globe that delivers it, free in your browser.",
              href: "/gods-eye-view",
            },
            {
              label: "God's Eye View alternatives",
              desc: "The full honest comparison: the self-hosted project, the hosted options, and which fits you.",
              href: "/alternatives/gods-eye-view",
            },
            {
              label: "God's Eye View vs Google Earth",
              desc: "The live-data globe against the recorded one, head to head.",
              href: "/compare/gods-eye-view-vs-google-earth",
            },
            {
              label: "God's Eye View vs Zoom Earth",
              desc: "Two ways to watch weather and cameras from above, compared.",
              href: "/compare/gods-eye-view-vs-zoom-earth",
            },
          ]}
        />
        {/* Newsletter — end-of-page capture (the one list) */}
        <div className="mt-16 max-w-3xl mx-auto">
          <EmailCaptureCard placement="page" variant="inline" />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
