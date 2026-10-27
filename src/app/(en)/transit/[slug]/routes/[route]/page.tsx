import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink, MapPin } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import RouteAlertsLive from "@/components/transit-seo/RouteAlertsLive";
import { agencySeoData, seoAgencies, seoAgencyById } from "@/lib/transit/seo-data";
import { ymdInZone, routeDaySummary } from "@/lib/transit/network";
import {
  creditFor,
  directionStopTimes,
  displayRouteLong,
  formatDayLabel,
  formatGtfsClock,
  formatZonedTime,
  groupRoutes,
  liveMapUrl,
  modeGroupLabel,
  representativeDays,
  routeDescription,
  routeDisplayName,
  routeGroupKey,
  routeJsonLd,
  routePath,
  routeTitle,
  stopAnchor,
  terminusDepartures,
  TRANSIT_BASE,
  type DayKind,
} from "@/lib/transit/seo";

/**
 * Route pages are SSG (generateStaticParams — UTA: 86) with a daily
 * ISR refresh: the feed changes on schedule revisions, but the
 * day-relative content ("today's departures", representative
 * weekday) must roll forward, so revalidate is 24 h rather than
 * forever-static.
 */
export const revalidate = 86400;

export async function generateStaticParams() {
  const out: Array<{ slug: string; route: string }> = [];
  for (const agency of seoAgencies()) {
    try {
      const d = await agencySeoData(agency);
      for (const slug of d.slugs.values()) out.push({ slug: agency.id, route: slug });
    } catch { /* an agency whose feed is down at build lights up on ISR instead */ }
  }
  return out;
}

async function load(slug: string, routeSlug: string) {
  const agency = seoAgencyById(slug);
  if (!agency) return null;
  let data;
  try {
    data = await agencySeoData(agency);
  } catch {
    return null;
  }
  const routeId = data.routeIdBySlug.get(routeSlug);
  const route = routeId ? data.net.routeById.get(routeId) : undefined;
  if (!route) return null;
  return { data, route };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; route: string }>;
}): Promise<Metadata> {
  const { slug, route: routeSlug } = await params;
  const hit = await load(slug, routeSlug);
  if (!hit) return { title: "Not found" };
  const { data, route } = hit;
  const days = representativeDays(data.net, route.id, data.tz);
  const weekday = days.find((d) => d.kind === "weekday");
  const stopCount = new Set(
    (data.net.directions.get(route.id) ?? []).flatMap((d) => d.stopIds),
  ).size;
  const title = routeTitle(data.agency, route);
  const description = routeDescription(data.agency, route, weekday, stopCount, data.tz);
  const url = routePath(data.agency.id, routeSlug);
  return {
    title,
    description,
    alternates: { canonical: `${TRANSIT_BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

const DAY_LABELS: Record<DayKind, string> = {
  weekday: "Weekday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export default async function TransitRoutePage({
  params,
}: {
  params: Promise<{ slug: string; route: string }>;
}) {
  const { slug, route: routeSlug } = await params;
  const hit = await load(slug, routeSlug);
  if (!hit) notFound();
  const { data, route } = hit!;
  const { agency, net, state, tz } = data;
  const groupKey = routeGroupKey(agency.id, route);
  const groupLabel = modeGroupLabel(agency.id, groupKey);
  const directions = net.directions.get(route.id) ?? [];
  const stopCount = new Set(directions.flatMap((d) => d.stopIds)).size;
  const displayName = routeDisplayName(route);
  const longName = displayRouteLong(route.long);

  const repDays = representativeDays(net, route.id, tz);
  const repByKind = new Map(repDays.map((d) => [d.kind, d]));
  const todayYmdRaw = ymdInZone(tz, new Date());
  const todayYmd = todayYmdRaw.replace(/-/g, "");
  const todayLabel = formatDayLabel(todayYmd);
  const todaySummary = routeDaySummary(net, route.id, todayYmd, tz);
  const runsToday = todaySummary.some((d) => d.trips > 0);

  // FAQ — every answer computed from the feed above.
  const weekday = repByKind.get("weekday");
  const wdDir = weekday?.directions.find((d) => d.trips > 0);
  const endpoints = directions
    .map((d) => {
      const first = net.stopById.get(d.stopIds[0])?.name;
      const last = net.stopById.get(d.stopIds[d.stopIds.length - 1])?.name;
      return first && last ? `${first} → ${last} (to ${d.headsign})` : null;
    })
    .filter((s): s is string => !!s);
  const faqs: Array<{ q: string; a: string }> = [
    ...(wdDir && wdDir.firstDepMs != null && wdDir.lastDepMs != null
      ? [{
          q: `What time does ${agency.name} Route ${displayName} run on weekdays?`,
          a: `On a typical weekday (${weekday!.label}), the first ${agency.name} Route ${displayName} departure is ${formatZonedTime(wdDir.firstDepMs, tz)} and the last is ${formatZonedTime(wdDir.lastDepMs, tz)}${wdDir.headwayMin ? `, running roughly every ${wdDir.headwayMin} minutes` : ""}. Times are the published schedule from the ${agency.name} GTFS feed${net.feedVersion ? ` (version ${net.feedVersion})` : ""}.`,
        }]
      : []),
    ...(endpoints.length
      ? [{
          q: `Where does ${agency.name} Route ${displayName} go?`,
          a: `${agency.name} Route ${displayName} serves ${stopCount} stops: ${endpoints.join("; ")}. The full ordered stop list with first and last departure times is on this page.`,
        }]
      : []),
    {
      q: `Does ${agency.name} Route ${displayName} run on weekends?`,
      a: [
        repByKind.has("saturday")
          ? `Yes — Saturday service runs ${repByKind.get("saturday")!.directions.reduce((n, d) => n + d.trips, 0)} trips`
          : "No Saturday service in the current feed",
        repByKind.has("sunday")
          ? `Sunday service runs ${repByKind.get("sunday")!.directions.reduce((n, d) => n + d.trips, 0)} trips`
          : "no Sunday service in the current feed",
      ].join("; ") + ". See the schedule summary for first and last times.",
    },
    {
      q: `Is ${agency.name} Route ${displayName} delayed or on detour right now?`,
      a: `The live service status section at the top of this page reads ${agency.name}'s realtime alerts feed — detours, suspensions and delays for this route appear there as the agency posts them. Everything else on this page is the published timetable.`,
    },
    {
      q: `Can I watch ${agency.name} Route ${displayName} live on a map?`,
      a: `Yes — the WorldEye globe carries ${agency.name}'s live vehicle positions on its transit layer. Open the live map from this page, and tap any vehicle or stop for its next arrivals. It's free, no signup.`,
    },
  ];

  const description = routeDescription(agency, route, weekday, stopCount, tz);
  const jsonLd = routeJsonLd({ agency, route, slug: routeSlug, description, faqs });
  const siblings = groupRoutes(agency, net.routes)
    .find((g) => g.key === groupKey)
    ?.routes.filter((r) => r.id !== route.id)
    .slice(0, 8);

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-white/45 mb-10">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/transit" className="hover:text-white transition">Transit</Link>
          {state && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href={`/transit/${state.slug}`} className="hover:text-white transition">{state.name}</Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/transit/${agency.id}`} className="hover:text-white transition">{agency.name}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">Route {route.short}</span>
        </nav>

        {/* Hero */}
        <div className="flex items-start gap-4">
          <span
            className="inline-flex items-center justify-center min-w-14 h-12 px-2.5 rounded-xl text-xl font-bold text-white shrink-0"
            style={{ backgroundColor: route.color }}
          >
            {route.short}
          </span>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {agency.name} Route {displayName}
            </h1>
            <p className="mt-1.5 text-white/55 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{groupLabel}</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#00E5FF]" /> {agency.region}
              </span>
              <span>{stopCount} stops</span>
              {directions.map((d) => (
                <span key={d.dir}>to {d.headsign}</span>
              ))}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 mt-6">
          <Link
            href={liveMapUrl()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-bold text-black hover:brightness-110 transition"
          >
            View live on the map
          </Link>
          {route.url && (
            <a
              href={route.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75 hover:text-white hover:border-white/35 transition"
            >
              Official {agency.name} schedule <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <Link
            href={`/transit/${agency.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75 hover:text-white hover:border-white/35 transition"
          >
            All {agency.name} routes
          </Link>
        </div>

        {/* Live status */}
        <div className="mt-8">
          <RouteAlertsLive agencyId={agency.id} agencyName={agency.name} routeShort={route.short} />
        </div>

        {/* Schedule summary */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-medium">Schedule summary</h2>
          <p className="text-sm text-white/45 mt-1.5">
            Computed from the {agency.name} GTFS feed{net.feedVersion ? ` (version ${net.feedVersion})` : ""}.
            Each row is the next day of that kind with service.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/10">
                  <th className="px-4 py-3 font-medium">Day</th>
                  <th className="px-4 py-3 font-medium">Direction</th>
                  <th className="px-4 py-3 font-medium">First</th>
                  <th className="px-4 py-3 font-medium">Last</th>
                  <th className="px-4 py-3 font-medium">Trips</th>
                  <th className="px-4 py-3 font-medium">Typical gap</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(DAY_LABELS) as DayKind[]).map((kind) => {
                  const day = repByKind.get(kind);
                  if (!day) {
                    return (
                      <tr key={kind} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3 text-white/70">{DAY_LABELS[kind]}</td>
                        <td className="px-4 py-3 text-white/40" colSpan={5}>
                          No {DAY_LABELS[kind].toLowerCase()} service in the current feed
                        </td>
                      </tr>
                    );
                  }
                  return day.directions.map((d, i) => (
                    <tr key={`${kind}-${d.dir}`} className="border-b border-white/5 last:border-0">
                      {i === 0 && (
                        <td className="px-4 py-3 text-white/70" rowSpan={day.directions.length}>
                          {DAY_LABELS[kind]}
                          <span className="block text-xs text-white/35">{day.label}</span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-white/75">to {d.headsign}</td>
                      <td className="px-4 py-3 text-white/75">
                        {d.firstDepMs != null ? formatZonedTime(d.firstDepMs, tz) : "—"}
                      </td>
                      <td className="px-4 py-3 text-white/75">
                        {d.lastDepMs != null ? formatZonedTime(d.lastDepMs, tz) : "—"}
                      </td>
                      <td className="px-4 py-3 text-white/75">{d.trips}</td>
                      <td className="px-4 py-3 text-white/75">
                        {d.headwayMin ? `~${d.headwayMin} min` : "—"}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Today's departures + stops, per direction */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-medium">
            Stops &amp; times — today, {todayLabel}
          </h2>
          {!runsToday && (
            <p className="text-sm text-white/50 mt-2">
              Route {route.short} doesn&apos;t run today ({todayLabel}). The stop lists
              below show the route&apos;s full pattern; the schedule summary above has
              the next service days.
            </p>
          )}
          {directions.map((d) => {
            const times = directionStopTimes(net, route.id, d.dir, todayYmd);
            const deps = terminusDepartures(net, route.id, d.dir, todayYmd, tz);
            const origin = net.stopById.get(d.stopIds[0]);
            return (
              <div key={d.dir} className="mt-8">
                <h3 className="text-lg font-semibold text-white/90">
                  To {d.headsign}{" "}
                  <span className="text-white/35 text-sm font-normal">
                    · {d.stopIds.length} stops
                  </span>
                </h3>

                {runsToday && deps.length > 0 && origin && (
                  <div id={`departures-dir-${d.dir}`} className="mt-4">
                    <p className="text-sm text-white/55">
                      Departures from {origin.name} today:
                    </p>
                    <p className="flex flex-wrap gap-1.5 mt-2">
                      {deps.slice(0, 72).map((ms, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-white/12 px-2 py-1 text-xs text-white/75"
                        >
                          {formatZonedTime(ms, tz)}
                        </span>
                      ))}
                      {deps.length > 72 && (
                        <span className="rounded-md px-2 py-1 text-xs text-white/40">
                          + {deps.length - 72} more
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <ol id={`stops-dir-${d.dir}`} className="mt-5 space-y-0">
                  {d.stopIds.map((stopId, i) => {
                    const stop = net.stopById.get(stopId);
                    if (!stop) return null;
                    const t = times.get(stopId);
                    const first = t ? formatGtfsClock(t.firstSec) : null;
                    const last = t ? formatGtfsClock(t.lastSec) : null;
                    return (
                      <li
                        key={stopId}
                        id={stopAnchor(stopId)}
                        className="flex gap-3.5 py-2.5 border-b border-white/5 last:border-0 scroll-mt-24"
                      >
                        <span className="font-mono text-xs text-white/30 w-7 text-right pt-0.5 shrink-0">
                          {i + 1}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: route.color }}
                        />
                        <div>
                          <p className="text-sm text-white/85">{stop.name}</p>
                          {runsToday && first && last ? (
                            <p className="text-xs text-white/40 mt-0.5">
                              First {first.label}
                              {first.nextDay ? " (+1 day)" : ""} · Last {last.label}
                              {last.nextDay ? " (+1 day)" : ""} · {t!.calls} scheduled
                              departures
                            </p>
                          ) : (
                            <p className="text-xs text-white/40 mt-0.5">
                              Served by Route {route.short}
                              {stop.routes.length > 1 &&
                                <> · also routes {stop.routes.filter((s) => s !== route.short).join(", ")}</>}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-medium">
            {agency.name} Route {displayName} — questions
          </h2>
          <div className="mt-4 space-y-5">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-semibold text-white/90">{f.q}</h3>
                <p className="text-sm text-white/55 mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related */}
        {siblings && siblings.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl font-medium">More {groupLabel} routes</h2>
            <ul className="flex flex-wrap gap-1.5 mt-4">
              {siblings.map((r) => (
                <li key={r.id}>
                  <Link
                    href={routePath(agency.id, data.slugs.get(r.id) ?? r.id)}
                    className="inline-block rounded-md border border-white/12 px-2.5 py-1.5 text-xs text-white/75 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition"
                  >
                    {r.short} · {routeDisplayName(r).slice(r.short.length).trim() || r.short}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-12 text-xs text-white/35 leading-relaxed">
          Times on this page are the published schedule from {agency.name}&apos;s GTFS
          feed{net.feedVersion ? ` (version ${net.feedVersion})` : ""}; live status comes
          from the agency&apos;s realtime alerts feed and can differ. {creditFor(agency)}.
          Long name as published: “{longName || route.long}”. WorldEye is a free viewer —
          for fares, passes and official notices, see {agency.name}&apos;s own site.
        </p>
      </div>
      <TrialCtaSection utmSource="transit-route" />
      <SiteFooter />
    </main>
  );
}
