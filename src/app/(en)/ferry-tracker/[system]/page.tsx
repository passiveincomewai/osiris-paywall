import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  SampleGrid,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Sample,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import PlaceWeatherPanel from "@/components/PlaceWeatherPanel";
import FerryLivePanel from "@/components/FerryLivePanel";
import { EXPLORE_SCOPES, recordsForDef } from "@/lib/explore-data";
import { getPlaceWeather } from "@/lib/place-weather";
import { FERRY_SYSTEMS, ferrySystemBySlug } from "@/lib/ferries";

/* Weather is cached per location for 30 minutes in lib/weather-api;
   ISR at the same cadence keeps the page fresh. The live vessel
   panel polls its own endpoint client-side every 30 s. */
export const revalidate = 1800;

interface WallData {
  scopeKey: string;
  heading: string;
  blurb: string;
  label: string;
  count: number;
}

/** Every wall's records, plus the deduplicated cross-wall total,
 *  the count of cameras carrying a ferry in their own name, and the
 *  featured sample (named cameras first). */
async function loadWalls(slug: string) {
  const system = ferrySystemBySlug(slug);
  if (!system) return { walls: [] as WallData[], total: 0, namedCount: 0, featured: [] as Sample[] };
  const seen = new Set<string>();
  const named: Sample[] = [];
  let namedCount = 0;
  const walls: WallData[] = [];
  for (const w of system.walls) {
    const def = EXPLORE_SCOPES[w.scopeKey];
    const records = await recordsForDef(def);
    for (const r of records) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      if (/ferry|WSF/i.test(r.name)) {
        namedCount += 1;
        if (named.length < 24) named.push({ name: r.name, city: r.city, id: r.id });
      }
    }
    walls.push({
      scopeKey: w.scopeKey,
      heading: w.heading,
      blurb: w.blurb,
      label: def.label,
      count: records.length,
    });
  }
  const featured = named.slice(0, 8);
  return { walls, total: seen.size, namedCount, featured };
}

export function generateStaticParams() {
  return FERRY_SYSTEMS.map((s) => ({ system: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ system: string }>;
}): Promise<Metadata> {
  const { system: slug } = await params;
  const s = ferrySystemBySlug(slug);
  if (!s) return { title: "Not found" };
  const { total } = await loadWalls(slug);
  const fmt = (x: number) => x.toLocaleString("en-US");
  const title = `${s.name} — Live Ferry Tracker & Terminal Cameras`;
  const description = `Track ${s.name} live: the fleet on AIS right now, matched by the boats' own broadcast names, plus ${fmt(total)} terminal & harbour cameras across ${s.walls.length} dock walls — ${s.highlights.slice(0, 2).join(", ")}. Positions, not timetables. Free, no signup.`;
  const url = `/ferry-tracker/${s.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function FerrySystemPage({
  params,
}: {
  params: Promise<{ system: string }>;
}) {
  const { system: slug } = await params;
  const s = ferrySystemBySlug(slug);
  if (!s) notFound();

  const { walls, total, namedCount, featured } = await loadWalls(slug);
  const fmt = (x: number) => x.toLocaleString("en-US");
  const canonical = `${BASE}/ferry-tracker/${s.slug}`;
  const placeWeather = await getPlaceWeather({
    query: `${s.lat},${s.lng}`,
    lat: s.lat,
    lng: s.lng,
  });

  const faqs = [
    ...s.faqs,
    {
      q: `How many cameras are in the ${s.short} walls, and how is the count worked out?`,
      a: `The walls on this page hold ${fmt(total)} cameras in total (deduplicated across walls). Each wall's rule is stated on it: every camera in the WorldEye catalogue within that dock area's radius in the site's scope registry — the same rule the explorers below serve, so the number you read is the number you get. ${namedCount > 0 ? `${fmt(namedCount)} camera${namedCount === 1 ? '' : 's'} across the walls ${namedCount === 1 ? 'carries' : 'carry'} a ferry in ${namedCount === 1 ? 'its' : 'their'} own name.` : 'No camera in these walls carries a ferry in its own name — the walls are the harbour and streets around the crossing, and are labelled that way.'}`,
    },
    {
      q: "Is it free to watch?",
      a: "Yes — every camera on this page opens free on WorldEye, with no account and no signup, and the live ferry panel is free too. A free WorldEye account raises your daily camera-open limit; the globe's full maritime firehose is a VIP layer, but the ferry systems' own panels are public, full stop.",
    },
  ];

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${s.name} — Live Ferry Tracker & Terminal Cameras`,
    description: `Live AIS positions for the ${s.name} fleet, matched by broadcast vessel names, with ${fmt(total)} terminal and harbour cameras across ${s.walls.length} dock walls.`,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Live webcams", item: `${BASE}/live-webcams` },
      { "@type": "ListItem", position: 3, name: "Ferry tracker", item: `${BASE}/ferry-tracker` },
      { "@type": "ListItem", position: 4, name: s.short, item: canonical },
    ],
  };

  const siblings = FERRY_SYSTEMS.filter((o) => o.slug !== s.slug);

  return (
    <PageShell>
      <JsonLd data={pageLd} />
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        schema={false}
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Ferry tracker", href: "/ferry-tracker" },
          { label: s.short },
        ]}
      />
      <Hero
        h1={`${s.name} — Live Ferry Tracker`}
        sub={`${fmt(total)} terminal & harbour cameras across ${s.walls.length} dock walls, and the fleet live on AIS — matched by the boats' own broadcast names. Positions, not timetables. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(total), label: "cameras in the terminal walls" },
          { value: String(s.walls.length), label: "terminal walls" },
          { value: String(s.routes.length), label: "routes, as terminal pairs" },
          { value: s.region, label: "service area" },
        ]}
      />
      <Intro paragraphs={[s.intro[0], s.intro[1]]} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          The {s.short} fleet, live
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every vessel of this system that is transmitting on AIS right
          now — its broadcast name, speed and destination as reported.
          Reports up to about ten minutes old are admitted; older
          reports are dropped, never carried forward as if live.
        </p>
        <FerryLivePanel slug={s.slug} systemName={s.name} />
      </section>

      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName={s.name} />}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Best time to watch</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{s.watch}</p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Terminals & routes</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-3">
          Terminals served: {s.terminals.join(" · ")}.
        </p>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl">
          Routes, named as the terminal pairs they connect:{" "}
          {s.routes.join(" · ")}. No sailing times are listed — no
          dataset behind this site carries them, so the live panel and
          the operator’s own status are the guide.
        </p>
      </section>

      {walls.map((w) => (
        <section key={w.scopeKey} className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">
            {w.heading} — {fmt(w.count)} cameras
          </h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{w.blurb}</p>
          <DirectoryExplorer
            scopeKey={w.scopeKey}
            scopeLabel={w.label}
            groupBy="none"
            searchPlaceholder={`Search ${w.heading} cameras…`}
            explorerId={`ft-${w.scopeKey}`}
          />
        </section>
      ))}

      {s.cameraGaps.length > 0 && (
        <section className="mt-12 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.05] p-6 md:p-7 max-w-3xl mx-auto">
          <h2 className="text-lg md:text-xl font-bold">
            Terminals with no camera — stated, not padded
          </h2>
          <p className="mt-3 text-sm text-white/65 leading-relaxed">
            The catalogue holds no camera at {s.cameraGaps.join(", ")} —
            checked directly at each dock. Rather than borrow a distant
            highway shot and call it a terminal wall, this page names
            the gap. The live panel above still tracks the fleet
            serving those terminals; if a public feed is published at
            one of these docks, it will join the walls automatically.
          </p>
        </section>
      )}

      {featured.length > 0 && (
        <SampleGrid title="The cameras that carry the ferry in their name" samples={featured} />
      )}

      <HowTo
        title={`How to use the ${s.short} tracker`}
        steps={[
          "Start with the live panel: it tells you which boats are actually on the water right now, under their own names.",
          "Read the dock before the boat: open the terminal wall for the dock you care about and look at the holding lanes — a filling dock is a sailing being prepared.",
          "Cross-check with the weather panel: fog, wind and tide change what a crossing looks like long before they change whether it runs.",
          "For departure times, use the operator's own sailing status — this page tracks positions and pictures, and prints no timetable it cannot source.",
          "Open any vessel on the globe to follow it across the water; the full maritime layer (VIP) carries every other ship sharing the route.",
        ]}
      />

      <FaqSection title={`${s.short} ferry tracker — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More ferry & ship tracking"
        links={[
          { label: "All ferry systems", href: "/ferry-tracker" },
          ...siblings.map((o) => ({
            label: `${o.name} — live ferry tracker`,
            href: `/ferry-tracker/${o.slug}`,
          })),
          { label: "Cruise port boards & port webcams", href: "/port-webcams" },
          { label: "Live ship tracker", href: "/ship-tracker" },
          {
            label: `${s.country} cameras — the country index`,
            href: `/cameras/countries/${s.countrySlug}`,
          },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="ferry-tracker" />
      <CtaRow backHref="/ferry-tracker" backLabel="All ferry systems" />
    </PageShell>
  );
}
