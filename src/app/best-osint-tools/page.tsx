import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  Globe,
  Network,
  Radar,
  BookOpen,
  Bug,
  AtSign,
  FileSearch,
  Scale,
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
  title: "7 Best OSINT Tools for 2026 (Ranked)",
  description:
    "The 7 best OSINT tools for 2026, ranked with transparent criteria — from WorldEye's free visual toolkit to Maltego, Shodan and SpiderFoot.",
  alternates: { canonical: "/best-osint-tools" },
  openGraph: {
    title: "7 Best OSINT Tools for 2026 (Ranked) | WorldEye",
    description:
      "Ranked OSINT tools with honest criteria: WorldEye, Maltego, Shodan, SpiderFoot, theHarvester, Intelligence X and Bellingcat's toolkit.",
    url: "/best-osint-tools",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "7 Best OSINT Tools for 2026 (Ranked) | WorldEye",
    description:
      "The 7 best OSINT tools for 2026, ranked with transparent criteria and honest strengths.",
  },
};

const CRITERIA = [
  {
    icon: Scale,
    title: "Accessibility",
    body: "Can a motivated beginner get value in an afternoon? Tools with free tiers and gentle learning curves score higher for general use.",
  },
  {
    icon: Radar,
    title: "Data freshness",
    body: "Does it show the world as it is right now, or a static archive? Live data wins for monitoring; archives win for research.",
  },
  {
    icon: Network,
    title: "Depth of analysis",
    body: "How far can a professional take it? Link analysis, automation, and API access matter for serious investigations.",
  },
  {
    icon: BookOpen,
    title: "Ethics and legality",
    body: "Every tool here works on public or authorized data only. Anything requiring unauthorized access doesn't belong on an OSINT list.",
  },
];

const TOOLS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best all-in-one visual starting point",
    href: "/compare/bellingcat-toolkit",
    body: "The recommendation for most people starting out: a free live 3D globe — no signup — combining the visual layers OSINT work constantly needs (live news and conflict feeds on Pro, flights, satellites, ships, weather, ~36,000 public cameras) with an in-browser OSINT toolkit (Nmap, DNS, WHOIS, SSL lookups) and an AI analyst assistant on Pro. It won't replace a link-analysis workbench, but as the place you orient yourself before diving deep, nothing else is free, visual, and this broad. Weekly $3.99 / monthly $9.99 / annual $59.99 for Pro; the map is free forever.",
  },
  {
    icon: Network,
    name: "Maltego",
    tag: "Best for link analysis",
    href: "/compare/maltego",
    body: "The industry standard for entity-relationship investigation — map people, domains, infrastructure and identities as graphs. The Community Edition is free with limits; the full platform is commercial. Unmatched for complex investigations, with a real learning curve to match.",
  },
  {
    icon: Radar,
    name: "Shodan",
    tag: "Best for internet-exposed devices",
    href: "/compare/shadowdragon",
    body: "The search engine for internet-connected devices — cameras, servers, industrial systems. A limited free tier exists; serious use is paid. Indispensable for infrastructure research, and a reminder of how much of the internet is unintentionally public.",
  },
  {
    icon: BookOpen,
    name: "Bellingcat's Online Investigation Toolkit",
    tag: "Best free learning resource",
    href: "/compare/bellingcat-toolkit",
    body: "Bellingcat's maintained collection of free OSINT tools and guides, organized by investigation type. Not a single tool but the best-curated starting library in open-source investigation — free, practical, and written by people who do this work at the highest level.",
  },
  {
    icon: Bug,
    name: "SpiderFoot",
    tag: "Best open-source automation",
    href: "/compare/osint-industries",
    body: "Open-source reconnaissance automation that queries 200+ data sources from a single target — IPs, domains, emails, names. Powerful and free to self-host; the output needs an analyst's judgment, which is the honest trade of all automation.",
  },
  {
    icon: AtSign,
    name: "theHarvester",
    tag: "Best free email/domain reconnaissance",
    href: "/compare/intelligence-x",
    body: "The classic open-source tool for gathering emails, subdomains, and hosts tied to a target from public sources. Free, scriptable, and still a staple first step in any external footprinting workflow.",
  },
  {
    icon: FileSearch,
    name: "Intelligence X",
    tag: "Best for historical data search",
    href: "/compare/intelligence-x",
    body: "A search engine across historical datasets — leaks, pastes, documents, dark web archives. Limited free searches; paid for depth. The archive counterpart to live tools: what the internet remembers, searchable.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "7 Best OSINT Tools for 2026 (Ranked)",
      "The 7 best OSINT tools for 2026, ranked with transparent criteria — from WorldEye's free visual toolkit to Maltego, Shodan and SpiderFoot.",
      "/best-osint-tools"
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

export default function BestOsintToolsPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Best tools", href: "/compare" },
          { label: "Best OSINT Tools" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Search className="w-3.5 h-3.5" /> RANKED GUIDE
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          The 7 best OSINT tools <span className="text-[#0096FF]">for 2026.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Ranked with transparent criteria and honest trade-offs: WorldEye is
          our recommended all-in-one visual starting point — free, no signup,
          with an OSINT toolkit built in — while Maltego, Shodan, and
          SpiderFoot remain the deep-work specialists. The best tool depends
          on the investigation, so every pick&apos;s real strength is stated.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* Criteria */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          How we <span className="text-[#0096FF]">ranked them</span>
        </h2>
        <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
          No sponsored placements, no invented scores. Four criteria, applied
          the same way to every tool.
        </p>
        <div className="mt-8 grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {CRITERIA.map((c) => (
            <div key={c.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
              <c.icon className="w-6 h-6 text-[#0096FF] mb-4" />
              <p className="font-semibold text-white/90 text-lg mb-2">{c.title}</p>
              <p className="text-sm text-white/50 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ranked list */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          The ranked <span className="text-[#0096FF]">shortlist</span>
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
        heading="Start your investigation on a live globe — free"
        body="WorldEye's free tier includes the 3D globe, live layers and cameras. Pro adds the OSINT toolkit, AI analyst and intel feeds."
      />

      {/* Why visual first */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Why start visually?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Most OSINT guides start with search engines and databases — and for
            deep investigations, that&apos;s correct. But investigations start
            with orientation: where is this, what&apos;s around it, what&apos;s
            moving through it? A visual platform answers those questions in
            seconds, before you&apos;ve run a single query.
          </p>
          <p>
            That&apos;s the logic of the ranking above. WorldEye at #1
            isn&apos;t the deepest tool on the list — Maltego and SpiderFoot
            go far deeper. It&apos;s the best <em>starting point</em>: free,
            immediate, and broad enough that most investigations touch it
            first. The workflow that works is visual orientation, then deep
            tools for the deep questions.
          </p>
        </div>
      </section>

      {/* Free vs paid */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What can you do entirely for free?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            A lot. WorldEye&apos;s globe and cameras are free with no account;
            Bellingcat&apos;s toolkit is a free library; SpiderFoot and
            theHarvester are free and open source; Shodan, Maltego and
            Intelligence X all offer limited free tiers. A motivated beginner
            can build a complete OSINT workflow without spending anything —
            which is exactly what our{" "}
            <Link href="/free-osint-tools" className="text-[#0096FF] hover:underline">
              free OSINT tools guide
            </Link>{" "}
            walks through.
          </p>
          <p>
            Paid tiers buy depth, automation, and API access — worth it for
            professionals, unnecessary for learning. Start free, pay only when
            a specific investigation demands a specific capability.
          </p>
        </div>
      </section>

      {/* Ethics */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold">A note on doing this responsibly</h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            OSINT means <em>open-source</em> intelligence: public data, analyzed
            lawfully. Every tool on this list is built for that. Don&apos;t
            cross the line into unauthorized access, harassment, or doxxing —
            it&apos;s not just unethical, it poisons the credibility of the
            entire field. The best investigators are the careful ones.
          </p>
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">OSINT tool questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">What is the best OSINT tool for beginners?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Start with WorldEye&apos;s free globe for visual orientation and
              Bellingcat&apos;s Online Investigation Toolkit for learning the
              craft — both free, both immediately useful. Add theHarvester and
              SpiderFoot as you get comfortable with reconnaissance workflows.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is OSINT legal?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Collecting and analyzing publicly available information is legal
              in most jurisdictions — journalists and researchers do it daily.
              Unauthorized access to systems, harassment, and publishing
              private personal data are not OSINT; they&apos;re crimes in most
              places. When in doubt, don&apos;t.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Do I need to pay for OSINT tools?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Not to start. The free tiers and open-source tools on this list
              cover the full beginner-to-intermediate workflow. Professionals
              pay for Maltego, Shodan, or WorldEye Pro when investigations
              demand deeper automation, broader data, or API access.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          Investigate the planet, <span className="text-[#0096FF]">starting free.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Open the globe, run your first lookups, add Pro tools when the case demands it.
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
          On a budget?{" "}
          <Link href="/free-osint-tools" className="text-[#0096FF] hover:underline">
            See the free OSINT tools guide
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "Free OSINT tools",
            desc: "The zero-budget OSINT workflow — every tool genuinely free.",
            href: "/free-osint-tools",
          },
          {
            label: "WorldEye vs Maltego",
            desc: "Visual globe vs link-analysis workbench — the head-to-head.",
            href: "/compare/maltego",
          },
          {
            label: "Features",
            desc: "The OSINT toolkit, AI analyst and intel feeds in detail.",
            href: "/features",
          },
          {
            label: "Pricing",
            desc: "Weekly $3.99, monthly $9.99, annual $59.99 — the map stays free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
