import type { Metadata } from "next";
import Link from "next/link";
import {
  Gift,
  Globe,
  Database,
  Bug,
  AtSign,
  BookOpen,
  Radar,
  Archive,
  Network,
  Activity,
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
  title: "9 Free OSINT Tools That Actually Work",
  description:
    "9 genuinely free OSINT tools for 2026 — WorldEye's free globe, GDELT, SpiderFoot, theHarvester and more. No trials, no credit cards.",
  alternates: { canonical: "/free-osint-tools" },
  openGraph: {
    title: "9 Free OSINT Tools That Actually Work | WorldEye",
    description:
      "A zero-budget OSINT toolkit: 9 free tools that work — visual, data, recon and research — with honest free-tier limits.",
    url: "/free-osint-tools",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "9 Free OSINT Tools That Actually Work | WorldEye",
    description:
      "9 genuinely free OSINT tools — no trials, no credit cards, honest limits.",
  },
};

const TOOLS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Free visual investigation globe",
    href: "/",
    limit: "Free tier: the live map — globe, flights, satellites, weather, quakes, fires, 74,229 cameras — no signup, no paywall. Ships (the maritime AIS feed), the OSINT toolkit and AI analyst are Pro.",
    body: "Start every investigation here: orient yourself visually before running a single query. See the location, what's around it, what's moving through it — flights, satellites, weather, ground cameras — all free with no account. Ships are the exception: the maritime AIS feed is a Pro layer. The visual layer most free OSINT stacks are missing.",
  },
  {
    icon: Database,
    name: "GDELT Project",
    tag: "Free global event data",
    href: "/compare/gdelt",
    limit: "Free: the full event datasets, updated every 15 minutes, queryable via BigQuery. Requires data skills — no point-and-click interface.",
    body: "Machine-coded world news events in 100+ languages as open data. For quantitative OSINT — tracking event intensity, mapping coverage patterns — it's the most powerful free dataset in existence. The price is learning to query it.",
  },
  {
    icon: BookOpen,
    name: "Bellingcat's Online Investigation Toolkit",
    tag: "Free tool library and guides",
    href: "/compare/bellingcat-toolkit",
    limit: "Free: the entire curated toolkit and methodology guides. It's a library, not a single tool — you still run the tools yourself.",
    body: "The best-curated free starting library in open-source investigation, maintained by the team that defined modern OSINT methodology. Organized by investigation type — geolocation, social media, imagery verification — with guides written by practitioners.",
  },
  {
    icon: Bug,
    name: "SpiderFoot",
    tag: "Free open-source recon automation",
    href: "/compare/osint-industries",
    limit: "Free and open source to self-host. Output volume is high — you supply the analyst judgment to separate signal from noise.",
    body: "Automated reconnaissance across 200+ data sources from a single target: IPs, domains, emails, names, breaches. The open-source workhorse for footprinting — powerful, free, and honest about needing a human in the loop.",
  },
  {
    icon: AtSign,
    name: "theHarvester",
    tag: "Free email and subdomain recon",
    href: "/compare/intelligence-x",
    limit: "Free and open source, command-line. No GUI — but simple enough that the terminal shouldn't scare you off.",
    body: "The classic first step in external footprinting: gather emails, subdomains and hosts tied to a target from public sources. Free, scriptable, and still in daily use by professionals who could afford anything.",
  },
  {
    icon: Radar,
    name: "Shodan (free tier)",
    tag: "Free device search, limited",
    href: "/compare/shadowdragon",
    limit: "Free tier: limited searches and results. Enough to learn the tool and run small investigations; serious use is paid.",
    body: "The search engine for internet-connected devices. Even the free tier teaches you the fundamental OSINT lesson — how much infrastructure is unintentionally public — and handles small research tasks genuinely well.",
  },
  {
    icon: Network,
    name: "Maltego Community Edition",
    tag: "Free link-analysis starter",
    href: "/compare/maltego",
    limit: "Free Community Edition with limited transforms and graph size. Enough to learn link analysis properly before deciding if you need the commercial platform.",
    body: "The industry-standard link-analysis workbench, in a free edition that teaches the real methodology: entities, relationships, graphs. Start here before spending anything on investigation platforms.",
  },
  {
    icon: Archive,
    name: "Wayback Machine",
    tag: "Free web history",
    href: "/best-osint-tools",
    limit: "Free: the full archive. Coverage varies by site and era — some pages were never captured, and that's just how archives work.",
    body: "The Internet Archive's record of the web across decades — deleted pages, changed claims, vanished profiles. For establishing what someone said before they edited it, nothing else exists at this scale, and it's completely free.",
  },
  {
    icon: Activity,
    name: "EMSC / USGS earthquake feeds",
    tag: "Free real-time disaster data",
    href: "/earthquake-tracker",
    limit: "Free: authoritative real-time feeds. Scope is earthquakes (and related hazards) — narrow by design.",
    body: "Authoritative, free, minute-fast seismic data from the European-Mediterranean Seismological Centre and USGS. For disaster OSINT and verifying shaking-related claims, primary-source data beats every aggregator — and it's open to everyone.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "9 Free OSINT Tools That Actually Work",
      "9 genuinely free OSINT tools for 2026 — WorldEye's free globe, GDELT, SpiderFoot, theHarvester and more.",
      "/free-osint-tools"
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

export default function FreeOsintToolsPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Best tools", href: "/compare" },
          { label: "Free OSINT Tools" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Gift className="w-3.5 h-3.5" /> ZERO BUDGET
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          9 free OSINT tools <span className="text-[#0096FF]">that actually work.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          No trials, no credit cards, no &ldquo;free*&rdquo; asterisks. Nine
          genuinely free tools that cover the full beginner-to-intermediate
          OSINT workflow — visual investigation, event data, reconnaissance,
          and research — with each one&apos;s honest free-tier limits stated
          upfront.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* Why free works */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Why does so much of OSINT cost nothing?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Because OSINT is, by definition, <em>open</em>-source intelligence.
            The raw material — public records, open data, broadcast signals,
            archived web pages — belongs to everyone. The best tools in this
            space are often free precisely because their builders believe
            investigation capability shouldn&apos;t require a budget: open
            datasets like GDELT, open-source tools like SpiderFoot and
            theHarvester, and free platforms like WorldEye&apos;s globe.
          </p>
          <p>
            Paid tiers in OSINT buy convenience, automation depth, and API
            access — real value for professionals, but none of it required to
            learn the craft or run real investigations. The rule: start free,
            and pay only when a specific investigation demands a specific
            capability you can name.
          </p>
        </div>
      </section>

      {/* The nine */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          The nine tools, <span className="text-[#0096FF]">with honest limits</span>
        </h2>
        <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto">
          Every &ldquo;free&rdquo; claim on this page was checked — including
          what the free tier doesn&apos;t include.
        </p>
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
                  <p className="text-xs text-white/40 leading-relaxed mt-3 border-l-2 border-[#0096FF]/40 pl-3">
                    <strong className="text-white/60">Free-tier reality:</strong> {t.limit}
                  </p>
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
        heading="The free globe belongs in every OSINT kit"
        body="WorldEye's live map — flights, satellites, cameras, weather — is free with no signup. Start your next investigation visually."
      />

      {/* Workflow */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">A complete free OSINT workflow</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Here&apos;s how the nine tools combine into a real investigation
            with zero budget. <strong className="text-white/85">Orient:</strong> open
            WorldEye and look at the location — the terrain, the traffic, the
            cameras. <strong className="text-white/85">Research:</strong> check
            Bellingcat&apos;s toolkit for the right technique, pull GDELT for
            event context, check the Wayback Machine for history.
          </p>
          <p>
            <strong className="text-white/85">Footprint:</strong> run
            theHarvester and SpiderFoot against domains and names.
            <strong className="text-white/85">Analyze:</strong> map
            relationships in Maltego Community Edition, check infrastructure
            in Shodan&apos;s free tier. <strong className="text-white/85">Verify:</strong> cross-check
            claims against primary sources like EMSC/USGS feeds and visual
            evidence on the globe.
          </p>
          <p>
            That&apos;s a professional-grade workflow — orientation, research,
            footprinting, analysis, verification — for exactly $0. The paid
            tools make steps faster; none of them make steps possible.
          </p>
        </div>
      </section>

      {/* When to pay */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">When should you actually pay for OSINT tools?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Three honest triggers. <strong className="text-white/85">Volume:</strong> you&apos;re
            running enough queries that free-tier rate limits slow real work.
            <strong className="text-white/85"> Depth:</strong> an investigation
            needs data only the paid tier holds — full Shodan results, deeper
            Maltego transforms, WorldEye Pro&apos;s intel feeds and AI
            analyst. <strong className="text-white/85"> Integration:</strong> you
            need API access to pipe results into your own systems.
          </p>
          <p>
            If none of those apply, you don&apos;t need to pay yet — and
            anyone telling you otherwise is selling. WorldEye Pro (weekly
            $7.99, monthly $13.99, annual $74.99) is priced for the moment an
            individual investigator outgrows the free globe, not as a gate in
            front of it.
          </p>
        </div>
      </section>

      {/* WorldEye's own tools */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">WorldEye&apos;s own free tools</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            WorldEye&apos;s toolkit has its own index now — every tool on
            its own page, with what it does and what it costs stated
            upfront. Three of them run entirely free in your browser: the{" "}
            <Link href="/tools/data-leak-checker" className="text-[#0096FF] hover:underline">data leak checker</Link>{" "}
            (has an email address appeared in a known breach?), the{" "}
            <Link href="/tools/ip-device-lookup" className="text-[#0096FF] hover:underline">IP device lookup</Link>{" "}
            (what an address exposes, from Shodan&apos;s InternetDB), and{" "}
            <Link href="/tools/photo-geolocation" className="text-[#0096FF] hover:underline">photo geolocation</Link>.
            The rest of the board — port scans, DNS, WHOIS, username search
            and more — is Pro, and each tool&apos;s page says so plainly.
          </p>
          <p>
            <Link href="/tools" className="text-[#0096FF] hover:underline">
              Browse the full WorldEye tools index →
            </Link>
          </p>
        </div>
      </section>

      {/* Ethics */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold">Free tools, full responsibility</h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          <p>
            That these tools are free makes the ethics more important, not
            less. OSINT is public data analyzed lawfully — for journalism,
            research, and verification. It is not doxxing, harassment,
            stalking, or unauthorized access, and &ldquo;the tool let me&rdquo;
            has never been a defense. Learn the craft from Bellingcat&apos;s
            methodology guides, verify before you share, and keep the line
            bright.
          </p>
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Free OSINT questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">Can I really do OSINT without paying anything?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Yes — the nine tools on this page cover orientation, research,
              footprinting, analysis and verification for $0. Professionals
              pay for speed and depth at volume, not for access to the craft
              itself.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">What&apos;s the best first free OSINT tool to learn?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              WorldEye&apos;s free globe — because visual orientation is the
              fastest skill to build and it improves every investigation
              after it. Then Bellingcat&apos;s toolkit for methodology, then
              theHarvester for your first real reconnaissance runs.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Are free OSINT tools legal to use?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Using public data and open tools is legal in most jurisdictions
              — it&apos;s what journalists and researchers do daily.
              Unauthorized access, harassment, and publishing private personal
              data are not OSINT regardless of the tool. When in doubt,
              don&apos;t.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          Your OSINT kit starts <span className="text-[#0096FF]">free.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Open the globe — no signup — and run your first visual investigation today.
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
          Ready to go deeper?{" "}
          <Link href="/best-osint-tools" className="text-[#0096FF] hover:underline">
            See the ranked OSINT tools guide
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "Best OSINT tools",
            desc: "The ranked guide — when you're ready to compare free vs paid properly.",
            href: "/best-osint-tools",
          },
          {
            label: "What is OSINT?",
            desc: "The beginner's guide the toolkit builds on — methods, ethics and first investigations.",
            href: "/blog/what-is-osint",
          },
          {
            label: "Best global intelligence dashboards",
            desc: "The dashboard layer of the stack — planet-scale awareness platforms, ranked.",
            href: "/best-global-intelligence-dashboards",
          },
          {
            label: "Features",
            desc: "The OSINT toolkit, AI analyst and intel feeds in detail.",
            href: "/features",
          },
          {
            label: "Earthquake tracker",
            desc: "Live seismic activity on the globe — EMSC/USGS data, visualized.",
            href: "/earthquake-tracker",
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
