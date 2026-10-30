import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Bus, ChevronRight, MapPin } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import StopSearch from "@/components/transit-seo/StopSearch";
import RouteAlertSignup from "@/components/transit-seo/RouteAlertSignup";
import { alertsForAgency } from "@/lib/transit/alertsServer";
import {
  agencySeoData,
  seoAgencyById,
  seoStateBySlug,
  seoStates,
  type AgencySeoData,
} from "@/lib/transit/seo-data";
import {
  creditFor,
  displayRouteLong,
  formatZonedTime,
  groupRoutes,
  popularStops,
  routeDisplayName,
  routePath,
  stopAnchor,
  TRANSIT_BASE,
} from "@/lib/transit/seo";

export const revalidate = 3600;

/**
 * One dynamic segment serves both hub kinds — Next.js forbids two
 * sibling dynamic names ([state] vs [agency]) at one level, so the
 * segment dispatches: an agency id renders the agency hub, a state
 * slug renders the state hub. Agency ids win ties (routes/stops nest
 * under the agency segment).
 */
export function generateStaticParams() {
  const out: Array<{ slug: string }> = [];
  for (const { state } of seoStates()) out.push({ slug: state.slug });
  for (const { agencies } of seoStates()) {
    for (const a of agencies) out.push({ slug: a.id });
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agency = seoAgencyById(slug);
  if (agency) {
    let counts = "";
    try {
      const d = await agencySeoData(agency);
      counts = ` All ${d.net.routes.length} routes and ${d.net.stops.length.toLocaleString()} stops`;
    } catch { /* metadata degrades to the generic line */ }
    const title = `${agency.name} Schedules, Routes & Stops — ${agency.region}`;
    const description = `${agency.name} (${agency.region}) transit schedules:${counts.toLowerCase()} with departure times, live service alerts and live vehicles on the WorldEye map. Free, no signup. ${creditFor(agency)}.`;
    return {
      title,
      description,
      alternates: { canonical: `${TRANSIT_BASE}/transit/${agency.id}` },
      openGraph: { title, description, url: `/transit/${agency.id}`, type: "website" },
    };
  }
  const stateHit = seoStateBySlug(slug);
  if (stateHit) {
    const title = `${stateHit.state.name} Transit Schedules, Routes & Stops`;
    const description = `Transit schedules for ${stateHit.state.name}: ${stateHit.agencies.map((a) => `${a.name} (${a.region})`).join(", ")} — every route and stop with times and live alerts. Free, no signup.`;
    return {
      title,
      description,
      alternates: { canonical: `${TRANSIT_BASE}/transit/${stateHit.state.slug}` },
      openGraph: { title, description, url: `/transit/${stateHit.state.slug}`, type: "website" },
    };
  }
  return { title: "Not found" };
}

export default async function TransitSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agency = seoAgencyById(slug);
  if (agency) {
    let data: AgencySeoData;
    try {
      data = await agencySeoData(agency);
    } catch {
      notFound();
    }
    return <AgencyHub data={data!} />;
  }
  const stateHit = seoStateBySlug(slug);
  if (stateHit) return <StateHub slug={stateHit.state.slug} />;
  notFound();
}

/* ── Agency hub ──────────────────────────────────────────────────── */

async function AgencyHub({ data }: { data: AgencySeoData }) {
  const { agency, net, slugs, state, tz } = data;
  const groups = groupRoutes(agency, net.routes);
  const routePaths: Record<string, string> = {};
  for (const r of net.routes) {
    const s = slugs.get(r.id);
    if (s) routePaths[r.short] = routePath(agency.id, s);
  }
  let alerts: Awaited<ReturnType<typeof alertsForAgency>> = [];
  try {
    alerts = await alertsForAgency(agency);
  } catch { /* hub renders without the live summary */ }
  const canonical = `${TRANSIT_BASE}/transit/${agency.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${agency.name} Schedules, Routes & Stops`,
        url: canonical,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: net.routes.length,
          itemListElement: net.routes.map((r, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `Route ${routeDisplayName(r)}`,
            url: `${TRANSIT_BASE}${routePath(agency.id, slugs.get(r.id) ?? r.id)}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${TRANSIT_BASE}/` },
          { "@type": "ListItem", position: 2, name: "Transit", item: `${TRANSIT_BASE}/transit` },
          ...(state
            ? [
                { "@type": "ListItem", position: 3, name: state.name, item: `${TRANSIT_BASE}/transit/${state.slug}` },
                { "@type": "ListItem", position: 4, name: agency.name, item: canonical },
              ]
            : [{ "@type": "ListItem", position: 3, name: agency.name, item: canonical }]),
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
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/45 mb-10">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/transit" className="hover:text-white transition">Transit</Link>
          {state && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href={`/transit/${state.slug}`} className="hover:text-white transition">
                {state.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">{agency.name}</span>
        </nav>

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Bus className="w-3.5 h-3.5" /> {agency.region.toUpperCase()}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            {agency.name} schedules, routes &amp; stops
          </h1>
          <p className="mt-4 text-white/55 leading-relaxed">
            All {net.routes.length} {agency.name} routes and{" "}
            {net.stops.length.toLocaleString()} stops — departure times, live service
            alerts and the network on the WorldEye live map. Free, no signup.
          </p>
          <p className="mt-2 text-sm text-white/40 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#00E5FF]" /> {agency.region}
            {net.feedVersion && <> · Schedule feed: {net.feedVersion}</>} · {creditFor(agency)}
          </p>
          <p className="mt-4">
            <Link
              href="/?layers=transit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-bold text-black hover:brightness-110 transition"
            >
              Watch {agency.name} live on the map
            </Link>
          </p>
        </div>

        {/* Live service-status summary */}
        {agency.alertsUrl && (
          <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="font-display text-xl font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-300" /> Service status
            </h2>
            {alerts.length === 0 ? (
              <p className="text-sm text-white/55 mt-2">
                No active service alerts across {agency.name} right now (checked{" "}
                {formatZonedTime(Date.now(), tz)} {tz === "America/Denver" ? "MT" : ""}).
                Per-route status is on each route page.
              </p>
            ) : (
              <>
                <p className="text-sm text-white/55 mt-2">
                  {alerts.length} active service {alerts.length === 1 ? "alert" : "alerts"}{" "}
                  across {agency.name}:
                </p>
                <ul className="mt-3 space-y-2">
                  {alerts.slice(0, 5).map((a) => (
                    <li key={a.id} className="text-sm text-white/70">
                      <span className="text-white/90">{a.header}</span>
                      {a.routes.length > 0 && (
                        <span className="text-white/40"> — routes {a.routes.join(", ")}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {alerts.length > 5 && (
                  <p className="text-xs text-white/40 mt-2">
                    + {alerts.length - 5} more — each route page shows its own alerts live.
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {/* Stop search tool */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-medium">Find your stop</h2>
          <p className="text-sm text-white/50 mt-1.5">
            Search any {agency.name} stop to see which routes serve it — each result opens
            that route&apos;s timetable at the stop.
          </p>
          <div className="mt-4 max-w-2xl">
            <StopSearch agencyId={agency.id} agencyName={agency.name} routePaths={routePaths} />
          </div>
        </section>

        {/* Email alert signup with route picker — MBTA is the live
            alert-email upstream; other hubs render nothing here. */}
        {agency.id === "mbta" && (
          <section className="mt-12 max-w-2xl">
            <RouteAlertSignup
              agencyId={agency.id}
              agencyName={agency.name}
              routeOptions={net.routes
                .filter((r) => slugs.get(r.id))
                .map((r) => ({
                  id: r.id,
                  slug: slugs.get(r.id)!,
                  name: displayRouteLong(r.long) || routeDisplayName(r),
                }))}
            />
          </section>
        )}

        {/* Route groups */}
        {groups.map((g) => (
          <section key={g.key} className="mt-12">
            <h2 className="font-display text-xl font-medium">
              {g.label} routes{" "}
              <span className="text-white/35 text-base">({g.routes.length})</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {g.routes.map((r) => {
                const dirs = data.net.directions.get(r.id) ?? [];
                const stopCount = new Set(dirs.flatMap((d) => d.stopIds)).size;
                return (
                  <Link
                    key={r.id}
                    href={routePath(agency.id, slugs.get(r.id) ?? r.id)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 hover:border-[#D4AF37]/50 transition group"
                  >
                    <p className="flex items-center gap-2.5">
                      <span
                        className="inline-flex items-center justify-center min-w-9 h-7 px-1.5 rounded-md text-[13px] font-bold text-white"
                        style={{ backgroundColor: r.color }}
                      >
                        {r.short}
                      </span>
                      <span className="text-white/85 font-medium group-hover:text-[#D4AF37] transition">
                        {routeDisplayName(r).slice(r.short.length).trim() || r.long}
                      </span>
                    </p>
                    <p className="text-xs text-white/40 mt-2">
                      {dirs.map((d) => d.headsign).filter(Boolean).join(" · ") || "—"}
                      {stopCount > 0 && <> · {stopCount} stops</>}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <TrialCtaSection utmSource="transit-agency" />
      <SiteFooter />
    </main>
  );
}

/* ── State hub ───────────────────────────────────────────────────── */

async function StateHub({ slug }: { slug: string }) {
  const hit = seoStateBySlug(slug)!;
  const { state, agencies } = hit;
  const datas = await Promise.all(
    agencies.map(async (a) => {
      try {
        return await agencySeoData(a);
      } catch {
        return null;
      }
    }),
  );
  const loaded = datas.filter((d): d is AgencySeoData => !!d);
  const totalRoutes = loaded.reduce((n, d) => n + d.net.routes.length, 0);
  const totalStops = loaded.reduce((n, d) => n + d.net.stops.length, 0);
  const canonical = `${TRANSIT_BASE}/transit/${state.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${state.name} Transit Schedules, Routes & Stops`,
        url: canonical,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${TRANSIT_BASE}/` },
          { "@type": "ListItem", position: 2, name: "Transit", item: `${TRANSIT_BASE}/transit` },
          { "@type": "ListItem", position: 3, name: state.name, item: canonical },
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
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/45 mb-10">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/transit" className="hover:text-white transition">Transit</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">{state.name}</span>
        </nav>

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Bus className="w-3.5 h-3.5" /> {state.name.toUpperCase()} TRANSIT
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            {state.name} transit schedules
          </h1>
          <p className="mt-4 text-white/55 leading-relaxed">
            {totalRoutes} routes and {totalStops.toLocaleString()} stops across{" "}
            {loaded.map((d) => d.agency.name).join(", ")} — full timetables, live service
            alerts and live vehicles on the WorldEye map. Free, no signup.
          </p>
        </div>

        {loaded.map((d) => {
          const popular = popularStops(d.net, 10);
          return (
            <section key={d.agency.id} className="mt-14">
              <h2 className="font-display text-2xl font-medium">
                <Link href={`/transit/${d.agency.id}`} className="hover:text-[#D4AF37] transition">
                  {d.agency.name} — {d.agency.region}
                </Link>
              </h2>
              <p className="text-sm text-white/50 mt-1.5">
                {d.net.routes.length} routes · {d.net.stops.length.toLocaleString()} stops ·{" "}
                {creditFor(d.agency)}
              </p>

              <h3 className="text-sm font-semibold tracking-wide text-white/70 mt-6 mb-3">
                All {d.agency.name} routes
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {d.net.routes.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={routePath(d.agency.id, d.slugs.get(r.id) ?? r.id)}
                      className="inline-block rounded-md border border-white/12 px-2.5 py-1.5 text-xs text-white/75 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition"
                      title={`${d.agency.name} Route ${routeDisplayName(r)} schedule`}
                    >
                      {r.short} · {routeDisplayName(r).slice(r.short.length).trim() || r.short}
                    </Link>
                  </li>
                ))}
              </ul>

              <h3 className="text-sm font-semibold tracking-wide text-white/70 mt-8 mb-3">
                Busiest {d.agency.name} stops
              </h3>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {popular.map((s) => {
                  const firstShort = s.routes[0];
                  const route = firstShort ? d.net.routeByShort.get(firstShort) : undefined;
                  const path = route
                    ? `${routePath(d.agency.id, d.slugs.get(route.id) ?? route.id)}#${stopAnchor(s.id)}`
                    : `/transit/${d.agency.id}`;
                  return (
                    <li key={s.id}>
                      <Link
                        href={path}
                        className="block rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white/75 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition"
                      >
                        {s.name}
                        <span className="block text-xs text-white/35 mt-0.5">
                          {s.routes.length} routes: {s.routes.slice(0, 6).join(", ")}
                          {s.routes.length > 6 ? "…" : ""}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <section className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="font-display text-xl font-medium">Getting around {state.name}</h2>
          <p className="text-sm text-white/55 mt-2 leading-relaxed">
            Pair the timetable with the road picture:{" "}
            <Link href="/live-traffic-cameras" className="text-[#D4AF37] hover:underline">
              live traffic cameras
            </Link>{" "}
            show conditions on the drive to the station, and the{" "}
            <Link href="/?layers=transit" className="text-[#D4AF37] hover:underline">
              live transit map
            </Link>{" "}
            tracks every vehicle as it moves.
          </p>
        </section>
      </div>
      <TrialCtaSection utmSource="transit-state" />
      <SiteFooter />
    </main>
  );
}
