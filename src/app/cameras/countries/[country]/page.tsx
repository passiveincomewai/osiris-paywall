import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, ChevronRight, MapPin } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import CountryCameraExplorer from "@/components/CountryCameraExplorer";
import countriesIndex from "@/data/camera-countries.json";
import { countryContentB, type CountryContent } from "@/data/country-content-b";
import { countryContentC } from "@/data/country-content-c";
import { countryContentD } from "@/data/country-content-d";
import { countryContentE } from "@/data/country-content-e";

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
  return `Watch ${c.count.toLocaleString("en-US")} live cameras across ${c.name}${where}. Free live street, traffic, weather and city webcams on the WorldEye globe — no signup to browse.`;
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
    `WorldEye's live index holds ${c.count.toLocaleString("en-US")} cameras in ${c.name} — public feeds from transport agencies, weather networks, resorts, harbours and city operators, all watchable free in the grid below and on the globe. ${areasLine}`,
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
        ? `${top.name} has the most, with ${top.count.toLocaleString("en-US")} cameras${c.topCities[1] ? `, followed by ${c.topCities[1].name} (${c.topCities[1].count.toLocaleString("en-US")})` : ""}. Use the area filters above the grid to browse one area at a time.`
        : `The cameras are spread across ${c.name} rather than concentrated in one area; the grid groups them by area where the catalogue names one.`,
    },
    {
      q: `Is it free to watch ${c.name} cameras?`,
      a: "Yes — browsing the grid and opening cameras is free and needs no account. The feeds belong to their operators and public sources; a camera whose stream has gone off air shows as unavailable rather than playing a recording.",
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

  const content = CONTENT[slug];
  const intro = content?.intro ?? derivedIntro(c);
  const faqs = content?.faqs ?? derivedFaqs(c);

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
        mainEntity: faqs.map((f) => ({
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
            Watch {c.count.toLocaleString("en-US")} live cameras across {c.name} — free on the WorldEye globe.
          </p>
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
                    <a
                      href={`${BASE}/?camera=${s.id}`}
                      className="text-xs text-[#00E5FF] hover:underline mt-1 inline-block"
                    >
                      View on the live map
                    </a>
                  </div>
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
