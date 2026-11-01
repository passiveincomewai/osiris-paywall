import type { Metadata } from "next";
import Link from "next/link";
import {
  Flame,
  Globe,
  Map as MapIcon,
  Database,
  ShieldCheck,
  Newspaper,
  Satellite,
  FileText,
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
  title: "Best Conflict Monitoring Tools 2026",
  description:
    "The best conflict monitoring tools for 2026: Liveuamap, DeepStateMap, ACLED, WorldEye's live globe and more — compared honestly.",
  alternates: { canonical: "/best-conflict-monitoring-tools" },
  openGraph: {
    title: "Best Conflict Monitoring Tools 2026 | WorldEye",
    description:
      "Compare conflict monitoring tools for 2026 — Liveuamap, DeepStateMap, ACLED, WorldEye, Crisis24 and more.",
    url: "/best-conflict-monitoring-tools",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Best Conflict Monitoring Tools 2026 | WorldEye",
    description:
      "The best conflict monitoring tools for 2026 compared — free and pro picks.",
  },
};

const TOOLS = [
  {
    icon: MapIcon,
    name: "Liveuamap",
    tag: "Best free conflict news map",
    href: "/compare/liveuamap",
    body: "Live conflict and crisis reports pinned to a world map — the fastest free read on where things are happening. Report-driven and genuinely good at it; pair with visual verification for the full picture.",
  },
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best for visual conflict context",
    href: "/compare/liveuamap",
    body: "A free live 3D globe — no signup — for seeing conflicts in context: live news and conflict feeds on Pro, plus free layers showing flights, satellites, ships, weather and 74,229 ground cameras. When a report breaks, look at the location from orbit, from the air, and from the street — on one screen.",
  },
  {
    icon: Flame,
    name: "DeepStateMap",
    tag: "Best for Ukraine frontline tracking",
    href: "/compare/deepstatemap",
    body: "Open-source interactive map of the Russo-Ukrainian war with frequently updated frontline positions. The specialist pick for that conflict — unmatched depth there, single-conflict scope by design.",
  },
  {
    icon: Database,
    name: "ACLED",
    tag: "Best for research and verification",
    href: "/compare/acled",
    body: "Structured, coded conflict-event data trusted by researchers, newsrooms and policymakers. The citable foundation for serious analysis — superb for verification and trends, not a live visual experience.",
  },
  {
    icon: Newspaper,
    name: "GDELT Project",
    tag: "Best free event data at scale",
    href: "/compare/gdelt",
    body: "Machine-coded global news events in 100+ languages, updated every 15 minutes, free to query. Unmatched for quantitative conflict tracking across regions — demands data skills to use well.",
  },
  {
    icon: ShieldCheck,
    name: "Crisis24",
    tag: "Best for professional risk teams",
    href: "/compare/crisis24",
    body: "Vetted conflict and security alerts with travel-risk coverage for organizations. Built for duty-of-care and operational decisions — enterprise pricing for enterprise responsibility.",
  },
  {
    icon: FileText,
    name: "International Crisis Group",
    tag: "Best for understanding, not just watching",
    href: "/best-geopolitical-monitoring-tools",
    body: "Field-based analysis of conflicts worldwide. Not a monitoring tool — included because tracking events without understanding them is just noise, and Crisis Group's reporting is the context layer professionals read.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the best free tool for tracking the Ukraine war?",
    a: "DeepStateMap for frontline positions, Liveuamap for broader reporting, and WorldEye's globe for the visual context around both — flights, satellites, weather, cameras. No single tool covers a war; the combination does.",
  },
  {
    q: "How do I know if a conflict report is real?",
    a: "Triangulate: a second independent report, visual evidence (satellite, flights, ships, cameras), and consistency with the area's recent event pattern in ACLED or GDELT. Be especially careful with dramatic single-source claims — they're the most shared and the least verified.",
  },
  {
    q: "Is it legal to monitor conflicts with these tools?",
    a: "Yes — every tool here works with public information: news, open datasets, broadcast flight and ship positions, public cameras. Watching public data is lawful; the line is unauthorized access and harassment, which none of these tools do or enable.",
  },
  {
    q: "What tools do journalists use to monitor conflict zones?",
    a: "The working set is layered: live camera networks for ground truth, flight and satellite tracking for movement above it, geolocation tools to place photos and video, and event datasets like ACLED and GDELT for the record. Newsrooms combine them — a report is checked against what cameras show, what trackers record and where the imagery was actually taken before it is published.",
  },
  {
    q: "Can I watch live cameras in a conflict zone for free?",
    a: "Where public cameras exist and are safe to publish, yes — they are free to watch on WorldEye's globe, no account needed. Coverage varies a lot by place: some cities have many public feeds, others none, and feeds can go dark when infrastructure fails or operators take them offline.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "Best Conflict Monitoring Tools 2026",
      "The best conflict monitoring tools for 2026: Liveuamap, DeepStateMap, ACLED, WorldEye's live globe and more.",
      "/best-conflict-monitoring-tools"
    ),
    itemListLd(
      TOOLS.map((t) => ({
        name: t.name,
        href: t.href,
        description: `${t.tag}. ${t.body}`,
      }))
    ),
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

export default function BestConflictMonitoringToolsPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Best tools", href: "/compare" },
          { label: "Best Conflict Monitoring Tools" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Flame className="w-3.5 h-3.5" /> RANKED GUIDE
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          The best conflict monitoring tools <span className="text-[#0096FF]">for 2026.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Seven tools compared by what each genuinely does best — from
          Liveuamap&apos;s news pins to WorldEye&apos;s free visual globe to
          ACLED&apos;s research datasets. Because monitoring a conflict well
          means reports <em>and</em> visual evidence <em>and</em> verified
          data, not just one of them.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* The three pillars */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Monitoring a conflict takes three kinds of tools</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            People usually start with one tab — a news map — and wonder why
            they still feel uninformed. That&apos;s because conflict
            awareness has three pillars, and one tool rarely covers more than
            two. <strong className="text-white/85">Reports</strong> tell you
            what&apos;s claimed (news maps, alert feeds).{" "}
            <strong className="text-white/85">Visual evidence</strong> shows
            you what&apos;s observable (satellites, flights, ships, cameras).{" "}
            <strong className="text-white/85">Structured data</strong> lets you
            verify and analyze (ACLED, GDELT datasets).
          </p>
          <p>
            The ranking below is organized around those pillars. The
            practitioners who track conflicts best — journalists, analysts,
            OSINT researchers — run all three at once: reports tell them
            where to look, visuals show them what&apos;s there, data confirms
            the pattern. Build your setup the same way.
          </p>
        </div>
      </section>

      {/* Ranked list */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Seven tools, <span className="text-[#0096FF]">ranked by best-fit</span>
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
        heading="See conflicts in context — free, no signup"
        body="WorldEye's globe puts news, flights, satellites, ships and cameras on one screen. When a report breaks, look at the place itself."
      />

      {/* Visual verification */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Why visual evidence changes conflict monitoring</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            A pin on a news map says &ldquo;explosion reported.&rdquo; A globe
            shows you the port it was reported in, the ships currently in that
            port, the aircraft in the surrounding airspace, the weather over
            the area, and — through public cameras — sometimes the street
            itself. That doesn&apos;t replace reporting; it interrogates it.
            Claims that survive visual cross-checking get stronger. Claims
            that don&apos;t get flagged faster.
          </p>
          <p>
            This is the OSINT discipline applied to breaking news, and
            it&apos;s why visual platforms belong in every conflict watcher&apos;s
            setup. WorldEye exists for exactly this: the free globe is the
            visual-evidence layer, and Pro adds live-news and conflict intel
            feeds, high-res satellite imagery, the AI analyst assistant, and
            the OSINT toolkit for going deeper.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: Satellite, label: "Satellite tracking", href: "/satellite-tracker" },
              { icon: Globe, label: "Live flight tracking", href: "/live-flight-tracker" },
              { icon: MapIcon, label: "Ship tracking", href: "/ship-tracker" },
              { icon: Newspaper, label: "All features", href: "/features" },
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

      {/* Verification workflow */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">A verification workflow that actually works</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            When a conflict report breaks, run it through three checks before
            you trust or share it. <strong className="text-white/85">One:</strong> does
            a second independent source report it — another news map, a
            dataset, a wire? <strong className="text-white/85">Two:</strong> does
            visual evidence support it — satellite imagery, flight or ship
            anomalies, ground cameras on WorldEye? <strong className="text-white/85">Three:</strong> does
            it fit the established pattern — check ACLED or GDELT for the
            area&apos;s recent event history.
          </p>
          <p>
            One source is a rumor. Two independent sources are a lead. Visual
            evidence plus data is the beginning of confidence. In conflict
            zones, where misinformation is a weapon, that discipline isn&apos;t
            optional — it&apos;s the job.
          </p>
        </div>
      </section>

      {/* Free stack */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold">The best free conflict-monitoring stack</h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            Zero budget, full coverage: Liveuamap for breaking conflict
            reports, WorldEye&apos;s free globe for visual verification,
            DeepStateMap for Ukraine frontline detail, GDELT for quantitative
            event data, and Crisis Group for expert context. Five free tools,
            three pillars covered — reports, visuals, data — plus the
            understanding layer.
          </p>
          <p>
            What money buys here is vetted alerting and accountability
            (Crisis24) and deeper analytic tooling (WorldEye Pro&apos;s intel
            feeds and AI analyst at $7.99/week, $13.99/month or $74.99/year).
            Start free; pay when a specific workflow demands it.
          </p>
        </div>
      </section>

      {/* Watching responsibly */}
      <div className="mt-16">
        <h2 className="text-2xl md:text-3xl font-bold">The responsibility that comes with watching</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
          <p>
            Conflict monitoring uses public data, but public does not mean
            consequence-free. Live positions, unit movements and strike
            footage can affect people in the frame, which is why the credible
            end of this field works to norms: verify before amplifying, delay
            rather than broadcast tactical detail, and never treat a
            geolocation as certain until independent evidence agrees. The
            tools above are at their best in the hands of people who hold
            those lines.
          </p>
          <p>
            There is a second, quieter responsibility: your own diet of it.
            A live war on a dashboard is genuinely informative and genuinely
            corrosive in overdose — the researchers and journalists who do
            this professionally schedule their exposure and rotate off the
            graphic feeds. Monitor with a purpose, log off when the purpose
            is served, and let the tools be instruments rather than a
            window you live in front of.
          </p>
        </div>
      </div>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Conflict monitoring questions, answered</h2>
        <div className="mt-8 space-y-8">
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3 className="text-lg font-semibold text-white/90">{f.q}</h3>
              <p className="text-white/55 leading-relaxed mt-2">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          Don&apos;t just read about it. <span className="text-[#0096FF]">See it.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Open the free globe — no signup — and put visual evidence behind every report.
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
          Switching from a news map?{" "}
          <Link href="/alternatives/liveuamap" className="text-[#0096FF] hover:underline">
            See Liveuamap alternatives
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "Liveuamap alternatives",
            desc: "Seven options for moving beyond the news-map format.",
            href: "/alternatives/liveuamap",
          },
          {
            label: "Best geopolitical monitoring tools",
            desc: "The wider ranked guide to tracking a fast-moving world.",
            href: "/best-geopolitical-monitoring-tools",
          },
          {
            label: "Features",
            desc: "Everything the globe can do — free forever layers and Pro intelligence tools.",
            href: "/features",
          },
          {
            label: "Pricing",
            desc: "Weekly $7.99, monthly $13.99, annual $74.99 — the map stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
