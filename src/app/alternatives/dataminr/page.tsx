import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  Globe,
  Eye,
  BellRing,
  Database,
  ShieldCheck,
  Radio,
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
  title: "Dataminr Alternatives for Everyone",
  description:
    "Dataminr alternatives compared honestly: WorldEye's visual monitoring, GDELT's free event data, Crisis24 and more — for non-enterprise budgets.",
  alternates: { canonical: "/alternatives/dataminr" },
  openGraph: {
    title: "Dataminr Alternatives for Everyone | WorldEye",
    description:
      "No enterprise budget? Compare accessible Dataminr alternatives — WorldEye, GDELT, Crisis24 and more — with honest limits.",
    url: "/alternatives/dataminr",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Dataminr Alternatives for Everyone | WorldEye",
    description:
      "Accessible Dataminr alternatives compared: WorldEye, GDELT, Crisis24 and more.",
  },
};

const OPTIONS = [
  {
    icon: Eye,
    name: "WorldEye",
    tag: "Best accessible visual alternative",
    href: "/compare/dataminr",
    body: "A free live 3D globe — no signup — for visual event monitoring: live news and conflict feeds on Pro, plus free layers showing flights, satellites, ships, weather, quakes and ~76,000 cameras. The pick when you want to watch events unfold yourself rather than receive enterprise alerts.",
  },
  {
    icon: Database,
    name: "GDELT Project",
    tag: "Best free event data",
    href: "/compare/gdelt",
    body: "Monitors global news in 100+ languages and publishes massive free event datasets, updated every 15 minutes. The closest free equivalent to Dataminr's data firehose — but you supply the analysis, the alerting logic, and the engineering.",
  },
  {
    icon: ShieldCheck,
    name: "Crisis24",
    tag: "Best enterprise-grade alternative",
    href: "/compare/crisis24",
    body: "Vetted risk-intelligence alerts with global coverage and duty-of-care tooling. The honest enterprise alternative to Dataminr for organizations — with enterprise pricing to match.",
  },
  {
    icon: BellRing,
    name: "Recorded Future",
    tag: "Best for cyber threat intelligence",
    href: "/compare/recorded-future",
    body: "Intelligence platform with strong cyber threat coverage and real-time collection. Overlaps with Dataminr on the security side; like Dataminr, it's built and priced for organizations, not individuals.",
  },
  {
    icon: Radio,
    name: "EMSC / USGS feeds",
    tag: "Best free disaster alerting",
    href: "/best-geopolitical-monitoring-tools",
    body: "The European-Mediterranean Seismological Centre and USGS publish free, authoritative earthquake alerts within minutes. Narrow scope — earthquakes only — but faster and more reliable than any general tool for that one job.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "Dataminr Alternatives for Everyone",
      "Dataminr alternatives compared honestly: WorldEye's visual monitoring, GDELT's free event data, Crisis24 and more.",
      "/alternatives/dataminr"
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

export default function DataminrAlternativesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: "Dataminr Alternatives" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Zap className="w-3.5 h-3.5" /> ALTERNATIVES
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          Dataminr alternatives <span className="text-[#0096FF]">without the enterprise contract.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Dataminr does real-time AI event detection at enterprise scale — and
          nothing free truly replicates that. But if you&apos;re an individual,
          journalist, or small team, you don&apos;t need a replica: WorldEye
          gives you visual event monitoring on a free 3D globe, and GDELT gives
          you the raw event data firehose for free. Here&apos;s the honest map
          of your options.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What Dataminr is */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What does Dataminr actually do?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Dataminr is an AI platform that detects breaking events — natural
            disasters, attacks, cyber incidents, market-moving news — in
            real time from public data sources, and pushes alerts to enterprise
            clients: newsrooms, corporations, governments, and financial
            firms. Its value proposition is speed plus relevance filtering at
            a scale no human team can match.
          </p>
          <p>
            That last clause is doing the heavy lifting. Real-time detection,
            deduplication, geolocation, and severity scoring across the entire
            public internet is genuinely hard infrastructure — which is why
            Dataminr is sold as an enterprise platform with enterprise
            pricing, not as a consumer app. Anyone promising you
            &ldquo;Dataminr for free&rdquo; is selling something else with a
            familiar label.
          </p>
        </div>
      </section>

      {/* Honest framing */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-[#0096FF] shrink-0" />
          The honest answer about &ldquo;free Dataminr&rdquo;
        </h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            There is no free tool that does what Dataminr does — AI-detected,
            scored, and routed real-time alerts at enterprise reliability.
            Anyone claiming otherwise is redefining the job. But most people
            searching for an alternative don&apos;t actually need the whole
            enterprise stack. They need one of three things: to <em>see</em>
            events unfolding, to <em>get</em> event data they can analyze, or
            to <em>receive</em> vetted alerts for a specific risk.
          </p>
          <p>
            WorldEye covers the first: a free visual monitoring globe where you
            watch events in context — news, flights, satellites, cameras — with
            your own eyes and judgment. GDELT covers the second: free
            machine-readable event data at global scale. Crisis24 and Recorded
            Future cover the third for organizations with budgets. Match the
            tool to the actual need and you stop overpaying for detection you
            never use.
          </p>
        </div>
      </section>

      {/* The options */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Five Dataminr alternatives, <span className="text-[#0096FF]">compared honestly</span>
        </h2>
        <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
          Sorted by accessibility — with the limits of each stated plainly,
          because a useful alternative is an honest one.
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
        heading="Monitor events visually — free, no signup"
        body="WorldEye puts live news, flights, satellites, weather and cameras on one globe. No enterprise contract, no sales call."
      />

      {/* Visual monitoring */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What visual monitoring gives you that alerts don&apos;t</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Alert platforms optimize for speed of notification. Visual
            monitoring optimizes for speed of <em>understanding</em>. When an
            alert says &ldquo;explosion reported in port city,&rdquo; the next
            ten minutes are spent building a picture: where exactly, what&apos;s
            around it, what&apos;s moving nearby. On WorldEye that picture is
            the starting point — the port, the ships in it, the aircraft
            overhead, the weather, a camera on the ground — all on one screen
            before you&apos;ve opened a second tab.
          </p>
          <p>
            For journalists verifying a report, OSINT practitioners building a
            picture, or the simply curious, that visual context often answers
            the alert&apos;s follow-up questions faster than another text
            update. Pro adds the AI analyst assistant to summarize what
            you&apos;re seeing, plus premium intel feeds (cyber, GDELT,
            maritime, conflict, live news) for structured depth behind the
            visuals.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: Globe, label: "The live globe", href: "/" },
              { icon: Eye, label: "All features", href: "/features" },
              { icon: BellRing, label: "Pro intel feeds", href: "/pricing" },
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

      {/* GDELT path */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">The DIY path: GDELT plus your own analysis</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            If what you actually want from Dataminr is the data — a
            machine-readable stream of world events — GDELT is the remarkable
            free answer. It monitors broadcast, print and web news in over 100
            languages, codes events, and publishes the results every 15
            minutes as open datasets you can query with BigQuery or download
            outright.
          </p>
          <p>
            The trade is effort: GDELT gives you the firehose, not the filter.
            Building detection, deduplication and alerting on top of it is a
            real engineering project. For analysts and developers it&apos;s a
            gift; for everyone else, visual monitoring on WorldEye gets you
            situational awareness today with zero setup.
          </p>
        </div>
      </section>

      {/* How to choose */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Which Dataminr alternative fits you?</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            {
              q: "Individual or small team?",
              a: "Start with WorldEye's free globe for visual monitoring and GDELT for data. You get 90% of the awareness at 0% of the enterprise cost.",
            },
            {
              q: "Need vetted alerts for staff safety?",
              a: "That's a duty-of-care job — Crisis24 is built for it. Free tools don't carry that responsibility.",
            },
            {
              q: "Cyber-focused security team?",
              a: "Recorded Future overlaps Dataminr on threat intel. WorldEye Pro's cyber feed is a complement, not a replacement.",
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
        <h2 className="text-2xl md:text-3xl font-bold">Dataminr alternative questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is there a free version of Dataminr?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No. Dataminr is an enterprise platform with enterprise pricing.
              The free alternatives in this guide don&apos;t replicate its
              AI alerting pipeline — they cover the underlying needs
              differently: visual monitoring (WorldEye), open event data
              (GDELT), or single-purpose free alerts (USGS, EMSC).
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Can WorldEye replace Dataminr for a newsroom?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              For breaking-news verification and visual context, WorldEye is a
              strong complement — reporters can see the location behind the
              report instantly. For automated real-time alerting across every
              beat, newsrooms still use dedicated detection platforms. Many
              desks would use both.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">What does WorldEye Pro add for event monitoring?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Pro adds premium intel feeds (cyber, GDELT, maritime, conflict,
              live news), the AI analyst assistant, high-resolution satellite
              imagery, global search and the OSINT toolkit. Weekly $3.99,
              monthly $9.99, annual $59.99 — the free globe stays free.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          Enterprise awareness, <span className="text-[#0096FF]">minus the enterprise.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Start with the free globe. Add Pro intel feeds when you need them.
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
          <Link href="/compare/dataminr" className="text-[#0096FF] hover:underline">
            WorldEye vs Dataminr
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "WorldEye vs Dataminr",
            desc: "The detailed head-to-head comparison on the compare hub.",
            href: "/compare/dataminr",
          },
          {
            label: "Best global intelligence dashboards",
            desc: "Ranked dashboards for planet-scale situational awareness.",
            href: "/best-global-intelligence-dashboards",
          },
          {
            label: "Features",
            desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
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
