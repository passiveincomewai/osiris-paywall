import type { Metadata } from "next";
import Link from "next/link";
import { Bus, ChevronRight, MapPin } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import { TRANSIT_AGENCIES } from "@/lib/transit/agencies";
import { agencySeoData, seoAgencies, seoStates } from "@/lib/transit/seo-data";
import { creditFor, TRANSIT_BASE } from "@/lib/transit/seo";

export const revalidate = 3600;

const URL = "/transit";

export const metadata: Metadata = {
  title: "Transit Schedules, Routes & Stops — Live Bus, Rail & Train Times",
  description:
    "Free transit schedules for every route and stop: departure times, service alerts and live vehicles on the WorldEye map. UTA (Salt Lake City) routes, TRAX, FrontRunner and more — no signup.",
  alternates: { canonical: `${TRANSIT_BASE}${URL}` },
  openGraph: {
    title: "Transit Schedules, Routes & Stops — WorldEye",
    description:
      "Every route, every stop, real schedules from the agencies' own GTFS feeds — plus live vehicles on the WorldEye globe. Free, no signup.",
    url: URL,
    type: "website",
  },
};

export default async function TransitHubPage() {
  const agencies = seoAgencies();
  const states = seoStates();
  const data = await Promise.all(
    agencies.map(async (a) => {
      try {
        return await agencySeoData(a);
      } catch {
        return null;
      }
    }),
  );
  const loaded = data.filter((d): d is NonNullable<typeof d> => !!d);
  const totalRoutes = loaded.reduce((n, d) => n + d.net.routes.length, 0);
  const totalStops = loaded.reduce((n, d) => n + d.net.stops.length, 0);
  const mapOnly = TRANSIT_AGENCIES.filter((a) => !a.staticGtfsUrl);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Transit Schedules, Routes & Stops",
        url: `${TRANSIT_BASE}${URL}`,
        description: metadata.description,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: loaded.length,
          itemListElement: loaded.map((d, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `${d.agency.name} — ${d.agency.region}`,
            url: `${TRANSIT_BASE}/transit/${d.agency.id}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${TRANSIT_BASE}/` },
          { "@type": "ListItem", position: 2, name: "Transit", item: `${TRANSIT_BASE}${URL}` },
        ],
      },
    ],
  };

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-sm text-white/45 mb-10"
        >
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">Transit</span>
        </nav>

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Bus className="w-3.5 h-3.5" /> FREE TRANSIT TOOL
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Transit routes, stops &amp; schedules
          </h1>
          <p className="mt-4 text-white/55 leading-relaxed">
            Every route and stop from the agencies&apos; own published schedules —{" "}
            {totalRoutes} routes and {totalStops.toLocaleString()} stops, with departure
            times, live service alerts and the vehicles moving on the WorldEye live map
            right now. Free, no signup.
          </p>
        </div>

        {/* States + agencies with full schedule pages */}
        {states.map(({ state, agencies: stateAgencies }) => (
          <section key={state.slug} className="mt-14">
            <h2 className="font-display text-2xl font-medium">
              <Link href={`/transit/${state.slug}`} className="hover:text-[#D4AF37] transition">
                {state.name} transit
              </Link>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {stateAgencies.map((a) => {
                const d = loaded.find((x) => x.agency.id === a.id);
                return (
                  <Link
                    key={a.id}
                    href={`/transit/${a.id}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#D4AF37]/50 transition group"
                  >
                    <p className="flex items-center gap-1.5 text-white/85 font-semibold group-hover:text-[#D4AF37] transition">
                      <MapPin className="w-4 h-4 text-[#00E5FF]" />
                      {a.name}
                    </p>
                    <p className="text-sm text-white/50 mt-1">{a.region}</p>
                    {d && (
                      <p className="text-sm text-white/60 mt-3">
                        {d.net.routes.length} routes ·{" "}
                        {d.net.stops.length.toLocaleString()} stops
                      </p>
                    )}
                    <p className="text-xs text-white/35 mt-2">{creditFor(a)}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {/* Agencies whose pages exist only where a static feed is wired */}
        {loaded.length === 0 && (
          <p className="mt-14 text-white/50">
            Schedule pages are being rebuilt from the latest agency feeds — the live
            vehicles are on the globe now.
          </p>
        )}

        {/* Live-vehicles-only agencies: honest map links, no schedule pages */}
        {mapOnly.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-medium">Live on the map</h2>
            <p className="text-sm text-white/50 mt-2 max-w-2xl leading-relaxed">
              These agencies stream live vehicle positions to the WorldEye globe. Their
              published schedules aren&apos;t wired in yet, so they don&apos;t have route
              pages here — what you see on the map is the live feed itself.
            </p>
            <ul className="flex flex-wrap gap-2 mt-5">
              {mapOnly.map((a) => (
                <li key={a.id}>
                  <Link
                    href="/?layers=transit"
                    className="inline-block rounded-full border border-white/12 px-3.5 py-1.5 text-sm text-white/70 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition"
                  >
                    {a.name} · {a.region}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="font-display text-xl font-medium">How this works</h2>
          <p className="text-sm text-white/55 mt-2 leading-relaxed">
            Schedules come straight from each agency&apos;s GTFS feed — the same data
            their own apps publish — and are labelled with the feed version on every
            page. Times marked scheduled are the timetable; live status comes from the
            agency&apos;s realtime alerts feed. The same networks power the live transit
            layer on the{" "}
            <Link href="/?layers=transit" className="text-[#D4AF37] hover:underline">
              WorldEye globe
            </Link>
            , where you can watch the vehicles move and open any stop for its next
            arrivals. Riders in the area may also want{" "}
            <Link href="/live-traffic-cameras" className="text-[#D4AF37] hover:underline">
              live traffic cameras
            </Link>{" "}
            for the drive to the station.
          </p>
        </section>
      </div>
      <TrialCtaSection utmSource="transit" />
      <SiteFooter />
    </main>
  );
}
