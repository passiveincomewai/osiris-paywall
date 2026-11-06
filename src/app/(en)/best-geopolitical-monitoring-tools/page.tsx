import type { Metadata } from "next";
import Link from "next/link";
import {
  Landmark,
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
  title: "Best Geopolitical Monitoring Tools 2026",
  description:
    "The best geopolitical monitoring tools for 2026 compared: WorldEye's live globe, Crisis24, ACLED, GDELT and more — free and pro picks.",
  alternates: { canonical: "/best-geopolitical-monitoring-tools" },
  openGraph: {
    title: "Best Geopolitical Monitoring Tools 2026 | WorldEye",
    description:
      "Compare the best tools for tracking geopolitics in 2026 — WorldEye, Crisis24, ACLED, GDELT, Liveuamap and more.",
    url: "/best-geopolitical-monitoring-tools",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Best Geopolitical Monitoring Tools 2026 | WorldEye",
    description:
      "The best geopolitical monitoring tools for 2026 compared — free and pro picks.",
  },
};

const TOOLS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best free visual monitoring",
    href: "/compare/global-threat-watch",
    body: "A free live 3D globe — no signup — for watching geopolitics unfold spatially: live news and conflict feeds on Pro, plus free layers for flights, satellites, ships, weather, earthquakes and 74,229 ground cameras. Best when you need to see the situation, not just read about it — a military buildup, a strait closure, a capital in unrest, all in geographic context.",
  },
  {
    icon: ShieldCheck,
    name: "Crisis24",
    tag: "Best for corporate risk teams",
    href: "/compare/crisis24",
    body: "Integrated risk intelligence with vetted alerts, travel-risk ratings and duty-of-care tooling. The professional standard for organizations with people and assets across borders — priced for organizations, not individuals.",
  },
  {
    icon: Database,
    name: "ACLED",
    tag: "Best for research and analysis",
    href: "/compare/acled",
    body: "Structured, coded conflict-event data used by researchers, journalists and policymakers worldwide. If your monitoring feeds analysis, reports or academic work, ACLED's datasets are the citable foundation — a database first, not a live dashboard.",
  },
  {
    icon: Newspaper,
    name: "GDELT Project",
    tag: "Best free global event data",
    href: "/compare/gdelt",
    body: "Machine-coded global news events in 100+ languages, updated every 15 minutes and free to query. Unmatched for quantitative geopolitics — tracking how event intensity shifts across regions — though it demands data skills.",
  },
  {
    icon: MapIcon,
    name: "Liveuamap",
    tag: "Best free conflict news map",
    href: "/compare/liveuamap",
    body: "Live conflict and crisis reports pinned to a world map. The fastest free read on where things are happening right now — report-driven, so pair it with visual verification for the full picture.",
  },
  {
    icon: FileText,
    name: "Recorded Future",
    tag: "Best for intelligence teams",
    href: "/compare/recorded-future",
    body: "Threat-intelligence platform with real-time collection across cyber, geopolitical and physical risk. Built for dedicated intel teams with the budget to match — the enterprise end of this list.",
  },
  {
    icon: Satellite,
    name: "International Crisis Group",
    tag: "Best for expert analysis",
    href: "/best-conflict-monitoring-tools",
    body: "Field-based research and policy analysis on conflicts worldwide. Not a monitoring tool at all — included because monitoring without understanding is just noise, and Crisis Group's reporting is the understanding layer many professionals pair with live tools.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the best free tool for tracking world events?",
    a: "For visual, real-time awareness: WorldEye's free globe. For conflict news: Liveuamap. For data: GDELT. There's no single best — the strongest free setup combines all three, since they cover signals, reporting, and data respectively.",
  },
  {
    q: "Do professionals use free monitoring tools?",
    a: "Constantly — as complements. Analysts at well-funded organizations still keep free visual tools and open datasets open alongside their enterprise platforms, because no single feed sees everything. The enterprise tools buy alerting and accountability; the free tools buy breadth and speed of orientation.",
  },
  {
    q: "How do I verify something I see on a monitoring tool?",
    a: "Triangulate: check the same claim across a news map, a dataset like GDELT or ACLED, and visual evidence — satellite imagery, flight and ship positions, ground cameras on WorldEye. One source is a rumor; three independent sources are the beginning of confidence.",
  },
  {
    q: "What are the best apps for tracking global geopolitical events in real time?",
    a: "The honest answer splits by job. For seeing events as they happen, a live visual layer: WorldEye's free globe puts live cameras, flights, ships and conflict feeds on one map. For report-driven updates, Liveuamap pins conflict news to a map as it breaks. For the numbers underneath, GDELT codes global news events every 15 minutes. Analysts who track events professionally usually run all three kinds at once — visual, report and data.",
  },
  {
    q: "What are the top platforms for monitoring global political shifts?",
    a: "At the free end: WorldEye for live visual monitoring, Liveuamap for conflict reporting, and GDELT for quantitative event data — the stack this page recommends. At the enterprise end, Crisis24 and Recorded Future add vetted alerting and duty-of-care services for organizations, priced accordingly. Political shifts show up first as signals — a protest on a city camera, a spike in event data — and the platforms differ in which signals they surface.",
  },
  {
    q: "What's the best mapping tool for geo-journalism?",
    a: "Geo-journalism lives or dies on verification, so the mapping tool has to pair the map with evidence. WorldEye's globe puts live cameras, flight and ship tracks and a satellite view on one map, and its free Photo Geolocation tool works out where a photo was taken from its metadata and scene clues, showing the evidence for and against each candidate. Pair those with GDELT or ACLED for the event record, and a claim can be checked against the ground, the data and the image itself.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "Best Geopolitical Monitoring Tools 2026",
      "The best geopolitical monitoring tools for 2026 compared: WorldEye's live globe, Crisis24, ACLED, GDELT and more.",
      "/best-geopolitical-monitoring-tools"
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

export default function BestGeopoliticalMonitoringToolsPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Best tools", href: "/compare" },
          { label: "Best Geopolitical Monitoring Tools" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Landmark className="w-3.5 h-3.5" /> RANKED GUIDE
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          The best geopolitical monitoring tools <span className="text-[#0096FF]">for 2026.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          From WorldEye&apos;s free live globe to Crisis24&apos;s enterprise
          alerting and ACLED&apos;s research datasets — the tools that actually
          help you track a fast-moving world, compared by what each one is
          genuinely best at. No sponsored placements, no invented scores.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What monitoring means */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What does geopolitical monitoring actually involve?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Geopolitics doesn&apos;t happen in articles — it happens in places.
            A strait closure is ships stopping. A military buildup is aircraft
            and satellites repositioning. Unrest in a capital is streets you
            can see on a camera. Effective monitoring means watching those
            physical signals alongside the reporting, because the reporting
            tells you what&apos;s claimed and the signals tell you
            what&apos;s real.
          </p>
          <p>
            That&apos;s why this list mixes formats: visual globes, alert
            platforms, structured datasets, news maps, and expert analysis.
            Nobody serious monitors geopolitics with one tool — the craft is
            triangulation. The ranking below is organized by the job each tool
            does best, so you can build your own stack.
          </p>
        </div>
      </section>

      {/* The ranked list */}
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
        heading="Watch geopolitics happen — free, no signup"
        body="WorldEye's live globe puts news, flights, satellites, ships and cameras on one screen. Start monitoring in thirty seconds."
      />

      {/* Signals vs reporting */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Signals vs. reporting: why you need both</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Every tool on this list sits somewhere on a spectrum from
            <strong className="text-white/85"> signals</strong> (what&apos;s
            physically observable: ships, planes, satellites, cameras) to
            <strong className="text-white/85"> reporting</strong> (what&apos;s
            claimed: news, alerts, analysis). Beginners tend to live entirely
            in reporting. Professionals triangulate.
          </p>
          <p>
            The pattern that works: let reporting tell you <em>where to
            look</em> — a Liveuamap pin, a Crisis24 alert, a GDELT spike —
            then let signals tell you <em>what&apos;s actually there</em>.
            WorldEye exists for the second half: when the alert fires, the
            globe is already showing you the strait, the airspace, the
            weather, and the ground. That two-step is the whole discipline in
            miniature.
          </p>
        </div>
      </section>

      {/* Free stack */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What&apos;s the best free geopolitical monitoring stack?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            For zero budget, the combination that covers the most ground:
            WorldEye for live visual monitoring, Liveuamap for conflict news
            pins, GDELT for quantitative event data, and Crisis Group reporting
            for expert context. Four free tools, four different lenses —
            signals, news, data, analysis — and together they approximate what
            enterprise platforms sell as a bundle.
          </p>
          <p>
            What the free stack can&apos;t do is push vetted alerts to your
            phone at 3 AM or carry duty-of-care responsibility for traveling
            staff. That&apos;s the enterprise line — Crisis24 and Recorded
            Future territory — and it&apos;s priced accordingly.
          </p>
        </div>
      </section>

      {/* Pro features */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold">Where WorldEye&apos;s paid plans fit</h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            The free globe covers visual monitoring completely. Paid plans
            (Lite from $4.99/week; Pro $7.99/week, $13.99/month, $74.99/year)
            add the analyst layer: the AI analyst assistant to summarize
            developing situations and advanced search filters on any paid
            plan; the in-browser OSINT toolkit (Nmap, DNS, WHOIS, SSL) on
            Pro; and, on Ultra, the premium intel feeds spanning cyber,
            GDELT, maritime, conflict and live news. High-resolution
            satellite imagery is free for everyone. It&apos;s the step
            between watching the world and working it.
          </p>
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Geopolitical monitoring questions, answered</h2>
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
          The world won&apos;t wait. <span className="text-[#0096FF]">Neither should your view of it.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Open the live globe — free, no signup — and start monitoring today.
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
          Compare head-to-head:{" "}
          <Link href="/compare" className="text-[#0096FF] hover:underline">
            the WorldEye compare hub
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "Compare hub",
            desc: "Head-to-head WorldEye comparisons across every category.",
            href: "/compare",
          },
          {
            label: "Best conflict monitoring tools",
            desc: "The ranked guide focused specifically on conflict tracking.",
            href: "/best-conflict-monitoring-tools",
          },
          {
            label: "Features",
            desc: "Everything the globe can do — free-to-browse layers and paid-plan intelligence tools.",
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
