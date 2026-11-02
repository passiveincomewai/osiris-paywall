import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, X, HelpCircle } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "WorldEye vs OSIRIS (2026): Hosted Globe or Self-Hosted OSINT Platform?",
  description:
    "Compare WorldEye with OSIRIS: hosted 3D globe with 74,229 cameras and premium intel feeds vs the free open-source OSINT dashboard you host yourself. Features, pricing and verdict.",
  alternates: { canonical: "/compare/worldeye-vs-osiris" },
  openGraph: {
    title: "WorldEye vs OSIRIS (2026): Hosted Globe or Self-Hosted OSINT Platform?",
    description:
      "OSIRIS is a free open-source OSINT dashboard you run yourself. WorldEye is the hosted live globe. Verified features, real pricing, honest verdict.",
    type: "article",
    url: "/compare/worldeye-vs-osiris",
  },
  twitter: {
    card: "summary_large_image",
    title: "WorldEye vs OSIRIS (2026)",
    description:
      "Hosted 3D globe vs self-hosted open-source OSINT dashboard — features, pricing and verdict.",
  },
};

type Status = "yes" | "partial" | "no" | "unverified";
type Feature = { label: string; worldEye: Status; competitor: Status; note?: string };

const STATUS_META: Record<Status, { icon: "check" | "minus" | "x" | "help"; label: string; cls: string }> = {
  yes: { icon: "check", label: "Yes", cls: "text-emerald-300" },
  partial: { icon: "minus", label: "Partial", cls: "text-amber-300" },
  no: { icon: "x", label: "No", cls: "text-red-300/70" },
  unverified: { icon: "help", label: "Not verified", cls: "text-white/35" },
};

function StatusCell({ value }: { value: Status }) {
  const m = STATUS_META[value];
  const Icon = m.icon === "check" ? Check : m.icon === "minus" ? Minus : m.icon === "x" ? X : HelpCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 ${m.cls}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs">{m.label}</span>
    </span>
  );
}

const FEATURES: Feature[] = [
  { label: "Hosted — open a URL and it runs", worldEye: "yes", competitor: "partial", note: "OSIRIS is built to self-host (Docker/Node); a live demo is linked from its repo" },
  { label: "Interactive 3D globe", worldEye: "yes", competitor: "partial", note: "OSIRIS is a MapLibre map, 2D-first with terrain views" },
  { label: "Live public cameras", worldEye: "yes", competitor: "yes", note: "WorldEye 74,229 feeds; OSIRIS 17,000+ (project README figures)" },
  { label: "Live flight tracking", worldEye: "yes", competitor: "yes", note: "Both use public ADS-B data (OSIRIS via OpenSky)" },
  { label: "Live satellite tracking", worldEye: "yes", competitor: "yes", note: "OSIRIS uses N2YO + NOAA space-weather data" },
  { label: "Live maritime vessel positions", worldEye: "yes", competitor: "no", note: "OSIRIS maritime is static reference data: 39 ports, 10 chokepoints. WorldEye's maritime intel feed is a Pro layer" },
  { label: "Conflict monitoring", worldEye: "partial", competitor: "partial", note: "WorldEye: live GDELT-powered feeds (Pro). OSIRIS: 13 static conflict zones" },
  { label: "Earthquakes & wildfires", worldEye: "yes", competitor: "yes", note: "Both: USGS seismic + NASA FIRMS fires" },
  { label: "24/7 live news streams", worldEye: "yes", competitor: "yes", note: "WorldEye's live news is a Pro layer; OSIRIS carries 23 broadcasters" },
  { label: "Network recon tools (port scan, DNS, WHOIS, SSL)", worldEye: "partial", competitor: "yes", note: "WorldEye's Pro OSINT toolkit covers lookups; OSIRIS adds vulnerability scanning" },
  { label: "Crypto wallet tracing & sanctions search", worldEye: "no", competitor: "yes", note: "OSIRIS: BTC/ETH tracing + OFAC sanctions search. WorldEye doesn't offer these" },
  { label: "Telegram OSINT", worldEye: "no", competitor: "yes", note: "OSIRIS geoparses posts from public Telegram channels" },
  { label: "AI assistant", worldEye: "yes", competitor: "partial", note: "WorldEye Pro: AI analyst on the site key. OSIRIS: bring your own API key" },
  { label: "Accounts, subscriptions & support", worldEye: "yes", competitor: "no", note: "OSIRIS is community-supported open source" },
  { label: "Open-source code you can fork", worldEye: "no", competitor: "yes", note: "OSIRIS is MIT-licensed" },
];

const FAQS = [
  {
    q: "Is OSIRIS better than WorldEye?",
    a: "It depends on what you need. OSIRIS is the stronger toolkit for a technical user who wants to self-host: deeper recon tooling, crypto tracing, sanctions search and Telegram OSINT, all free and MIT-licensed. WorldEye is the stronger product for actually watching the planet: a hosted 3D globe, live maritime and conflict feeds instead of static reference data, a camera network roughly twice the size, and nothing to install or maintain.",
  },
  {
    q: "Is OSIRIS free?",
    a: "Yes — the code is free and open source (MIT). Running it costs you hosting (your own machine or a server) and any API keys you configure for its AI features. WorldEye's map is also free, with no hosting and no keys; its Pro tier is a paid subscription.",
  },
  {
    q: "Do I need to install OSIRIS?",
    a: "That's the intended way to use it: Docker or Node.js on your own infrastructure. A live demo is linked from the project repository. WorldEye needs no installation at all — it's a hosted website.",
  },
  {
    q: "Which has more live cameras?",
    a: "WorldEye: 74,229 live public feeds across 109 countries, with a browsable directory. OSIRIS's README lists 17,000+ cameras from transport agencies and public webcam networks.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://worldeye.app/" },
        { "@type": "ListItem", position: 2, name: "Compare", item: "https://worldeye.app/compare" },
        { "@type": "ListItem", position: 3, name: "WorldEye vs OSIRIS", item: "https://worldeye.app/compare/worldeye-vs-osiris" },
      ],
    },
    {
      "@type": "WebPage",
      name: "WorldEye vs OSIRIS (2026): Hosted Globe or Self-Hosted OSINT Platform?",
      description:
        "Compare WorldEye with OSIRIS: hosted 3D globe with 74,229 cameras and premium intel feeds vs the free open-source OSINT dashboard you host yourself.",
      url: "https://worldeye.app/compare/worldeye-vs-osiris",
      dateModified: "2026-10-17",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function WorldEyeVsOsirisPage() {
  return (
    <div className="docs-root min-h-screen" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <JsonLd data={jsonLd} />

      <article className="max-w-4xl mx-auto px-6 pt-14 md:pt-20 pb-8">
        <nav aria-label="Breadcrumb" className="text-xs text-white/35 mb-6">
          <Link href="/" className="hover:text-white/70">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-white/70">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-white/60">OSIRIS</span>
        </nav>

        {/* Hero + direct answer */}
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
            WorldEye vs OSIRIS <span className="text-white/40 text-2xl md:text-3xl">(2026)</span>
          </h1>
          <p className="text-white/55 mt-4 max-w-2xl mx-auto leading-relaxed">
            OSIRIS is a free, open-source OSINT dashboard you install and host
            yourself — a genuine &ldquo;Palantir alternative&rdquo; for
            technical users. WorldEye is the same live-planet idea as a hosted
            product: a 3D globe with 74,229 cameras, live flights, satellites
            and intel feeds, open in your browser with nothing to run. If you
            want to watch the world, WorldEye is the faster route; if you want
            to operate your own intel stack, OSIRIS is the real thing.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/" className="px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition">Launch WorldEye Free</Link>
            <Link href="#features" className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition">Compare Features</Link>
          </div>
          <p className="text-xs text-white/30 mt-6">Last reviewed: October 2026 · Sources listed at the bottom of this page</p>
        </header>

        {/* Real interface preview */}
        <figure className="mt-12 max-w-sm mx-auto">
          <img
            src="/seo/worldeye-live-map.webp"
            alt="The actual WorldEye interface: the live public-camera network plotted over the United States"
            width={720}
            height={1280}
            loading="lazy"
            className="rounded-2xl border border-white/10 w-full h-auto"
          />
          <figcaption className="text-xs text-white/35 text-center mt-3">
            The actual WorldEye interface — its live camera network (green
            pins) over the US, captured from worldeye.app.
          </figcaption>
        </figure>

        {/* What OSIRIS is */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">What is OSIRIS?</h2>
          <div className="space-y-4 text-sm text-white/60 leading-relaxed">
            <p>
              OSIRIS — Open Source Intelligence &amp; Reconnaissance Integrated
              System — is an open-source project by simplifaisoul, built with
              Next.js and MapLibre GL. It aggregates live flight tracking
              (OpenSky), a CCTV network its README puts at 17,000+ cameras,
              USGS earthquake monitoring, NASA fire detections, weather events,
              satellite data and 24/7 news streams into a single
              GPU-accelerated dashboard, and adds an analyst&apos;s toolkit:
              network recon (port scanning, DNS, WHOIS, SSL inspection,
              vulnerability scanning), crypto wallet tracing, sanctions
              search and Telegram OSINT.
            </p>
            <p>
              Two scope notes matter for a fair comparison. Its maritime layer
              is static reference data (39 global ports, 10 chokepoints), not
              live vessel tracking, and its conflict layer is 13 static zones.
              And it is software you run: the intended deployment is your own
              Docker or Node instance, with your own API keys for AI features.
            </p>
          </div>
        </section>

        {/* Feature table */}
        <section id="features" className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-2">WorldEye vs OSIRIS: feature comparison</h2>
          <p className="text-sm text-white/45 mb-6">Verified against official sources. &ldquo;Not verified&rdquo; means we couldn&apos;t confirm it — not that it doesn&apos;t exist.</p>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-white/[0.04] text-left">
                  <th scope="col" className="p-4 font-semibold text-white/70">Feature</th>
                  <th scope="col" className="p-4 font-semibold text-[#0096FF]">WorldEye</th>
                  <th scope="col" className="p-4 font-semibold text-white/70">OSIRIS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {FEATURES.map((f) => (
                  <tr key={f.label}>
                    <td className="p-4 text-white/80">{f.label}{f.note && <span className="block text-xs text-white/35 mt-1">{f.note}</span>}</td>
                    <td className="p-4"><StatusCell value={f.worldEye} /></td>
                    <td className="p-4"><StatusCell value={f.competitor} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="font-bold text-white mb-2">Pricing</h3>
            <p className="text-sm text-white/55 leading-relaxed">
              <span className="text-white/80 font-semibold">OSIRIS:</span> free
              and open source (MIT). Your costs are the machine or server you
              run it on, plus your own API keys for AI features.
            </p>
            <p className="text-sm text-white/55 mt-3">
              <span className="text-[#0096FF] font-semibold">WorldEye:</span>{" "}
              the map is free to browse, no signup. Paid tiers run from Lite
              at $4.99/week to Ultra at $24.99/month — Pro is $7.99/week (3-day
              free trial), $13.99/month, or $74.99/year (10-day free trial) —
              and everything runs on our infrastructure and our keys.
            </p>
          </div>
        </section>

        {/* Why WorldEye */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Why choose WorldEye over OSIRIS?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Nothing to install or maintain: the globe is hosted, updated and live the moment you open it — on a phone, not just a workstation.",
              "More than four times the camera network: 74,229 live public feeds across 109 countries, with a directory you can browse by country and city.",
              "Live feeds where OSIRIS carries reference data: real vessel positions and live GDELT-powered conflict/intel feeds instead of static ports and zones.",
              "The AI analyst runs on the site's key — no OpenAI account, no key management, no metered surprises on your own bill.",
            ].map((w, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <Check className="w-5 h-5 text-emerald-300 mb-2" />
                <p className="text-sm text-white/70 leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition">Launch the Globe</Link>
          </div>
        </section>

        {/* Where OSIRIS is stronger */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Where OSIRIS is stronger</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            OSIRIS is the deeper analyst&apos;s toolkit, and it isn&apos;t
            close on its home turf: vulnerability scanning alongside its recon
            lookups, BTC/ETH wallet tracing with OFAC sanctions matching,
            geoparsed Telegram OSINT, and full control of the code and the
            data path because it runs on your machine. It is also free
            forever with no subscription and no account. If your work is
            investigations rather than observation — or your data simply
            can&apos;t leave your own infrastructure — OSIRIS is the right
            choice, and WorldEye won&apos;t pretend otherwise.
          </p>
        </section>

        {/* Verdict */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">The verdict</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#0096FF]/30 bg-[#0096FF]/[0.06] p-6">
              <h3 className="font-bold text-[#7cc4ff] mb-2">Choose WorldEye if…</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                You want the live planet now: a hosted 3D globe with the
                bigger camera network, live maritime and conflict feeds, and
                Ultra intel tools — free to open, no server, no keys, on any
                device.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-bold text-white/80 mb-2">Choose OSIRIS if…</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                You&apos;re a technical analyst who wants to run and extend
                your own OSINT stack — recon, crypto tracing, sanctions and
                Telegram tooling included — and you&apos;re happy operating
                the infrastructure yourself.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">WorldEye vs OSIRIS questions</h2>
          <div className="space-y-8">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-lg font-semibold text-white/90">{f.q}</h3>
                <p className="text-sm text-white/55 leading-relaxed mt-2">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sources */}
        <section className="mt-12">
          <h2 className="text-lg font-bold text-white/70 mb-3">Sources</h2>
          <ul className="text-xs text-white/40 space-y-1.5">
            <li><a href="https://github.com/simplifaisoul/osiris" target="_blank" rel="noopener nofollow" className="hover:text-white/70 underline underline-offset-2">OSIRIS — official GitHub repository and README (checked October 2026)</a></li>
          </ul>
        </section>

        {/* Related */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white mb-4">Related comparisons</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/alternatives/osiris" className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/60 hover:text-white hover:border-[#0096FF]/50 transition">
              OSIRIS alternatives
            </Link>
            <Link href="/compare/world-monitor" className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/60 hover:text-white hover:border-[#0096FF]/50 transition">
              WorldEye vs World Monitor
            </Link>
            <Link href="/alternatives/gods-eye-view" className="px-4 py-2 rounded-full border border-white/15 text-xs text-white/60 hover:text-white hover:border-[#0096FF]/50 transition">
              God&apos;s Eye View alternatives
            </Link>
            <Link href="/compare" className="px-4 py-2 rounded-full border border-[#0096FF]/40 text-xs text-[#7cc4ff] hover:bg-[#0096FF]/10 transition">
              All comparisons →
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-14 rounded-2xl border border-[#0096FF]/25 bg-gradient-to-b from-[#0096FF]/10 to-transparent p-8 text-center">
          <h2 className="text-2xl font-bold text-white">See the difference yourself</h2>
          <p className="text-sm text-white/55 mt-2 mb-6">The live map is free — no signup, no server, no keys. Compare it with OSIRIS in under a minute.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="px-6 py-3 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white font-semibold transition">Launch WorldEye Free</Link>
            <Link href="/pricing" className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition">Unlock WorldEye PRO</Link>
          </div>
        </section>
      </article>

      <SiteFooter />
    </div>
  );
}
