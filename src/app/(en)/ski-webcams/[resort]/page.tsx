import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, Camera, Car, ChevronRight, ExternalLink, Globe, GraduationCap, Map as MapIcon, MapPin, Scale, Ticket, Wrench } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import SkiCameraGrid from "@/components/SkiCameraGrid";
import SkiConditions from "@/components/SkiConditions";
import SkiRouteTool from "@/components/SkiRouteTool";
import SkiSidebar from "@/components/SkiSidebar";
import SkiTripReminderForm from "@/components/SkiTripReminderForm";
import { powderPassEnabled } from "@/lib/ski/access";
import { cameraAreas } from "@/lib/country-cameras";
import { plural } from "@/lib/country-page-content";
import { isFoldedResort, RESORT_PAGE_COUNT } from "@/lib/indexation-gates";
import { computePlaceBreakdown } from "@/lib/place-breakdown";
import { haversineKm } from "@/lib/place-neighbours";
import { AreaTable } from "@/components/directory-page";
import {
  formatArea,
  formatElevation,
  getSkiResortFacts,
} from "@/lib/ski-resort-facts";
import {
  getResortWebsiteUrl,
  getSkiResortLinks,
  getVerifiedResortDomain,
} from "@/lib/ski-resort-links";
import { popularPairFor } from "@/lib/ski-compare";
import { passesForResort } from "@/lib/ski-resort-passes";
import { getPlaceWeather } from "@/lib/place-weather";
import { stateForPoint } from "@/lib/us-states";
import {
  getSkiResort,
  isSnowStakeCamera,
  loadCountryChunk,
  selectResortCameras,
  NEARBY_RADIUS_KM,
  RESORT_RADIUS_KM,
  SKI_RESORTS,
  type SkiResort,
} from "@/lib/ski-resorts";
import type { CountryCamera } from "@/lib/country-cameras";

const BASE = "https://worldeye.app";

export function generateStaticParams() {
  /* C10 (§4.5): folded resorts (no facts row, failing camera prong)
     are listed on the /ski-webcams hub without detail pages — their
     URLs 301 to the hub from next.config.ts. */
  return SKI_RESORTS.filter(r => !isFoldedResort(r.slug)).map(r => ({
    resort: r.slug,
  }));
}

function pageTitle(r: SkiResort): string {
  return `${r.name} Webcams & Snow Report — Live Ski Cameras`;
}

/** "47.1286° N, 10.2646° E" — display arithmetic on the dataset coords. */
function formatCoordinates(lat: number, lng: number): string {
  const la = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
  const lo = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
  return `${la}, ${lo}`;
}

/* Composed from the counts the selection actually returns, so the meta
   text can never promise cameras the grid doesn't have. */
function metaDescription(r: SkiResort, resortCount: number, nearbyCount: number): string {
  return `Watch ${plural(resortCount, "live camera")} at ${r.name} (${r.town}, ${r.region}) plus ${plural(nearbyCount, "traffic camera")} on the roads around it. The live snow report: check the snow, lift lines and the drive up — and line up every camera on your route. Free, no signup.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ resort: string }>;
}): Promise<Metadata> {
  const { resort: slug } = await params;
  const r = getSkiResort(slug);
  if (!r || isFoldedResort(slug)) return { title: "Not found" };
  const url = `/ski-webcams/${slug}`;
  const description = metaDescription(r, r.resortCameraCount, r.nearbyCameraCount);
  return {
    title: pageTitle(r),
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title: pageTitle(r), description, url, type: "website" },
  };
}

async function loadSelection(r: SkiResort): Promise<{ resort: CountryCamera[]; nearby: CountryCamera[] }> {
  try {
    const records = await loadCountryChunk(r.countrySlug);
    return selectResortCameras(records, r);
  } catch {
    return { resort: [], nearby: [] };
  }
}

export default async function SkiResortPage({
  params,
}: {
  params: Promise<{ resort: string }>;
}) {
  const { resort: slug } = await params;
  const r = getSkiResort(slug);
  if (!r || isFoldedResort(slug)) notFound();

  const { resort: resortCams, nearby: nearbyCams } = await loadSelection(r);
  const facts = getSkiResortFacts(r.slug);
  const factStats: Array<{ label: string; value: string }> = facts
    ? [
        facts.baseElevationM != null && {
          label: "Base elevation",
          value: formatElevation(facts.baseElevationM),
        },
        facts.summitElevationM != null && {
          label: "Summit elevation",
          value: formatElevation(facts.summitElevationM),
        },
        facts.verticalM != null && {
          label: "Vertical drop",
          value: formatElevation(facts.verticalM),
        },
        facts.skiableHectares != null && {
          label: "Skiable terrain",
          value: formatArea(facts.skiableHectares),
        },
        facts.lifts != null && { label: "Lifts", value: String(facts.lifts) },
        facts.runs != null && { label: "Runs", value: String(facts.runs) },
      ].filter((s): s is { label: string; value: string } => Boolean(s))
    : [];
  const total = resortCams.length + nearbyCams.length;
  const areas = cameraAreas([...resortCams, ...nearbyCams]).slice(0, 5);
  /* The same-country cluster (§4.4), ordered by real distance from
     this resort instead of file order — the nearest mountains are
     the ones a visitor here plausibly skis next. */
  const others = SKI_RESORTS.filter(o => o.slug !== r.slug && o.country === r.country && !isFoldedResort(o.slug))
    .sort((a, b) => haversineKm(r.lat, r.lng, a.lat, a.lng) - haversineKm(r.lat, r.lng, b.lat, b.lng))
    .slice(0, 6);
  /* Previous / next resort pages within the same country, in hub
     order — the back-links row's wayfinding pair. */
  const countryOrdered = SKI_RESORTS.filter(o => o.country === r.country && !isFoldedResort(o.slug));
  const selfIdx = countryOrdered.findIndex(o => o.slug === r.slug);
  const prevResort = selfIdx > 0 ? countryOrdered[selfIdx - 1] : null;
  const nextResort =
    selfIdx >= 0 && selfIdx < countryOrdered.length - 1 ? countryOrdered[selfIdx + 1] : null;
  /* Access corridors (C11, §4.4): the nearby ring's cameras grouped
     by the road designation in each camera's own name — the C2/C6
     corridor parser reused unchanged. This is the drive-up check in
     table form: which corridor carries the cameras, and how many.
     Renders only where the ring is big enough and at least two
     corridors actually parse — a resort whose road cameras carry no
     designations gets no table rather than a fabricated one. */
  const nearbyBreakdown = computePlaceBreakdown(nearbyCams);
  const showCorridors =
    nearbyCams.length >= 10 && nearbyBreakdown.corridors.length >= 2;
  const corridorTail = nearbyBreakdown.unnamed + nearbyBreakdown.moreCorridors;
  /* Verified official links — buttons render only for links that were
     verified against the resort's own official site (lib/ski-resort-links). */
  const links = getSkiResortLinks(r.slug);
  const website = getResortWebsiteUrl(r.slug);
  const websiteDomain = getVerifiedResortDomain(r.slug);
  const pair = popularPairFor(r.slug);
  const passes = passesForResort(r.slug);
  const statePage = r.country === "United States" ? stateForPoint(r.lat, r.lng) : null;
  /* Current conditions from the site's weather provider (WeatherAPI via
     lib/place-weather). The block renders only when the provider returns
     a reading — there is no placeholder weather, ever. */
  const place = await getPlaceWeather({
    query: `${r.lat},${r.lng}`,
    lat: r.lat,
    lng: r.lng,
  }).catch(() => null);
  const now = place?.weather?.current ?? null;
  const canonical = `${BASE}/ski-webcams/${r.slug}`;

  const faqs = [
    {
      q: `How many live cameras are there at ${r.name} on WorldEye?`,
      a: `${plural(resortCams.length, "camera")} within ${RESORT_RADIUS_KM} km of the ${r.name} base area, plus ${plural(nearbyCams.length, "traffic and road camera")} within ${NEARBY_RADIUS_KM} km — all from the same live catalogue that powers the WorldEye globe, and all listed on this page.`,
    },
    {
      q: `Can I see road conditions for the drive to ${r.name}?`,
      a: `Yes — the traffic cameras below watch the access roads and valley corridors around ${r.town}. WorldEye shows you the roads themselves rather than an official conditions report, and the route tool on this page lines up every camera along your specific drive, in the order you'll pass them. For chain laws and closures, check the official DOT as well.`,
    },
    {
      q: `Can I check the cameras along my whole route to ${r.name}?`,
      a: "Yes. Enter your starting address in the route tool above — the destination is already set to the resort — and it plans the drive and lists every live camera within 2.5 km of the route, ordered by how far into the drive each one is. It works without an account.",
    },
    {
      q: `Are the ${r.name} webcams free to watch?`,
      a: "Yes — browsing this page needs no account, and every feed here is the camera's real live stream or snapshot from its operator. A camera whose stream has gone off air shows as unavailable rather than playing a recording.",
    },
    {
      q: "When should I check — the night before or the morning of?",
      a: "Both. The night before, the slope cameras show the storm total and whether the grooming fleet is out. The morning of, check the base for lift lines and the access-road cameras before you leave the driveway — the drive is half the ski day.",
    },
    {
      q: `Where do I find the official ${r.name} snow report?`,
      a: `WorldEye doesn't publish its own snow report — the cameras and the conditions block on this page show what's actually on the ground. For ${r.name}'s official snow report, grooming report and lift status, use the resort's own channels${websiteDomain ? ` (${websiteDomain})` : ""} — lift and terrain status only ever comes from the resort itself.`,
    },
    ...(passes.length > 0
      ? [
          {
            q: `Is ${r.name} on a multi-resort pass?`,
            a: `${r.name} is included in the ${passes.join(" and ")} programme${passes.length > 1 ? "s" : ""}. Access terms — days included, blackout dates, reservations — are set by the pass programme and change by season, so check the official pass site or ${r.name}'s own pages before you travel.`,
          },
        ]
      : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: pageTitle(r),
        description: metaDescription(r, resortCams.length, nearbyCams.length),
        url: canonical,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: resortCams.length,
          itemListElement: resortCams.slice(0, 20).map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: s.city ? `${s.name} — ${s.city}` : s.name,
            url: `${BASE}/?camera=${s.id}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
          { "@type": "ListItem", position: 2, name: "Ski webcams", item: `${BASE}/ski-webcams` },
          { "@type": "ListItem", position: 3, name: r.name, item: canonical },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(f => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "SkiResort",
        name: r.name,
        url: website ?? canonical,
        address: {
          "@type": "PostalAddress",
          addressLocality: r.town,
          addressRegion: r.region,
          addressCountry: r.country,
        },
        geo: { "@type": "GeoCoordinates", latitude: r.lat, longitude: r.lng },
      },
    ],
  };

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/45 mb-10">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/ski-webcams" className="hover:text-white transition">Ski webcams</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">{r.name}</span>
        </nav>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> LIVE RESORT CAMERAS
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{r.name} Webcams &amp; Snow Report</h1>
          <p className="mt-4 text-white/55 flex items-center justify-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#00E5FF]" />
            {r.town}, {r.region} · {r.country}
          </p>
          <p className="mt-3 text-white/55">
            Snow on the slopes, lines at the base and the state of the drive up — live, free, no signup.
          </p>
        </div>

        {/* Stat row */}
        <div className="mt-10 grid grid-cols-3 gap-3 max-w-2xl mx-auto text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-2xl md:text-3xl font-bold text-[#D4AF37]">{resortCams.length.toLocaleString("en-US")}</div>
            <div className="text-xs text-white/45 mt-1">resort cameras · within {RESORT_RADIUS_KM} km</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-2xl md:text-3xl font-bold text-[#D4AF37]">{nearbyCams.length.toLocaleString("en-US")}</div>
            <div className="text-xs text-white/45 mt-1">road cameras · within {NEARBY_RADIUS_KM} km</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-2xl md:text-3xl font-bold text-[#D4AF37]">{total.toLocaleString("en-US")}</div>
            <div className="text-xs text-white/45 mt-1">cameras on this page</div>
          </div>
        </div>

        {/* Content + ski sidebar rail: the sidebar carries the
            section navigation and (once lit) the Powder Pass promo,
            so the page renders exactly one promo — here in the rail
            instead of a standalone block further down. */}
        <div className="mt-12 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10 lg:items-start">
          <div className="mb-10 lg:mb-0">
            <SkiSidebar resorts={SKI_RESORTS} showPowder={powderPassEnabled(process.env)} variant="resort" />
          </div>
          <div className="min-w-0">
        {/* Route tool — first on the page: the drive is the first
            decision of a ski day, so the planner leads. */}
        <section id="drive" className="scroll-mt-24">
          <h2 className="text-xl md:text-2xl font-bold mb-5">Plan the drive to {r.name}</h2>
          <SkiRouteTool resort={r} />
        </section>

        {/* Intro — composed from the camera mix the catalogue actually holds */}
        <div className="mt-10 space-y-4 text-white/70 leading-relaxed max-w-3xl mx-auto">
          <p>
            WorldEye&apos;s live index holds {plural(total, "camera")} around {r.name} — resort feeds,
            town cameras and the highway cameras on the corridors into {r.town}, all watchable free below
            and on the globe.
            {areas.length > 0 && (
              <>
                {" "}The biggest clusters are in {areas.map(a => a.name).join(", ")} — the grid starts at
                the mountain and works outward, so the slope and base feeds come first.
              </>
            )}
          </p>
          <p>
            Read the rest of the page the way you&apos;d plan the day: conditions and official alerts,
            then the resort cameras for snow and lift lines — snow-stake cameras lead that grid, because
            the stake is the overnight snowfall answer — then the road cameras on the corridors around{" "}
            {r.town}.
          </p>
        </div>

        {/* Trip reminders (P9a) — book-ahead email nudges for a
            planned trip to this resort; reminders only, no booking. */}
        <section id="reminders" className="mt-12 scroll-mt-24">
          <h2 className="text-xl md:text-2xl font-bold mb-5">Trip reminders</h2>
          <SkiTripReminderForm resort={{ slug: r.slug, name: r.name }} />
        </section>

        {/* Conditions */}
        <section id="conditions" className="mt-12 scroll-mt-24">
          <h2 className="text-xl md:text-2xl font-bold mb-5">Conditions and road conditions</h2>
          {now && (
            <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 max-w-3xl">
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                {now.tempC != null && (
                  <span className="text-3xl font-bold">
                    {Math.round(now.tempC)}°C{now.tempF != null ? ` / ${Math.round(now.tempF)}°F` : ""}
                  </span>
                )}
                {now.condition && <span className="text-white/85 font-medium">{now.condition.text}</span>}
                {now.feelsLikeC != null && (
                  <span className="text-sm text-white/50">Feels like {Math.round(now.feelsLikeC)}°C</span>
                )}
                {now.windKph != null && (
                  <span className="text-sm text-white/50">Wind {Math.round(now.windKph)} km/h</span>
                )}
                {now.humidity != null && (
                  <span className="text-sm text-white/50">Humidity {now.humidity}%</span>
                )}
              </div>
              <p className="mt-3 text-xs text-white/40">
                Current conditions near {r.town} from WeatherAPI.com
                {now.lastUpdated ? `, updated ${now.lastUpdated}` : ""}. Snowfall totals and lift
                status are on {r.name}&apos;s official snow report — WorldEye shows the live
                cameras and weather, never an invented snow report.
              </p>
            </div>
          )}
          <SkiConditions resort={r} />
        </section>

        {/* About the resort — hand-sourced facts for this one mountain */}
        {facts && (factStats.length > 0 || (facts.about && facts.about.length > 0) || facts.access) && (
          <section className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-5">About {r.name}</h2>
            {factStats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl">
                {factStats.map(s => (
                  <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-base md:text-lg font-bold text-white/90">{s.value}</div>
                    <div className="text-xs text-white/45 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {facts.about && facts.about.length > 0 && (
              <div className="mt-6 space-y-4 text-white/70 leading-relaxed max-w-3xl">
                {facts.about.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
            {facts.access && (
              <div className="mt-6 max-w-3xl">
                <h3 className="font-semibold text-white/90 mb-2">Road conditions to {r.name} — the drive in</h3>
                <p className="text-white/70 leading-relaxed">{facts.access}</p>
              </div>
            )}
          </section>
        )}

        {/* Resort information — base data held for every resort, plus
            the resort's verified official links. A link button renders
            only when that link was verified against the resort's own
            official website; nothing here is a guessed URL. */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">Resort information &amp; official links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-base md:text-lg font-bold text-white/90">{r.town}</div>
              <div className="text-xs text-white/45 mt-1">Town · {r.region}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-base md:text-lg font-bold text-white/90">{r.country}</div>
              <div className="text-xs text-white/45 mt-1">Country</div>
            </div>
            {passes.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-base md:text-lg font-bold text-white/90">
                  {passes.map(p => (
                    <span key={p} className="block">{p}</span>
                  ))}
                </div>
                <div className="text-xs text-white/45 mt-1">Season pass programme{passes.length > 1 ? "s" : ""}</div>
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-base md:text-lg font-bold text-white/90">{formatCoordinates(r.lat, r.lng)}</div>
              <div className="text-xs text-white/45 mt-1">Base area coordinates</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-base md:text-lg font-bold text-white/90">{r.resortCameraCount.toLocaleString("en-US")}</div>
              <div className="text-xs text-white/45 mt-1">Resort cameras · within {RESORT_RADIUS_KM} km</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-base md:text-lg font-bold text-white/90">{r.nearbyCameraCount.toLocaleString("en-US")}</div>
              <div className="text-xs text-white/45 mt-1">Road cameras · within {NEARBY_RADIUS_KM} km</div>
            </div>
            {websiteDomain && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-base md:text-lg font-bold text-white/90 break-all">{websiteDomain}</div>
                <div className="text-xs text-white/45 mt-1">Official website</div>
              </div>
            )}
          </div>

          {(website || links) && (
            <div className="mt-5 flex flex-wrap gap-3">
              {links?.tickets && (
                <a
                  href={links.tickets}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
                >
                  <Ticket className="w-4 h-4" /> Buy lift tickets
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
              )}
              {links?.trailMap && (
                <a
                  href={links.trailMap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
                >
                  <MapIcon className="w-4 h-4 text-[#D4AF37]" /> Trail map
                  <ExternalLink className="w-3.5 h-3.5 text-white/35" />
                </a>
              )}
              {links?.lodging && (
                <a
                  href={links.lodging}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
                >
                  <BedDouble className="w-4 h-4 text-[#D4AF37]" /> Lodging
                  <ExternalLink className="w-3.5 h-3.5 text-white/35" />
                </a>
              )}
              {links?.lessons && (
                <a
                  href={links.lessons}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
                >
                  <GraduationCap className="w-4 h-4 text-[#D4AF37]" /> Ski lessons
                  <ExternalLink className="w-3.5 h-3.5 text-white/35" />
                </a>
              )}
              {links?.rentals && (
                <a
                  href={links.rentals}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
                >
                  <Wrench className="w-4 h-4 text-[#D4AF37]" /> Gear rentals
                  <ExternalLink className="w-3.5 h-3.5 text-white/35" />
                </a>
              )}
              {links?.parking && (
                <a
                  href={links.parking}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
                >
                  <Car className="w-4 h-4 text-[#D4AF37]" /> Parking
                  <ExternalLink className="w-3.5 h-3.5 text-white/35" />
                </a>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
                >
                  <Globe className="w-4 h-4 text-[#D4AF37]" /> Official website
                  <ExternalLink className="w-3.5 h-3.5 text-white/35" />
                </a>
              )}
            </div>
          )}
          {(website || links) && (
            <p className="mt-4 text-sm text-white/45 max-w-3xl">
              These links go to {r.name}&apos;s official website — WorldEye doesn&apos;t sell lift
              tickets or lodging. They&apos;re here so checking the cameras and booking the day
              happen in one trip.
            </p>
          )}
          <p className="mt-4 text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/ski-webcams/compare?a=${r.slug}`}
              className="inline-flex items-center gap-1.5 font-semibold text-[#00E5FF] hover:underline"
            >
              <Scale className="w-4 h-4" /> Compare {r.name} with another resort
            </Link>
            {pair && (
              <>
                <span className="text-white/30">·</span>
                <Link
                  href={`/ski-webcams/compare/${pair.pair}`}
                  className="font-semibold text-[#00E5FF] hover:underline"
                >
                  {r.name} vs {pair.other.name}
                </Link>
              </>
            )}
          </p>
        </section>

        {/* Resort cameras */}
        <section id="cameras" className="mt-12 scroll-mt-24">
          <h2 className="text-xl md:text-2xl font-bold mb-2">{r.name} live cameras</h2>
          <p className="text-sm text-white/50 mb-5 max-w-3xl">
            Every camera within {RESORT_RADIUS_KM} km of the {r.name} base area, nearest first — slopes,
            lifts, the village and the top of the access road. Snow-stake cameras sit at the top of the
            grid, labelled — open a snow stake feed to set a snowfall alert for it, the same camera
            alerts as everywhere on WorldEye. Open any feed to watch it in full.
          </p>
          <SkiCameraGrid
            cameras={resortCams}
            captions={Object.fromEntries(
              resortCams.filter(cam => isSnowStakeCamera(cam)).map(cam => [cam.id, "Snow stake"] as const),
            )}
            emptyNote={`No cameras within ${RESORT_RADIUS_KM} km of ${r.name} are in the live index right now — the road cameras below still cover the area.`}
          />
        </section>

        {/* Access corridors (C11, §4.4) — the drive-up check, grouped
            by the road each camera watches */}
        {showCorridors && (
          <AreaTable
            title={`The drive up — ${r.name}'s access corridors`}
            rows={[
              ...nearbyBreakdown.corridors,
              ...(corridorTail > 0
                ? [{ name: "All other road cameras — local streets & unnamed feeds", count: corridorTail }]
                : []),
            ]}
            note={`Counts are the ${plural(nearbyCams.length, "road camera")} in the ${NEARBY_RADIUS_KM} km ring around ${r.name} — the same set the grid below serves — grouped by the road designation in each camera's own name. Find your corridor here, then watch its cameras in the grid before you leave.`}
          />
        )}

        {/* Nearby traffic cameras */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Traffic cameras near {r.name}</h2>
          <p className="text-sm text-white/50 mb-5 max-w-3xl">
            The {NEARBY_RADIUS_KM} km ring around {r.name}: the valley highways, the passes and the towns
            the drive passes through, nearest first. These are the feeds that show chain controls, plowed
            lanes and storm-day backups before you&apos;re in them.
          </p>
          <SkiCameraGrid
            cameras={nearbyCams}
            initial={12}
            emptyNote={`No traffic cameras in the ${NEARBY_RADIUS_KM} km ring are in the live index right now.`}
          />
        </section>

        {/* The Powder Pass promo renders in this page's sidebar rail
            (see SkiSidebar) — exactly one instance per page. */}

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">{r.name} webcams — FAQ</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 font-semibold text-sm hover:bg-white/[0.03]">
                  {f.q}
                  <span className="text-[#D4AF37] group-open:rotate-45 transition-transform text-xl leading-none shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-white/60 leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Other resorts */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">More ski resorts with live cameras</h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <li>
              <Link
                href="/ski-webcams"
                className="block rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] p-4 hover:bg-[#D4AF37]/[0.1] transition"
              >
                <span className="font-semibold text-sm">All ski resorts</span>
                <span className="block text-xs text-white/45 mt-1">
                  {RESORT_PAGE_COUNT} resorts with live camera pages
                </span>
              </Link>
            </li>
            {others.map(o => (
              <li key={o.slug}>
                <Link
                  href={`/ski-webcams/${o.slug}`}
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
                >
                  <span className="font-semibold text-sm">{o.name}</span>
                  <span className="block text-xs text-white/45 mt-1">
                    {o.town}, {o.region} · {plural(o.resortCameraCount + o.nearbyCameraCount, "camera")}
                  </span>
                </Link>
              </li>
            ))}
            {statePage && (
              <li>
                <Link
                  href={`/us-traffic-cameras/${statePage.slug}`}
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
                >
                  <span className="font-semibold text-sm">All {statePage.name} road cameras</span>
                  <span className="block text-xs text-white/45 mt-1">Statewide traffic &amp; road cameras</span>
                </Link>
              </li>
            )}
            <li>
              <Link
                href={`/cameras/countries/${r.countrySlug}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
              >
                <span className="font-semibold text-sm">All {r.country} cameras</span>
                <span className="block text-xs text-white/45 mt-1">The full country index</span>
              </Link>
            </li>
          </ul>
        </section>

        <TrialCtaSection utmSource="ski-resort" />

        {/* Back links */}
        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/ski-webcams"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4" /> All ski resorts
          </Link>
          <a
            href={BASE}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            <Camera className="w-4 h-4" /> Open the live map
          </a>
          {prevResort && (
            <Link
              href={`/ski-webcams/${prevResort.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
            >
              <ArrowLeft className="w-4 h-4" /> {prevResort.name}
            </Link>
          )}
          {nextResort && (
            <Link
              href={`/ski-webcams/${nextResort.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
            >
              {nextResort.name} <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
