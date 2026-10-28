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
import CruisePortBoard from "@/components/CruisePortBoard";
import { EXPLORE_SCOPES, recordsForDef } from "@/lib/explore-data";
import { getPlaceWeather } from "@/lib/place-weather";
import { CRUISE_PORTS, cruisePortBySlug, type CruisePort } from "@/lib/cruise-ports";
import { haversineKm } from "@/lib/ais-feed";

/* Weather is cached per location for 30 minutes in lib/weather-api;
   ISR at the same cadence keeps the page fresh. The live board
   polls its own endpoint client-side every 30 s. */
export const revalidate = 1800;

function nearestPorts(p: CruisePort, n: number): CruisePort[] {
  return CRUISE_PORTS.filter((o) => o.slug !== p.slug)
    .map((o) => ({ o, d: haversineKm(p.lat, p.lng, o.lat, o.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.o);
}

export function generateStaticParams() {
  return CRUISE_PORTS.map((p) => ({ port: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ port: string }>;
}): Promise<Metadata> {
  const { port: slug } = await params;
  const p = cruisePortBySlug(slug);
  if (!p) return { title: "Not found" };
  const records = await recordsForDef(EXPLORE_SCOPES[p.scopeKey]);
  const n = records.length;
  const fmt = (x: number) => x.toLocaleString("en-US");
  const title = `${p.name} — Cruise Ships in Port Now, Live`;
  const description = `Which cruise ships are at ${p.name} right now? The live presence board reads them off AIS — plus ${fmt(n)} port & waterfront cameras within ${p.wallRadiusKm} km. Presence, not schedules. Free, no signup.`;
  const url = `/port-webcams/${p.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function CruisePortPage({
  params,
}: {
  params: Promise<{ port: string }>;
}) {
  const { port: slug } = await params;
  const p = cruisePortBySlug(slug);
  if (!p) notFound();

  const def = EXPLORE_SCOPES[p.scopeKey];
  const records = await recordsForDef(def);
  const n = records.length;
  const fmt = (x: number) => x.toLocaleString("en-US");
  const featured: Sample[] = records
    .filter((r) => /port|cruise|harbou?r|bay|terminal|inlet/i.test(r.name))
    .slice(0, 8)
    .map((r) => ({ name: r.name, city: r.city, id: r.id }));
  const featuredFinal: Sample[] = (
    featured.length >= 3
      ? featured
      : records.slice(0, 8).map((r) => ({ name: r.name, city: r.city, id: r.id }))
  );

  const canonical = `${BASE}/port-webcams/${p.slug}`;
  const placeWeather = await getPlaceWeather({
    query: `${p.lat},${p.lng}`,
    lat: p.lat,
    lng: p.lng,
  });

  const faqs = [
    {
      q: `Is this a departure board for ${p.short}?`,
      a: `No — it is a live presence board, and the difference matters. It lists the cruise ships physically inside ${p.name}'s area right now, from their own AIS broadcasts. This site holds no cruise schedule data, so it prints no departure times rather than invent them. For sailing times, your cruise line or the port authority is the source; for which hulls are actually here, this board is the instrument.`,
    },
    ...p.faqs,
    {
      q: `How many cameras are in the ${p.short} wall, and how is the count worked out?`,
      a: `This page's wall holds ${fmt(n)} camera${n === 1 ? '' : 's'}: every camera in the WorldEye catalogue within ${p.wallRadiusKm} km of the port centre the site's scope registry uses — the same rule the explorer below serves, so the number you read is the number you get.`,
    },
    {
      q: "Is it free to watch?",
      a: "Yes — every camera on this page opens free on WorldEye, with no account and no signup, and the live board is free too. A free account raises your daily camera-open limit; the globe's full maritime firehose is a VIP layer, but the port boards are public, full stop.",
    },
  ];

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${p.name} — Cruise Ships in Port Now, Live`,
    description: `Live AIS presence board for ${p.name} — the cruise ships in port right now — with ${fmt(n)} port and waterfront cameras within ${p.wallRadiusKm} km.`,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Live webcams", item: `${BASE}/live-webcams` },
      { "@type": "ListItem", position: 3, name: "Port webcams", item: `${BASE}/port-webcams` },
      { "@type": "ListItem", position: 4, name: p.short, item: canonical },
    ],
  };

  const siblings = nearestPorts(p, 3);

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
          { label: "Port webcams", href: "/port-webcams" },
          { label: p.short },
        ]}
      />
      <Hero
        h1={`${p.name} — Cruise Ships in Port, Live`}
        sub={`The board below lists the cruise ships at ${p.short} right now, read live off AIS — plus ${fmt(n)} port & waterfront cameras within ${p.wallRadiusKm} km. Presence, not schedules. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(n), label: `cameras in ${p.short}'s wall` },
          { value: `${p.boardRadiusKm} km`, label: "board radius — the presence rule" },
          { value: p.country, label: "country" },
        ]}
      />
      <Intro paragraphs={[p.intro[0], p.intro[1]]} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          The board — who is in port right now
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every AIS passenger vessel inside {p.name}’s board radius,
          named as it broadcasts, marked in port when it is stopped
          and underway when it is moving in the port area. Reports up
          to about ten minutes old are admitted; older reports are
          dropped, never carried forward as if live.
        </p>
        <CruisePortBoard slug={p.slug} portName={p.name} />
      </section>

      {placeWeather && <PlaceWeatherPanel data={placeWeather} placeName={p.name} />}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Best time to watch {p.short}</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{p.watch}</p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          All {fmt(n)} {p.short} port cameras, live
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every catalogue camera within {p.wallRadiusKm} km of the{" "}
          {p.name} centre, nearest first — the wall this page’s count
          comes from. {p.highlights.join(" · ")}.
        </p>
        <DirectoryExplorer
          scopeKey={p.scopeKey}
          scopeLabel={def.label}
          groupBy="none"
          searchPlaceholder={`Search ${p.short} cameras…`}
          explorerId={`cp-page-${p.slug}`}
        />
      </section>

      {featuredFinal.length > 0 && (
        <SampleGrid title={`Featured cameras at ${p.short}`} samples={featuredFinal} />
      )}

      <HowTo
        title={`How to use the ${p.short} board`}
        steps={[
          "Start with the board: it names the ships actually in port right now — if your ship is not listed, it is not transmitting here yet.",
          "Then watch the wall: find the berth-side and inlet cameras in the explorer and keep them open through the sailaway window.",
          "A ship marked 'underway in port area' is moving — casting off, arriving, or shifting berth; 'in port' means stopped at the berth or the anchorage.",
          "Check the weather panel before reading a hazy frame as a quiet port — harbour weather hides fleets whole.",
          "For departure times, use your cruise line or the port authority — this board measures presence and prints no times it cannot source.",
        ]}
      />

      <FaqSection title={`${p.short} cruise port — FAQ`} faqs={faqs} />

      <RelatedLinks
        title="More cruise ports & the water"
        links={[
          { label: "All port webcams & boards", href: "/port-webcams" },
          ...siblings.map((o) => ({
            label: `${o.name} — ships in port now`,
            href: `/port-webcams/${o.slug}`,
          })),
          { label: "Ferry tracker — live ferries & terminals", href: "/ferry-tracker" },
          { label: "Live ship tracker", href: "/ship-tracker" },
          {
            label: `${p.country} cameras — the country index`,
            href: `/cameras/countries/${p.countrySlug}`,
          },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="port-webcams" />
      <CtaRow backHref="/port-webcams" backLabel="All port webcams" />
    </PageShell>
  );
}
