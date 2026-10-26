import VoiceQA from "@/components/seo/VoiceQA";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { mergePlaceFaqs } from "@/lib/place-answers";
import { getVoiceQuestionsByIds } from "@/lib/voice-questions";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Camera, Globe, MapPin } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import CountriesDirectory from "@/components/CountriesDirectory";
import type { CountryDirectoryEntry } from "@/lib/country-directory";
import data from "@/data/camera-countries.json";

/* Counts come from the generated index (tools/build-country-pages.mjs,
   derived from the served catalogue) — the numbers on this page cannot
   drift from the catalogue the globe serves. */
interface CountryEntry {
  slug: string;
  name: string;
  count: number;
  topCities: Array<{ name: string; count: number }>;
}

const COUNTRIES = (data as { countries: CountryEntry[] }).countries;
const TOTAL_CAMERAS = (data as { attributedTotal: number }).attributedTotal;
const byName = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
/* The directory table's client props: only the fields the table and
   its search need, so the serialized page payload stays slim (the
   raw entries also carry aliases, city counts and camera samples). */
const DIRECTORY_ENTRIES: CountryDirectoryEntry[] = COUNTRIES.map((c) => ({
  slug: c.slug,
  name: c.name,
  count: c.count,
  topCities: c.topCities,
}));
const largest = COUNTRIES.reduce((a, b) => (b.count > a.count ? b : a), COUNTRIES[0]);

const fmt = (n: number) => n.toLocaleString("en-US");
const generatedDate = new Date(
  (data as { generatedAt: string }).generatedAt,
).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export const metadata: Metadata = {
  title: `Live Street Cameras by Country — ${COUNTRIES.length} Countries`,
  description: `Browse live street cameras across ${COUNTRIES.length} countries — ${fmt(TOTAL_CAMERAS)} public webcam feeds mapped by nation and region. Find your country and start watching.`,
  alternates: { canonical: "https://worldeye.app/cameras/countries" },
  openGraph: {
    title: `Live Street Cameras by Country — ${COUNTRIES.length} Countries | WorldEye`,
    description: `${fmt(TOTAL_CAMERAS)} live street cameras across ${COUNTRIES.length} countries, mapped by nation and region. Find your country and start watching.`,
    url: "https://worldeye.app/cameras/countries",
    type: "website",
  },
};

/* The directory FAQ set (moved out of the JSX so it can merge with
   canonical-dataset answers into the page's single FAQPage). */
const DIRECTORY_FAQS: Array<{ q: string; a: string }> = [
              {
                q: "Where do these cameras come from?",
                a: "Every camera in the directory is published openly by its operator — transport agencies, cities, resorts, and businesses. WorldEye collects the public feeds into one index and plots them on the map; it does not operate its own camera network.",
              },
              {
                q: "Why do some countries have thousands of cameras and others only a few?",
                a: "It reflects what is published openly. Countries whose transport agencies publish dense highway camera networks (the US, Japan, Canada) dominate the counts; countries without open camera programs have whatever their cities and businesses publish.",
              },
              {
                q: "Which countries have dedicated pages?",
                a: "All of them. Every country in the table has its own page with the complete live grid for that country — every camera, grouped by area with search and filters — linked from the table above.",
              },
              {
                q: "How often is the directory updated?",
                a: "The index is rebuilt from the live camera catalogue — the 'last updated' date above shows the latest build. New public feeds are picked up as their operators publish them, and dead feeds drop out.",
              },
              {
                q: "Are the cameras really live?",
                a: "Yes — every card on a country page is the camera's actual live feed: snapshots refresh about every 15 seconds and streams play in the card. Individual cameras can go offline for maintenance or be replaced by their operators, so a specific feed may occasionally be dark — it then shows as unavailable rather than playing a recording.",
              },
              {
                q: "Is it free to watch?",
                a: "Yes. Every camera in the directory opens free on the WorldEye map — no account, no signup, no paywall.",
              },];

const DIRECTORY_MERGED = mergePlaceFaqs(
  DIRECTORY_FAQS,
  getVoiceQuestionsByIds([
    "how-many-cameras-in-the-us",
    "how-many-cameras-in-japan",
    "how-many-cameras-in-canada",
    "how-many-cameras-in-the-uk",
  ]),
);

const jsonLd = {
  "@context": "https://schema.org",
  // Single @graph: CollectionPage + exactly ONE FAQPage (merged set).
  "@graph": [
    {
      "@type": "CollectionPage",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: COUNTRIES.length,
        itemListElement: byName.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${c.name} live cameras — ${fmt(c.count)} cameras`,
          url: `https://worldeye.app/cameras/countries/${c.slug}`,
        })),
      },
  name: `Live Street Cameras by Country — ${COUNTRIES.length} Countries`,
  description: `A directory of ${fmt(TOTAL_CAMERAS)} live public street cameras across ${COUNTRIES.length} countries, with per-country camera counts and top regions.`,
  url: "https://worldeye.app/cameras/countries",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
      numberOfItems: COUNTRIES.length,
      dateModified: (data as { generatedAt: string }).generatedAt,
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/cameras/countries",
      mainEntity: DIRECTORY_MERGED.merged.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function CameraCountriesPage() {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://worldeye.app/" },
              { "@type": "ListItem", position: 2, name: "Cameras", item: "https://worldeye.app/cameras" },
              { "@type": "ListItem", position: 3, name: "Countries", item: "https://worldeye.app/cameras/countries" },
            ],
          }),
        }}
      />
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/cameras" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to Cameras
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-white/40 mb-8">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-white transition">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href="/cameras" className="hover:text-white transition">Cameras</Link></li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-white/70">Countries</li>
          </ol>
        </nav>

        {/* Hero */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> CAMERA DIRECTORY
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live Street Cameras <span className="text-[#D4AF37]">by Country</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            WorldEye collects {fmt(TOTAL_CAMERAS)} publicly available live street
            cameras from {COUNTRIES.length} countries into one directory. Every entry
            below is a camera that its operator — a transport agency, city, resort or
            business — already publishes openly on the web. Pick a country to watch
            its cameras live, grouped by area, or jump straight to the globe.
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <Camera className="w-5 h-5 text-[#D4AF37] mb-3" />
            <p className="text-2xl md:text-3xl font-bold">{fmt(TOTAL_CAMERAS)}</p>
            <p className="text-sm text-white/45 mt-1">Total live cameras</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <Globe className="w-5 h-5 text-[#D4AF37] mb-3" />
            <p className="text-2xl md:text-3xl font-bold">{COUNTRIES.length}</p>
            <p className="text-sm text-white/45 mt-1">Countries covered</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <MapPin className="w-5 h-5 text-[#D4AF37] mb-3" />
            <p className="text-2xl md:text-3xl font-bold">{fmt(largest.count)}</p>
            <p className="text-sm text-white/45 mt-1">Cameras in {largest.name}, the largest</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="w-5 h-5 mb-3 text-[#D4AF37] font-bold text-lg">↻</p>
            <p className="text-lg md:text-xl font-bold">{generatedDate}</p>
            <p className="text-sm text-white/45 mt-1">Directory last updated</p>
          </div>
        </div>

        {/* Full table */}
        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">
            All {COUNTRIES.length} countries
          </h2>
          <p className="text-white/50 mt-2 max-w-2xl text-sm md:text-base">
            Alphabetical, with each country&apos;s live camera count and busiest area.
            Every country has its own page: the full camera grid for that country,
            grouped by area, each feed live.
          </p>
          <CountriesDirectory countries={DIRECTORY_ENTRIES} />
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold">Camera directory — FAQ</h2>
          <div className="mt-6 space-y-4">
            {DIRECTORY_FAQS.map((f) => (
              <details key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 group">
                <summary className="font-semibold text-white/90 cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-[#D4AF37] group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="text-sm text-white/55 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {DIRECTORY_MERGED.surviving.length > 0 && (
          <div className="max-w-3xl">
            <VoiceQA entries={DIRECTORY_MERGED.surviving} />
          </div>
        )}

        <TrialCtaSection utmSource="cameras-countries" />

        {/* CTA */}
        <div className="mt-16 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            Find your country. <span className="text-[#D4AF37]">Watch it live.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            The full network is plotted on the WorldEye globe — free to browse, no
            account needed.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open the live map <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Camera overview
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
