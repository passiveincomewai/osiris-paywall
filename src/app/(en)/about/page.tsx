import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowLeft, Globe, Eye, ShieldCheck, Users, Code2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";
import { ORGANIZATION_ID, WEBSITE_ID } from "@/lib/seo/entity-schema";

export const metadata: Metadata = {
  title: "About WorldEye — Open Planetary Intelligence for Everyone",
  description:
    "WorldEye is a free live 3D globe: flights, satellites, transit, weather, quakes and 74,229 public cameras with no signup. Pro adds the OI AI assistant and intel tools.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About WorldEye",
    description:
      "A live 3D globe of the planet. Free forever, no signup — Pro unlocks intelligence-grade tools.",
    type: "website",
    url: "/about",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About WorldEye",
  description:
    "WorldEye is a free live 3D globe of the planet — flights, satellites, weather, earthquakes, wildfires and 74,229 public cameras with no signup.",
  url: "https://worldeye.app/about",
  isPartOf: { "@id": WEBSITE_ID },
  about: { "@id": ORGANIZATION_ID },
};

const PRINCIPLES = [
  {
    icon: Globe,
    title: "The map is free forever",
    body: "The live 3D globe — flights, satellites, weather, earthquakes, wildfires and 74,229 public CCTV cameras — costs nothing and requires no account. That will not change.",
  },
  {
    icon: Eye,
    title: "No signup to look around",
    body: "Open the site and you're in. Accounts exist only for Pro subscribers and affiliates — never as a toll gate in front of the map.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-respecting",
    body: "We don't sell data or run ads. The OI AI assistant runs on WorldEye's built-in AI — no key to bring. If you add your own API key instead, it stays in your browser — we never see it.",
  },
  {
    icon: Code2,
    title: "Built on open source",
    body: "WorldEye is built on open-source mapping technology, forked from an MIT-licensed project. We build on the shoulders of open work and keep the map free in the same spirit.",
  },
];

export default function AboutPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
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
          <img
            src="/worldeye-eye.png"
            alt="WorldEye"
            width={600}
            height={432}
            className="h-14 md:h-16 w-auto mx-auto mb-6"
            style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.45))" }}
          />
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Open planetary <span className="text-[#D4AF37]">intelligence</span>, for everyone.
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye is a live 3D globe of the planet — aircraft in the sky, satellites
            overhead, storms forming, ground shaking, and tens of thousands of public
            cameras streaming. Free to explore, no account required.
          </p>
        </div>

        {/* What it is */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">What WorldEye is</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
            <p>
              A single interactive globe that fuses live data streams into one view:
              commercial and military flight positions, orbital satellite tracking,
              live buses and trains from 15 transit agencies, weather systems,
              earthquake and wildfire activity, street-level photos, rocket launches
              with live countdowns, and roughly 74,229 publicly accessible street
              cameras around the world.
            </p>
            <p>
              The free tier is the whole map — everything listed above, with no signup
              and no paywall, basic search included. A <Link href="/pricing" className="text-[#D4AF37] hover:underline">Pro subscription</Link> adds
              intelligence-grade tools on top: the OI AI assistant (which runs on your
              own OpenAI key), high-resolution satellite imagery view, the live traffic
              layer, advanced search filters, an in-browser OSINT toolkit, a camera
              recording studio with timelapse, and premium intel feeds covering cyber
              threats, GDELT events, maritime tracking and live news.
            </p>
            <p>
              Pro exists for one reason: it funds the servers, data feeds and
              development that keep the free map running.
            </p>
          </div>
        </section>

        {/* By the numbers */}
        <section className="mt-16 md:mt-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { n: "74,229", l: "live public cameras served by the globe" },
              { n: "105", l: "countries with camera coverage" },
              { n: "15", l: "transit agencies streaming live vehicles" },
              { n: "$0", l: "cost to open the map — no account, no card" },
            ].map((s) => (
              <div key={s.l} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#D4AF37]">{s.n}</div>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-sm text-white/40 max-w-2xl mx-auto leading-relaxed">
            The camera figure is the count the globe actually serves, not a
            catalogue total: every feed is playback-verified before it is
            listed, and feeds that stop working are dropped rather than
            padded into the number.
          </p>
        </section>

        {/* Who uses it */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">Who uses WorldEye</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
            <p>
              The audience is anyone whose work — or curiosity — starts with
              the question <em>what is happening there, right now?</em>{" "}
              Journalists verifying a breaking story against live cameras and
              event feeds instead of second-hand clips. Storm watchers and
              emergency-preparedness communities following hurricanes,
              wildfires and earthquakes as they develop. Aviation and space
              enthusiasts tracking flights, the ISS and launches. Educators
              who would rather show a class the live planet than describe it.
              Travelers checking the weather and the crowds at a destination
              before they book. The{" "}
              <Link href="/use-cases" className="text-[#D4AF37] hover:underline">use-case guides</Link>{" "}
              walk through each of these in detail.
            </p>
            <p>
              What they share is a preference for primary sources. A headline
              tells you what someone concluded; a live camera, a flight track
              and a seismic feed let you look for yourself. WorldEye is built
              for that look — and built to be honest about its limits: feeds
              are third-party and public, coverage varies by region, and
              anything modeled rather than measured is labeled on the layer
              itself.
            </p>
          </div>
        </section>

        {/* How it's built */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">How the map is put together</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
            <p>
              WorldEye aggregates what the world already publishes openly:
              state DOT and municipal camera networks, transport agency
              transit feeds, public flight and satellite tracking data,
              government weather, earthquake and wildfire services. The work
              is in the joining — one map, one search, one click — and in the
              verification: every camera feed is playback-checked before it
              is listed, and dead feeds are dropped rather than padded into
              the count. When we say 74,229 cameras, that is the number the
              globe actually serves.
            </p>
            <p>
              The same discipline applies to anything simulated. Where a
              layer is a model rather than a measurement — a visual effect, a
              reconstructed trajectory — the map labels it as such, on the
              layer itself. Live means live; estimated means estimated. It is
              the rule we would want applied to us, so it is the rule we run.
            </p>
          </div>
        </section>

        {/* Principles */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">What we stand by</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {PRINCIPLES.map((p) => (
              <div
                key={p.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <p.icon className="w-7 h-7 text-[#D4AF37] mb-4" />
                <h3 className="font-semibold text-white/90 text-lg">{p.title}</h3>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Users className="w-7 h-7 text-[#D4AF37]" /> A small independent team
          </h2>
          <p className="mt-6 text-white/60 leading-relaxed">
            WorldEye is built and run by a small independent team — no venture
            funding, no ad network, no data brokerage. Revenue comes from Pro
            subscriptions, and every dollar goes back into keeping the free globe
            fast, live and open. If you use the map, share it, or go Pro, you&apos;re
            directly keeping it alive.
          </p>
          <p className="mt-4 text-white/60 leading-relaxed">
            The team works in short cycles and in the open: changes are
            deployed, verified against the live site, and written up in the{" "}
            <Link href="/changelog" className="text-[#D4AF37] hover:underline">changelog</Link>{" "}
            when they ship. Being small is a constraint we lean into — there
            is no growth team optimizing for your attention, no engagement
            metric the map has to feed. The only number we chase is whether
            the planet on your screen is live, accurate and honestly labeled.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">About WorldEye — <span className="text-[#D4AF37]">questions</span></h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white/90">Is WorldEye really free?</h3>
              <p className="text-white/55 leading-relaxed mt-2">
                Yes. The globe, the 74,229 cameras (with 5 free camera opens
                per device), flights, satellites, weather, earthquakes,
                fires, transit and basic search are free with no signup. Pro
                ($7.99/week, $13.99/month, $74.99/year as VIP Pro) adds the
                intelligence toolkit on top — it never puts the map itself
                behind a paywall.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white/90">Where do the cameras come from?</h3>
              <p className="text-white/55 leading-relaxed mt-2">
                Publicly accessible feeds published by state and city
                transport departments, municipalities, resorts, harbors and
                other public operators around the world. WorldEye aggregates
                and verifies them; it does not operate the cameras, and
                individual feeds can go offline at the source.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white/90">Is WorldEye affiliated with God&apos;s Eye View or World Monitor?</h3>
              <p className="text-white/55 leading-relaxed mt-2">
                No. WorldEye is an independent product from an independent
                team. God&apos;s Eye View is an open-source project you
                install yourself (its camera mesh lists roughly 4,000 public
                cameras), and World Monitor is a separate free hosted
                dashboard. We compare ourselves to them honestly on our{" "}
                <Link href="/compare" className="text-[#D4AF37] hover:underline">comparison pages</Link>{" "}
                — and recommend them when they fit better.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white/90">How is WorldEye funded?</h3>
              <p className="text-white/55 leading-relaxed mt-2">
                Pro subscriptions and nothing else — no ads, no data sales,
                no sponsored placements. Subscribers fund the servers and
                data feeds; the affiliate program pays commissions only out
                of real subscription revenue.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white/90">Can I share or embed what I see?</h3>
              <p className="text-white/55 leading-relaxed mt-2">
                Every camera has a share link, so you can send someone
                straight to the exact view. For embedding or partnership
                ideas — resorts, newsrooms, tourism and weather sites — start
                on the <Link href="/contact" className="text-[#D4AF37] hover:underline">contact page</Link>;
                we&apos;ll be straight with you about what exists today.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 md:mt-20">
          <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold">See the planet live.</h2>
            <p className="text-white/55 mt-3 max-w-xl mx-auto">
              Open the globe now — free, no signup. Or unlock the intelligence
              toolkit with Pro.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-white/20 text-white font-semibold hover:bg-white/5 transition"
              >
                <Globe className="w-4 h-4" /> Open the live map
              </Link>
              <Link
                href="/pricing"
                className="inline-block hover:brightness-110 transition"
              >
                <img src="/upgrade-to-pro.png" alt="Upgrade to Pro" width={1072} height={262} className="h-12 w-auto" draggable={false} />
              </Link>
            </div>
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              label: "Features",
              desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
              href: "/features",
            },
            {
              label: "Use cases",
              desc: "What researchers, travelers, storm watchers and educators do with WorldEye.",
              href: "/use-cases",
            },
            {
              label: "FAQ",
              desc: "Is the map free? What does Pro include? Straight answers to common questions.",
              href: "/faq",
            },
            {
              label: "Contact",
              desc: "Questions, feedback, press or partnership ideas — the inbox is open.",
              href: "/contact",
            },
          ]}
        />

        <p className="mt-10 text-center text-sm text-white/40">
          Want the details? Browse the <Link href="/blog" className="text-[#D4AF37] hover:underline">blog</Link>.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
