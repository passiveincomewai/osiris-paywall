import type { Metadata } from "next";
import Link from "next/link";
import {
  Ship,
  Globe,
  Waves,
  Radar,
  MapPin,
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
  title: "6 Best Ship Tracking Tools for 2026 (Ranked)",
  description:
    "The best ship tracking tools for 2026 compared: WorldEye's maritime intel globe, MarineTraffic, VesselFinder, FleetMon, MyShipTracking and ShipFinder.",
  alternates: { canonical: "/best-ship-tracking-tools" },
  openGraph: {
    title: "6 Best Ship Tracking Tools for 2026 (Ranked) | WorldEye",
    description:
      "Compare the best ship trackers for 2026 — WorldEye's maritime intel globe, MarineTraffic, VesselFinder, FleetMon and more.",
    url: "/best-ship-tracking-tools",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "6 Best Ship Tracking Tools for 2026 (Ranked) | WorldEye",
    description:
      "The best ship tracking tools for 2026 compared — free and paid AIS picks ranked.",
  },
};

const TOOLS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best all-in-one with maritime intel",
    href: "/ship-tracker",
    body: "Ship tracking as one layer of a live world picture: WorldEye's Pro maritime intel feed places vessels alongside the free globe's flights, satellites, weather, earthquakes, wildfires and 74,229 public cameras. Stated plainly — maritime is a Pro feature on WorldEye, not part of the free map. The pick when a ship's context matters as much as its position.",
  },
  {
    icon: Ship,
    name: "MarineTraffic",
    tag: "Best-known AIS platform",
    href: "/ship-tracker",
    body: "The default name in vessel tracking: a large AIS network, vessel photos and details, port calls and fleet tools. The free tier shows the live map with limits; serious features — history, fleets, alerts — are paid plans aimed at enthusiasts and professionals alike.",
  },
  {
    icon: Waves,
    name: "VesselFinder",
    tag: "Best MarineTraffic alternative",
    href: "/ship-tracker",
    body: "A well-established AIS tracker with live vessel positions, ship details, port information and voyage history, offered in free and paid tiers. The closest like-for-like alternative to MarineTraffic, with a similar free-map, paid-depth model.",
  },
  {
    icon: Radar,
    name: "FleetMon",
    tag: "Best for maritime professionals",
    href: "/ship-tracker",
    body: "A professional-leaning AIS platform with vessel tracking, fleet management and maritime data services. Strongest for business and logistics users who need data and tooling beyond watching ships move on a map.",
  },
  {
    icon: MapPin,
    name: "MyShipTracking",
    tag: "Best free-tier browsing",
    href: "/ship-tracker",
    body: "A free AIS-based tracker showing live vessel positions, ship details and port activity. A capable no-cost way to follow ships casually, with the coverage and freshness limits typical of free AIS tiers.",
  },
  {
    icon: Radio,
    name: "ShipFinder",
    tag: "Best mobile-first tracker",
    href: "/ship-tracker",
    body: "A long-running ship tracking app for following vessels from your phone, with live AIS positions and ship details. Worth a look if your tracking is mostly mobile; its strongest features sit in paid tiers.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "6 Best Ship Tracking Tools for 2026 (Ranked)",
      "The best ship tracking tools for 2026 compared: WorldEye's maritime intel globe, MarineTraffic, VesselFinder, FleetMon, MyShipTracking and ShipFinder.",
      "/best-ship-tracking-tools"
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

export default function BestShipTrackingToolsPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Best tools", href: "/compare" },
          { label: "Best Ship Tracking Tools" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Ship className="w-3.5 h-3.5" /> RANKED GUIDE
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          The best ship tracking tools <span className="text-[#0096FF]">for 2026.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Six AIS trackers compared on what actually differs between them —
          coverage model, history, price, and context. MarineTraffic remains
          the best-known dedicated platform; WorldEye is our pick when you
          want vessels inside a wider live picture. Here&apos;s how to
          choose.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What differs */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What actually differs between ship trackers?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Almost every tracker is built on AIS — the Automatic
            Identification System vessels broadcast their identity, position,
            course and speed on. What differs:{" "}
            <strong className="text-white/85">receiver coverage</strong>{" "}
            (terrestrial networks see coastal traffic; open-ocean coverage
            needs satellite AIS), <strong className="text-white/85">history
            and fleet tools</strong>, <strong className="text-white/85">price</strong>{" "}
            — free tiers are limited versions of paid AIS services — and{" "}
            <strong className="text-white/85">context</strong>: what else
            shares the screen with the ships.
          </p>
          <p>
            Rank accordingly: pick the tracker whose differences match your
            reason for tracking. The list below is organized by genuine
            best-fit, not by who has the largest marketing fleet.
          </p>
        </div>
      </section>

      {/* Ranked list */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Six trackers, <span className="text-[#0096FF]">ranked by best-fit</span>
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
        heading="Ships, in the context of the whole planet"
        body="WorldEye Pro's maritime intel sits on the same globe as live weather, ports on camera, flights and satellites. See the vessel and the world around it."
      />

      {/* AIS explainer */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">How does ship tracking actually work?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            The short version: most commercial vessels continuously broadcast
            AIS messages — identity, position, course, speed and destination —
            originally for collision avoidance and safety. Networks of shore
            receivers pick up those broadcasts near coasts, and satellite AIS
            extends coverage across open oceans. Tracking services combine
            those feeds and plot the ships on maps.
          </p>
          <p>
            That architecture explains the pricing shape of the whole
            category: coastal live positions are comparatively cheap to
            offer, while satellite coverage, long histories and fleet-grade
            data cost real money to collect — which is why free tiers are
            limited versions of paid services. Our{" "}
            <Link href="/what-is-ais" className="text-[#0096FF] hover:underline">
              AIS explainer
            </Link>{" "}
            goes deeper if you&apos;re curious.
          </p>
        </div>
      </section>

      {/* Use cases */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Which tracker for which job?</h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {[
            {
              q: "Watching ships in a wider live picture",
              a: "WorldEye Pro — maritime intel on a globe with weather systems, port-area cameras, flights and satellites in the same frame. Best when context is the point.",
            },
            {
              q: "Following one vessel or a fleet",
              a: "MarineTraffic or VesselFinder — vessel pages, port calls, history and fleet tools are their home turf, in paid tiers.",
            },
            {
              q: "Casual free ship-spotting",
              a: "MyShipTracking or the free tiers of the big platforms — live coastal positions at no cost, with the usual freshness limits.",
            },
            {
              q: "Professional maritime data",
              a: "FleetMon or the business tiers of the major AIS platforms — data services and fleet management beyond a public map.",
            },
          ].map((c) => (
            <div key={c.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="font-semibold text-white/90 mb-2">{c.q}</p>
              <p className="text-sm text-white/50 leading-relaxed">{c.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free vs paid */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Free vs. paid ship tracking: what&apos;s actually paywalled?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            On dedicated AIS platforms, the live coastal picture is typically
            free with limits, and you pay for everything around it: satellite
            AIS for open-ocean positions, voyage history, fleet lists, alerts,
            expected arrivals and data exports. None of that is necessary to
            enjoy watching ships; all of it matters once tracking becomes a
            job or a serious hobby.
          </p>
          <p>
            WorldEye is priced differently, so here is the honest version:
            the free map — globe, flights, satellites, weather, earthquakes,
            wildfires and 74,229 cameras, no signup — does not include ship
            tracking. Maritime intel is part of Pro (weekly $3.99, monthly
            $9.99, annual $59.99), alongside the OSINT toolkit, cyber/GDELT
            intel, satellite imagery view, advanced search filters and the AI analyst.
            If ships are all you want, a dedicated AIS free tier may serve
            you first; if ships plus the whole live planet is the point, Pro
            is the bundle built for it.
          </p>
        </div>
      </section>

      {/* Honest specialist note */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">When a dedicated AIS platform wins</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Plainly: if your work is maritime — fleet operations, logistics,
            port research, deep vessel history — a dedicated platform like
            MarineTraffic or FleetMon goes deeper on vessels than a general
            live globe does. That depth is their entire product. WorldEye&apos;s
            strength is the opposite direction: breadth, with ships read
            alongside the weather, air traffic and events that affect them.
          </p>
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Ship tracking questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">What&apos;s the best free ship tracker?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              MyShipTracking and the free tiers of MarineTraffic and
              VesselFinder all show live coastal AIS positions at no cost,
              with limits on freshness, history and features. For casual
              ship-spotting, any of them works — try the map you enjoy using.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Is ship tracking free on WorldEye?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              No — maritime vessel tracking is a WorldEye Pro feature, and we
              say so rather than burying it. The free map covers the globe,
              flights, satellites, weather, earthquakes, wildfires and
              74,229 cameras with no signup; Pro adds maritime intel with
              the rest of the intelligence toolkit.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Why do some ships disappear mid-ocean on free trackers?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Because free tiers usually rely on terrestrial AIS receivers,
              which only hear vessels near coasts. Open-ocean positions come
              from satellite AIS, which costs providers money — so continuous
              mid-ocean tracking is normally a paid feature everywhere.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          The sea is moving. <span className="text-[#0096FF]">Watch it live.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Maritime intel on a live 3D globe — start with the free map, unlock Pro for the ships.
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
          Prefer the dedicated tracker page?{" "}
          <Link href="/ship-tracker" className="text-[#0096FF] hover:underline">
            Open the ship tracker
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "Ship tracker",
            desc: "Vessels on a live globe with maritime intel — the page this guide is about.",
            href: "/ship-tracker",
          },
          {
            label: "What is AIS?",
            desc: "The broadcast system behind every ship tracker, explained.",
            href: "/what-is-ais",
          },
          {
            label: "Features",
            desc: "Everything the globe can do — free layers and Pro intelligence tools.",
            href: "/features",
          },
          {
            label: "Pricing",
            desc: "Weekly $3.99, monthly $9.99, annual $59.99 — maritime intel is in Pro.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
