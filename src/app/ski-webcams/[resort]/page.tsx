import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, ChevronRight, MapPin } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import SkiCameraGrid from "@/components/SkiCameraGrid";
import SkiConditions from "@/components/SkiConditions";
import SkiRouteTool from "@/components/SkiRouteTool";
import { cameraAreas } from "@/lib/country-cameras";
import { plural } from "@/lib/country-page-content";
import {
  formatArea,
  formatElevation,
  getSkiResortFacts,
} from "@/lib/ski-resort-facts";
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
  return SKI_RESORTS.map(r => ({ resort: r.slug }));
}

function pageTitle(r: SkiResort): string {
  return `${r.name} Ski Webcams — Live Resort & Road Cameras`;
}

/* Composed from the counts the selection actually returns, so the meta
   text can never promise cameras the grid doesn't have. */
function metaDescription(r: SkiResort, resortCount: number, nearbyCount: number): string {
  return `Watch ${plural(resortCount, "live camera")} at ${r.name} (${r.town}, ${r.region}) plus ${plural(nearbyCount, "traffic camera")} on the roads around it. Check snow, lift lines and the drive up — and line up every camera on your route. Free, no signup.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ resort: string }>;
}): Promise<Metadata> {
  const { resort: slug } = await params;
  const r = getSkiResort(slug);
  if (!r) return { title: "Not found" };
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
  if (!r) notFound();

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
  const others = SKI_RESORTS.filter(o => o.slug !== r.slug && o.country === r.country).slice(0, 6);
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
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{r.name} Ski Webcams</h1>
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

        {/* Route tool — first on the page: the drive is the first
            decision of a ski day, so the planner leads. */}
        <section className="mt-12">
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

        {/* Conditions */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">Conditions and road conditions</h2>
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

        {/* Resort cameras */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-2">{r.name} live cameras</h2>
          <p className="text-sm text-white/50 mb-5 max-w-3xl">
            Every camera within {RESORT_RADIUS_KM} km of the {r.name} base area, nearest first — slopes,
            lifts, the village and the top of the access road. Snow-stake cameras sit at the top of the
            grid, labelled. Open any feed to watch it in full.
          </p>
          <SkiCameraGrid
            cameras={resortCams}
            caption={cam => (isSnowStakeCamera(cam) ? "Snow stake" : null)}
            emptyNote={`No cameras within ${RESORT_RADIUS_KM} km of ${r.name} are in the live index right now — the road cameras below still cover the area.`}
          />
        </section>

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
                  {SKI_RESORTS.length} resorts with live camera pages
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
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
