import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, ChevronRight, MapPin } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import CountryCameraExplorer from "@/components/CountryCameraExplorer";
import ViewOnGlobeButton from "@/components/ViewOnGlobeButton";
import CountryCitySearch from "@/components/CountryCitySearch";
import countriesIndex from "@/data/camera-countries.json";
import { countryContentB, type CountryContent } from "@/data/country-content-b";
import { countryContentC } from "@/data/country-content-c";
import { countryContentD } from "@/data/country-content-d";
import { countryContentE } from "@/data/country-content-e";
import {
  countryFacts,
  detailParagraphs,
  extraFaqs,
  loadCountryRecords,
  plural,
  regionLinks,
  roster,
  watchGuide,
} from "@/lib/country-page-content";
import { cameraAreas, type CountryCamera } from "@/lib/country-cameras";
import { withDerivedCities } from "@/lib/us-places";
import { US_STATE_META } from "@/lib/us-states";
import VoiceQA from "@/components/seo/VoiceQA";
import { countryAnswers, mergePlaceFaqs } from "@/lib/place-answers";
import { getPlaceWeather } from "@/lib/place-weather";
import PlaceWeatherPanel from "@/components/PlaceWeatherPanel";
import CurrentStatus from "@/components/CurrentStatus";
import { countryStatusRows } from "@/lib/place-breakdown";
import SaveLocationButton from "@/components/SaveLocationButton";

/* Weather data is cached per location for 30 minutes in lib/weather-api;
   ISR at the same cadence keeps the baked page from going staler. */
export const revalidate = 1800;

const BASE = "https://worldeye.app";

const CONTENT: Record<string, CountryContent> = {
  ...countryContentB,
  ...countryContentC,
  ...countryContentD,
  ...countryContentE,
};

/* Every country's counts, areas and samples come from the generated index
   (tools/build-country-pages.mjs, derived from the served catalogue) —
   never hand-written numbers, so a page cannot drift from the catalogue. */
interface CountryEntry {
  slug: string;
  name: string;
  count: number;
  aliases: string[];
  topCities: Array<{ name: string; count: number }>;
  cityCount: number;
  samples: Array<{ id: string; name: string; city: string }>;
}

const COUNTRIES = (countriesIndex as { countries: CountryEntry[] }).countries;

function getCountry(slug: string): CountryEntry | undefined {
  return COUNTRIES.find((c) => c.slug === slug);
}

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ country: c.slug }));
}

function pageTitle(c: CountryEntry): string {
  const t = `${c.name} Live Cameras — ${c.count.toLocaleString("en-US")} Street Cams`;
  if (t.length <= 60) return t;
  return `${c.name} Live Cameras`;
}

/* Meta descriptions are composed from the live-derived numbers for every
   country — the hand-written blurbs in the content files were written
   against older snapshots and several cite counts that no longer hold. */
function metaDescription(c: CountryEntry): string {
  const top = c.topCities.slice(0, 3).map((a) => a.name);
  const where = top.length > 0 ? `, including ${top.join(", ")}` : "";
  return `Watch ${plural(c.count, "live camera")} across ${c.name}${where}. Free live street, traffic, weather and city webcams on the WorldEye globe — no signup to browse.`;
}

/* For countries without hand-written content: an honest intro composed
   from the same derived numbers (no invented colour, no guessed facts). */
function derivedIntro(c: CountryEntry): string[] {
  const top = c.topCities.slice(0, 4).map((a) => a.name);
  const areasLine =
    c.topCities.length > 0
      ? `The largest clusters are in ${top.join(", ")}${c.cityCount > c.topCities.length ? `, with cameras spread across ${c.cityCount.toLocaleString("en-US")} named areas in total` : ""}.`
      : "The cameras are spread across the country rather than clustered in one place.";
  return [
    `WorldEye's live index holds ${plural(c.count, "camera")} in ${c.name} — public feeds from transport agencies, weather networks, resorts, harbours and city operators, all watchable free in the grid below and on the globe. ${areasLine}`,
    "Every card below is the camera's actual live feed, grouped by area with the largest first. Search the whole country, filter by area, and open any camera to watch it in full. The index is rebuilt from the same catalogue that powers the WorldEye globe, so the count on this page is the count the globe serves.",
  ];
}

function derivedFaqs(c: CountryEntry): Array<{ q: string; a: string }> {
  const top = c.topCities[0];
  return [
    {
      q: `How many live cameras are there in ${c.name} on WorldEye?`,
      a: `${c.count.toLocaleString("en-US")} — every camera for ${c.name} in the same live catalogue that powers the WorldEye globe, listed in the grid on this page. The count is derived from the catalogue when the index is built, never estimated.`,
    },
    {
      q: `Which areas of ${c.name} have the most cameras?`,
      a: top
        ? `${top.name} has the most, with ${plural(top.count, "camera")}${c.topCities[1] ? `, followed by ${c.topCities[1].name} (${plural(c.topCities[1].count, "camera")})` : ""}. Use the area filters above the grid to browse one area at a time.`
        : `The cameras are spread across ${c.name} rather than concentrated in one area; the grid groups them by area where the catalogue names one.`,
    },
    {
      q: `Is it free to watch ${c.name} cameras?`,
      a: "Yes — browsing the grid needs no account, and your first five camera opens on a device are free. The feeds belong to their operators and public sources; a camera whose stream has gone off air shows as unavailable rather than playing a recording.",
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country: slug } = await params;
  const c = getCountry(slug);
  /* Unknown slug → real 404: this route does not inherit the city routes'
     200-with-"Not found" quirk — with no directory entry there is no
     page, and notFound() below says so. */
  if (!c) return { title: "Not found" };
  const url = `/cameras/countries/${slug}`;
  return {
    title: pageTitle(c),
    description: metaDescription(c),
    alternates: { canonical: `${BASE}${url}` },
    openGraph: {
      title: pageTitle(c),
      description: metaDescription(c),
      url,
      type: "website",
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Rotated "how to watch" variants so pages don't read as stamped copies.
const HOW_TO: string[][] = [
  [
    "Open the WorldEye live map — no account or download needed.",
    "Zoom to the country and tap any green camera dot to start its live feed.",
    "Use the search to jump straight to a city, road, or landmark.",
  ],
  [
    "Head to the free WorldEye globe in your browser.",
    "Find the country on the map — camera markers appear as green dots.",
    "Click a dot to watch that camera's live stream instantly.",
  ],
  [
    "Launch the WorldEye map — it works on phone and desktop, free.",
    "Pan and zoom until green camera markers come into view.",
    "Select any marker to open its live camera feed.",
  ],
];

function howToFor(slug: string): string[] {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return HOW_TO[h % HOW_TO.length];
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country: slug } = await params;
  const c = getCountry(slug);
  if (!c) notFound();

  /* The country's full record set (the same chunks the explorer API
     serves) drives the depth sections below: source networks, feed kinds,
     camera mix, spread and rank are computed from the records, so even a
     one-camera country gets a true page about its one camera. A load
     failure degrades to the index-only page rather than breaking it. */
  let records: CountryCamera[] = [];
  try {
    records = await loadCountryRecords(slug);
  } catch {
    records = [];
  }
  const facts = countryFacts(c, records, COUNTRIES);
  const detail = detailParagraphs(c, facts);
  /* The search-by-city box's list: EVERY area the catalogue holds for
     this country (from the same records the depth sections compute
     from), biggest first — not just the explorer's top-24 chips. If the
     records failed to load, the index's top areas are the fallback.
     For the United States the derived places are substituted first:
     DOT feeds file thousands of cameras under the state name ("Utah"),
     and the search must offer the real cities those cameras sit in
     (lib/us-places). The explorer API applies the same substitution
     server-side, so a pick here filters to the same cameras. */
  const cityList =
    records.length > 0
      ? cameraAreas(slug === "united-states" ? withDerivedCities(records) : records)
      : c.topCities;
  /* US visitors type the state with the city ("ogden utah", "Ogden,
     UT") — the search box accepts and strips state-name/USPS suffixes
     only on this page. */
  const citySearchSuffixes =
    slug === "united-states"
      ? US_STATE_META.flatMap((s) => [s.name, s.usps])
      : undefined;
  const region = regionLinks(slug, COUNTRIES);
  const guide = watchGuide(c, facts, region);
  const fullRoster = roster(c, records);

  /* Weather / alerts / AQI for the country's largest camera city — a
     clean no-op (null) unless WEATHERAPI_KEY and/or OPENAQ_API_KEY are
     configured and the provider answers. A country has no single
     weather, so the reading is explicitly for that city: the query, the
     panel heading and the provider's own location name all say so. The
     city's centroid (from its camera records) drives the OpenAQ
     station lookup when available. */
  const weatherCity = c.topCities[0]?.name ?? c.name;
  const cityRecords = records.filter(
    (r) => r.city === weatherCity && typeof r.lat === "number" && typeof r.lng === "number",
  );
  const weatherCentroid =
    cityRecords.length > 0
      ? {
          lat: cityRecords.reduce((s, r) => s + (r.lat as number), 0) / cityRecords.length,
          lng: cityRecords.reduce((s, r) => s + (r.lng as number), 0) / cityRecords.length,
        }
      : null;
  const placeWeather = await getPlaceWeather({
    query: `${weatherCity}, ${c.name}`,
    lat: weatherCentroid?.lat ?? null,
    lng: weatherCentroid?.lng ?? null,
  });

  const content = CONTENT[slug];
  const intro = content?.intro ?? derivedIntro(c);
  const faqs = content?.faqs ?? [...derivedFaqs(c), ...extraFaqs(c, facts)];
  /* Data-bound "Questions people ask" entries (src/lib/place-answers.ts,
     ROLLOUT-SPEC §3 merge): appended to the template FAQs for the single
     FAQPage below; the visible block renders exactly the survivors. */
  const placeMerged = mergePlaceFaqs(faqs, countryAnswers(c));

  const canonical = `${BASE}/cameras/countries/${slug}`;
  const updated = formatDate((countriesIndex as { generatedAt: string }).generatedAt);
  const steps = howToFor(slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: pageTitle(c),
        description: metaDescription(c),
        url: canonical,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: c.samples.length,
          itemListElement: c.samples.map((s, i) => ({
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
          { "@type": "ListItem", position: 2, name: "Cameras", item: `${BASE}/cameras` },
          { "@type": "ListItem", position: 3, name: "Countries", item: `${BASE}/cameras/countries` },
          { "@type": "ListItem", position: 4, name: c.name, item: canonical },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: placeMerged.merged.map((f) => ({
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
          <Link href="/cameras" className="hover:text-white transition">Cameras</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/cameras/countries" className="hover:text-white transition">Countries</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">{c.name}</span>
          <span className="ml-auto -my-1">
            <LanguageHeaderControl variant="mobile" />
          </span>
        </nav>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> LIVE CAMERA NETWORK
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            {c.name} Live Street Cameras
          </h1>
          <p className="mt-4 text-white/55">
            Watch {plural(c.count, "live camera")} across {c.name} — free on the WorldEye globe.
          </p>
          <div className="mt-6 flex justify-center">
            <SaveLocationButton
              entry={{
                kind: "place",
                key: `country:${slug}`,
                label: c.name,
                href: `/cameras/countries/${slug}`,
              }}
              saveLabel="Save this country"
            />
          </div>
          <CountryCitySearch countryName={c.name} cities={cityList} searchSuffixes={citySearchSuffixes} />
        </div>

        {/* Stat row */}
        <div className="mt-10 grid grid-cols-3 gap-3 max-w-2xl mx-auto text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {/* data-country-live-cameras: the explorer re-syncs this tile
                from its first unfiltered batch total (the same generated
                derivation) once loaded — see CountryCameraExplorer. */}
            <div className="text-2xl md:text-3xl font-bold text-[#D4AF37]" data-country-live-cameras>{c.count.toLocaleString("en-US")}</div>
            <div className="text-xs text-white/45 mt-1">live cameras</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-2xl md:text-3xl font-bold text-[#D4AF37]">{c.cityCount.toLocaleString("en-US")}</div>
            <div className="text-xs text-white/45 mt-1">areas covered</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-2xl md:text-3xl font-bold text-[#D4AF37]">{c.samples.length}</div>
            <div className="text-xs text-white/45 mt-1">featured feeds</div>
          </div>
        </div>
        <p className="text-center text-xs text-white/30 mt-4">Camera index last updated {updated}.</p>

        {/* Intro */}
        <div className="mt-10 space-y-4 text-white/70 leading-relaxed max-w-3xl mx-auto">
          {intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* Weather for the largest camera city (see placeWeather above) */}
        {placeWeather && (
          <div className="max-w-3xl mx-auto">
            <PlaceWeatherPanel data={placeWeather} placeName={weatherCity} />
          </div>
        )}

        {/* Current Status (SEO template upgrade): the snow/traffic
            questions answered only from the snapshot above — framed on
            the largest camera city, as the panel is — plus the live
            camera counts. No snapshot, no asserted conditions. */}
        <div className="max-w-3xl mx-auto">
          <CurrentStatus
            place={c.name}
            rows={countryStatusRows({
              countryName: c.name,
              count: c.count,
              weatherCity,
              weatherCityCount: c.topCities[0]?.count ?? null,
              isUS: slug === "united-states",
              weather: placeWeather,
            })}
          />
        </div>

        {/* Playable cameras — every record for this country in the live
            catalogue, served in batches by /api/cctv/country/<slug> and
            playable in the globe's own viewer without leaving the page.
            Every country in the catalogue gets this grid. */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Watch {c.name} cameras live</h2>
          <p className="text-sm text-white/50 mb-5 max-w-3xl">
            Every camera in the live WorldEye index for {c.name}. Search or filter by area,
            then open any feed to watch it here — no trip to the map required.
          </p>
          <CountryCameraExplorer country={c.slug} countryName={c.name} />
        </section>

        {/* Top areas */}
        {c.topCities.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-5">Top areas in {c.name}</h2>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-white/40 border-b border-white/10 bg-white/[0.02]">
                    <th className="px-5 py-3 font-semibold">Area</th>
                    <th className="px-5 py-3 font-semibold text-right">Cameras</th>
                  </tr>
                </thead>
                <tbody>
                  {c.topCities.map((a) => (
                    <tr key={a.name} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3">{a.name}</td>
                      <td className="px-5 py-3 text-right font-mono text-[#D4AF37]">{a.count.toLocaleString("en-US")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* The network in detail — computed from this country's records:
            source networks, feed kinds, camera mix, spread and rank. */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">The {c.name} camera network in detail</h2>
          <div className="space-y-4 text-white/70 leading-relaxed max-w-3xl">
            {detail.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* Featured cameras */}
        {c.samples.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-5">Featured live cameras</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {c.samples.map((s) => (
                <li key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{s.name}</div>
                    {s.city && <div className="text-xs text-white/45">{s.city}</div>}
                    <div className="mt-2">
                      <ViewOnGlobeButton cameraId={s.id} cameraName={s.name} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Full roster — small countries the featured samples don't
            exhaust get every camera named on the page. */}
        {fullRoster && (
          <section className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Every indexed camera in {c.name}</h2>
            <p className="text-sm text-white/50 mb-5 max-w-3xl">
              The featured cards above are a selection — this is the complete index for {c.name},
              all {fullRoster.length} cameras, exactly as the catalogue holds them.
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {fullRoster.map((r) => (
                <li key={r.id} className="flex items-center gap-2 border-b border-white/5 py-2">
                  <span className="text-white/80 min-w-0 truncate">{r.name}</span>
                  {r.city && <span className="text-xs text-white/40 shrink-0">{r.city}</span>}
                  <span className="ml-auto shrink-0">
                    <ViewOnGlobeButton cameraId={r.id} cameraName={r.name} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* How to watch */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">How to watch {c.name} cameras live</h2>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-4 items-start rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-white/70 text-sm pt-1">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* What people watch — grounded in the camera mix the data shows */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">What people watch in {c.name}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {guide.map((g, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-semibold text-sm mb-2">{g.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{g.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">{c.name} cameras — FAQ</h2>
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

        {/* Questions people ask — data-bound entries, merged into the
            single FAQPage above (survivors only, so visible == schema) */}
        {placeMerged.surviving.length > 0 && (
          <VoiceQA entries={placeMerged.surviving} />
        )}

        {/* More cameras in the region — real sibling countries, real counts */}
        {region && region.siblings.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-2">More live cameras in {region.label}</h2>
            <p className="text-sm text-white/50 mb-5 max-w-3xl">
              {c.name} is part of the {region.label} network in the WorldEye index. These are the
              largest neighbouring country networks — or open the{" "}
              <Link href="/cameras/countries" className="text-[#00E5FF] hover:underline">
                full country index
              </Link>{" "}
              to browse all {COUNTRIES.length} countries.
            </p>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {region.siblings.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/cameras/countries/${s.slug}`}
                    className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
                  >
                    <span className="font-semibold text-sm">{s.name}</span>
                    <span className="block text-xs text-white/45 mt-1">
                      {plural(s.count, "live camera")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {region.hub && (
              <p className="text-sm text-white/50 mt-5">
                Prefer the map view? The{" "}
                <Link href={region.hub.href} className="text-[#00E5FF] hover:underline">
                  {region.hub.label}
                </Link>{" "}
                page gathers the region's cameras the same way this page gathers {c.name}'s.
              </p>
            )}
          </section>
        )}

        <TrialCtaSection utmSource="cameras-country" />

        {/* Back links */}
        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/cameras/countries"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4" /> All countries
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
