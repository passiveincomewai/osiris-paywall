import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard,
  Globe,
  Database,
  ShieldCheck,
  Zap,
  FileText,
  Map as MapIcon,
  CloudSun,
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
  title: "Best Global Intelligence Dashboards 2026",
  description:
    "The best global intelligence dashboards for 2026: WorldEye's free live globe, Crisis24, Dataminr, GDELT and more — compared honestly.",
  alternates: { canonical: "/best-global-intelligence-dashboards" },
  openGraph: {
    title: "Best Global Intelligence Dashboards 2026 | WorldEye",
    description:
      "Compare the best dashboards for planet-scale awareness — WorldEye, Crisis24, Dataminr, GDELT, Recorded Future and more.",
    url: "/best-global-intelligence-dashboards",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Best Global Intelligence Dashboards 2026 | WorldEye",
    description:
      "The best global intelligence dashboards for 2026 compared — free and pro picks.",
  },
};

const TOOLS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best free visual dashboard",
    href: "/",
    body: "A free live 3D globe — no signup — that works as a planet-scale dashboard: flights, satellites, ships, weather, earthquakes, wildfires and 74,229 public cameras streaming on one screen, with live-news and intel feeds on Pro. Best when your 'dashboard' needs to show the world, not just list events.",
  },
  {
    icon: ShieldCheck,
    name: "Crisis24",
    tag: "Best for organizational risk",
    href: "/compare/crisis24",
    body: "The professional risk-intelligence dashboard: vetted global alerts, travel-risk ratings, and duty-of-care workflows for organizations with people and assets worldwide. Serious capability at enterprise pricing.",
  },
  {
    icon: Zap,
    name: "Dataminr",
    tag: "Best for real-time AI alerting",
    href: "/compare/dataminr",
    body: "AI-driven real-time event detection pushed as alerts to enterprise clients — newsrooms, corporations, governments. The speed benchmark for automated detection; sold as an enterprise platform, not a browsable dashboard.",
  },
  {
    icon: Database,
    name: "GDELT Project",
    tag: "Best free data foundation",
    href: "/compare/gdelt",
    body: "Not a dashboard at all — the open event-data firehose (100+ languages, updated every 15 minutes) that powers many dashboards. Free via BigQuery. If you build or analyze, start here; if you just want to look, pair it with a visual tool.",
  },
  {
    icon: FileText,
    name: "Recorded Future",
    tag: "Best for threat-intel teams",
    href: "/compare/recorded-future",
    body: "Intelligence platform with real-time collection across cyber, geopolitical and brand risk. The dashboard of choice for dedicated threat-intel teams — deep, expensive, and built for professionals.",
  },
  {
    icon: MapIcon,
    name: "Liveuamap",
    tag: "Best free conflict dashboard",
    href: "/compare/liveuamap",
    body: "Live conflict and crisis news on a world map — the closest thing to a free breaking-events dashboard. Report-driven and fast; narrow by design, which is both its strength and its limit.",
  },
  {
    icon: CloudSun,
    name: "Windy",
    tag: "Best for environmental awareness",
    href: "/weather-tracker",
    body: "The most beautiful weather dashboard on the internet — and weather is half of global awareness. Hurricanes, fires, air quality, ocean conditions, all animated. A specialist, but the specialty matters constantly.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "Best Global Intelligence Dashboards 2026",
      "The best global intelligence dashboards for 2026: WorldEye's free live globe, Crisis24, Dataminr, GDELT and more.",
      "/best-global-intelligence-dashboards"
    ),
    itemListLd(
      TOOLS.map((t) => ({
        name: t.name,
        href: t.href,
        description: `${t.tag}. ${t.body}`,
      }))
    ),
  ],
};

export default function BestGlobalIntelligenceDashboardsPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Best tools", href: "/compare" },
          { label: "Best Global Intelligence Dashboards" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <LayoutDashboard className="w-3.5 h-3.5" /> RANKED GUIDE
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          The best global intelligence dashboards <span className="text-[#0096FF]">for 2026.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Seven dashboards for planet-scale situational awareness, compared
          honestly: WorldEye&apos;s free live globe, Crisis24&apos;s
          enterprise risk platform, Dataminr&apos;s AI alerting, GDELT&apos;s
          open data, and more. Different dashboards answer different
          questions — here&apos;s which answers yours.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What a dashboard is */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What makes a dashboard &ldquo;intelligence-grade&rdquo;?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Plenty of sites show world events; few deserve the word
            intelligence. The difference is <em>actionability</em>: can you go
            from &ldquo;something happened&rdquo; to understanding it fast
            enough to act? That requires three things — <strong className="text-white/85">speed</strong> (how
            fast events appear), <strong className="text-white/85">context</strong> (what
            surrounds the event), and <strong className="text-white/85">trust</strong> (how
            verified it is).
          </p>
          <p>
            No single dashboard maximizes all three. AI alert platforms win on
            speed, vetted risk platforms win on trust, and visual globes win
            on context. The professionals reading this already know the
            answer: you stack them. This guide helps you pick each layer of
            the stack deliberately.
          </p>
        </div>
      </section>

      {/* Ranked list */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Seven dashboards, <span className="text-[#0096FF]">ranked by best-fit</span>
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
        heading="Your planet-scale dashboard — free, no signup"
        body="WorldEye streams flights, satellites, ships, weather, quakes, fires and cameras on one live globe. Open it now."
      />

      {/* Build a stack */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">How to build your intelligence stack</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Think in three layers. <strong className="text-white/85">Layer one —
            awareness:</strong> a visual dashboard you keep open, like
            WorldEye&apos;s globe, so you always know the state of the world at
            a glance. <strong className="text-white/85">Layer two — detection:</strong> a
            feed or alert source that tells you when something breaks — GDELT
            data, Liveuamap pins, or an enterprise platform if you have the
            budget. <strong className="text-white/85">Layer three — understanding:</strong> analysis
            you trust, from datasets like ACLED to expert reporting.
          </p>
          <p>
            Most people only build layer two — a stream of alerts with no
            picture around them. That&apos;s backwards. Alerts without context
            are anxiety; alerts with a globe behind them are intelligence.
            Start with the picture, then add the feeds.
          </p>
        </div>
      </section>

      {/* Free vs enterprise */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Free dashboards vs. enterprise platforms</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            The honest dividing line isn&apos;t features — it&apos;s
            accountability. Enterprise platforms (Crisis24, Dataminr, Recorded
            Future) sell vetted alerting with someone responsible behind it:
            duty-of-care for travelers, verified severity scoring, SLA-backed
            delivery. When lives or operations depend on the alert, that&apos;s
            what you&apos;re paying for.
          </p>
          <p>
            Free dashboards (WorldEye, Liveuamap, Windy, GDELT) sell nothing —
            they give you breadth, speed of orientation, and the ability to
            verify with your own eyes. For individuals, journalists, and
            researchers, that&apos;s usually the more useful half of the
            equation. Know which half you need before you pay for either.
          </p>
        </div>
      </section>

      {/* Pro */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold">Where WorldEye Pro fits in the stack</h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            The free globe is the awareness layer. Pro (weekly $7.99, monthly
            $13.99, annual $74.99) strengthens the detection and analysis
            layers: premium intel feeds across cyber, GDELT, maritime,
            conflict and live news; the AI analyst assistant for summarizing
            developing situations; high-resolution satellite imagery;
            advanced search filters; and the in-browser OSINT
            toolkit. One subscription, all three layers on one screen.
          </p>
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Intelligence dashboard questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">What&apos;s the best free intelligence dashboard?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              For visual planet-scale awareness: WorldEye&apos;s free globe —
              no signup, live layers, cameras. For breaking-event awareness:
              Liveuamap. For data: GDELT. The strongest free setup runs all
              three, since awareness, events, and data are different jobs.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Can a free dashboard replace Dataminr or Crisis24?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              For watching and understanding the world, largely yes. For
              automated vetted alerting with organizational accountability —
              duty-of-care, SLA-backed delivery — no. That accountability is
              the product at the enterprise tier, and free tools don&apos;t
              sell it.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">How do I avoid information overload?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Start with one visual dashboard and learn to read it before
              adding feeds. A globe you understand beats five alert streams
              you don&apos;t. Add detection feeds one at a time, and only for
              topics you actually act on.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          One dashboard. <span className="text-[#0096FF]">The whole planet.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Open WorldEye free — no signup — and see what planet-scale awareness feels like.
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
          Building a stack?{" "}
          <Link href="/best-geopolitical-monitoring-tools" className="text-[#0096FF] hover:underline">
            See the geopolitical monitoring guide
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "Best geopolitical monitoring tools",
            desc: "The ranked guide to tracking a fast-moving world.",
            href: "/best-geopolitical-monitoring-tools",
          },
          {
            label: "Compare hub",
            desc: "Head-to-head WorldEye comparisons across every category.",
            href: "/compare",
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
