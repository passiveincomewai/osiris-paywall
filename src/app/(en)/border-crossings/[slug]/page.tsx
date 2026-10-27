import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  StatRow,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Faq,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import BorderWaitPanel, { type BorderWaitView } from "@/components/BorderWaitPanel";
import { EXPLORE_SCOPES, countForDef } from "@/lib/explore-data";
import {
  BORDER_CROSSINGS,
  BORDER_CROSSING_BY_SLUG,
  borderScopeKey,
  type BorderCrossing,
} from "@/lib/border/crossings";
import { getBorderWaitTimes } from "@/lib/border/wait-times";

/* The wait panel is a live reading: rebuild the page's server
   snapshot every five minutes so the first paint (and the crawlers)
   see current CBP numbers with their own stamps, never a build-time
   fossil. */
export const revalidate = 300;

export function generateStaticParams() {
  return BORDER_CROSSINGS.map((c) => ({ slug: c.slug }));
}

function titleFor(c: BorderCrossing): string {
  return `${c.name} Border Wait Times & Live Cameras — Crossing to ${c.foreignCity}`;
}

function descriptionFor(c: BorderCrossing, camCount: number): string {
  return `Live ${c.name} border wait times from CBP — passenger, commercial and pedestrian lanes with CBP's own update times — plus ${camCount} live cameras within ${c.radiusKm} km of the ${c.usCity}–${c.foreignCity} crossing. Free, no signup.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const crossing = BORDER_CROSSING_BY_SLUG.get(slug);
  if (!crossing) return {};
  const count = await countForDef(EXPLORE_SCOPES[borderScopeKey(crossing)]);
  const title = titleFor(crossing);
  const description = descriptionFor(crossing, count);
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/border-crossings/${crossing.slug}` },
    openGraph: {
      title,
      description,
      url: `/border-crossings/${crossing.slug}`,
      type: "website",
    },
  };
}

function faqsFor(c: BorderCrossing, camCount: number): Faq[] {
  const bridgeList = c.bridges.join(", ");
  return [
    {
      q: `What is the border wait time at ${c.name} right now?`,
      a: `The table at the top of this page shows CBP's current published wait for the ${c.name} crossing — delay minutes and lanes open for passenger, commercial and pedestrian lanes, each with CBP's own update note (for example "At 11:00 pm PDT"). Readings refresh every few minutes from U.S. Customs and Border Protection's Border Wait Times feed. Where a lane says "Update Pending", the port has not published a fresh reading for it — that is shown as-is rather than replaced with a guess.`,
    },
    {
      q: `Which bridges and ports make up the ${c.name} crossing?`,
      a: `${bridgeList}. CBP reports wait times per port of entry, so this page presents every port that serves the ${c.usCity}–${c.foreignCity} crossing together: ${c.portNumbers.map((p) => `port ${p}`).join(", ")}.`,
    },
    {
      q: `Can I see the ${c.name} border crossing on a live camera?`,
      a: `The wall below collects every catalogue camera within ${c.radiusKm} km of the crossing point — ${camCount} cameras, nearest first. They are the crossing district's public feeds: bridge approaches, the highways on the US side (${c.usCity}) and the streets around the ports. They are not CBP's own inspection-booth cameras, which are not public, and this page won't label a road camera as one.`,
    },
    {
      q: `Where do these wait times come from?`,
      a: `U.S. Customs and Border Protection's Border Wait Times feed — the same data behind CBP's own bwt.cbp.gov. Delays are CBP's estimates for reaching the inspection booth. WorldEye shows the feed's figures and update times verbatim and stamps when the feed was read; when the feed is down, the page says so instead of replaying an old number as if it were current.`,
    },
    {
      q: `What do SENTRI, NEXUS and Ready lanes mean here?`,
      a: `They are the trusted-traveller and document-ready lanes CBP reports separately. SENTRI (southbound-facing programme on the Mexican border) and NEXUS (Canadian border) lanes serve pre-approved members; Ready lanes serve travellers carrying RFID-enabled documents. Their waits are published separately because they usually move differently from the standard lanes — compare the rows in the table rather than assuming.`,
    },
  ];
}

export default async function BorderCrossingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const crossing = BORDER_CROSSING_BY_SLUG.get(slug);
  if (!crossing) notFound();

  const scope = EXPLORE_SCOPES[borderScopeKey(crossing)];
  const [camCount, waits] = await Promise.all([
    countForDef(scope),
    getBorderWaitTimes(),
  ]);
  const fmt = (n: number) => n.toLocaleString("en-US");

  const ports = crossing.portNumbers
    .map((n) => waits.byPortNumber.get(n))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const initial: BorderWaitView = {
    ports,
    fetchedAt: waits.fetchedAt,
    stale: waits.stale,
  };

  const faqs = faqsFor(crossing, camCount);
  const title = titleFor(crossing);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description: descriptionFor(crossing, camCount),
    url: `${BASE}/border-crossings/${crossing.slug}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const related = [
    { label: "All border crossings", href: "/border-crossings" },
    ...(crossing.cityPageSlug
      ? [{ label: `${crossing.usCity.split(" (")[0]} webcams`, href: `/city-webcams/${crossing.cityPageSlug}` }]
      : []),
    { label: `${crossing.usState} traffic cameras`, href: `/us-traffic-cameras/${crossing.statePageSlug}` },
    ...(crossing.border === "Canadian Border"
      ? [{ label: "Canada traffic cameras", href: "/canada-traffic-cameras" }]
      : []),
    { label: "Live traffic cameras", href: "/live-traffic-cameras" },
    { label: "Live webcams worldwide", href: "/live-webcams" },
  ];

  const others = BORDER_CROSSINGS.filter(
    (o) => o.slug !== crossing.slug && o.border === crossing.border,
  ).slice(0, 6);

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Border crossings", href: "/border-crossings" },
          { label: crossing.name },
        ]}
      />
      <Hero
        h1={`${crossing.name} Border Wait Times — Live Cameras at the ${crossing.foreignCity} Crossing`}
        sub={`CBP's live wait times for the ${crossing.usCity}–${crossing.foreignCity} crossing — every port, every lane — with ${fmt(camCount)} live cameras within ${crossing.radiusKm} km of the bridges. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(camCount), label: `cameras within ${crossing.radiusKm} km of the crossing` },
          { value: String(crossing.portNumbers.length), label: crossing.portNumbers.length === 1 ? "CBP port covered" : "CBP ports covered" },
          { value: crossing.bridges.length > 1 ? String(crossing.bridges.length) : "1", label: "bridges / facilities" },
        ]}
      />

      <BorderWaitPanel
        portNumbers={crossing.portNumbers}
        crossingName={crossing.name}
        initial={initial}
      />

      <Intro
        paragraphs={[
          ...crossing.facts,
          `The camera wall below is a stated geographic rule, the same discipline as everywhere in this directory: every catalogue camera within ${crossing.radiusKm} km of the crossing point (${crossing.lat.toFixed(4)}, ${crossing.lng.toFixed(4)}), nearest first — the bridge approaches, the port district and the ${crossing.usCity} streets around it. What it cannot show you is the inspection plaza itself: CBP's booth cameras are not public feeds, and no camera here is dressed up as one.`,
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Live cameras near the {crossing.name} crossing
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(camCount)} catalogue cameras within {crossing.radiusKm} km of the crossing
          point, nearest first.
        </p>
        <DirectoryExplorer
          scopeKey={borderScopeKey(crossing)}
          scopeLabel={scope.label}
          groupBy="none"
          searchPlaceholder={`Search cameras near ${crossing.name}…`}
          explorerId={`border-${crossing.slug}`}
        />
      </section>

      <HowTo
        title="How to cross with less waiting"
        steps={[
          "Read the table by lane, not by headline: standard, SENTRI/NEXUS and Ready lanes at the same port can differ by an hour.",
          "Check the CBP update note on each row — a lane marked \"Update Pending\" has no current reading, however empty it looks.",
          "Look at the approach cameras before you leave: the visible queue tail on the US-side highway is the part of the wait no table measures.",
          "If this crossing is stacked and another nearby port is not, the wait table on that crossing's page is one tap back on the hub.",
          "Carry the documents the lane requires — a Ready or SENTRI lane entered without the right card ends at the booth, slowly.",
        ]}
      />

      <FaqSection title={`${crossing.name} border crossing — FAQ`} faqs={faqs} />

      <RelatedLinks title="More live WorldEye" links={related} />

      <RelatedLinks
        title={`Other ${crossing.border === "Mexican Border" ? "Mexican" : "Canadian"} border crossings`}
        links={others.map((o) => ({
          label: `${o.name} wait times & cameras`,
          href: `/border-crossings/${o.slug}`,
        }))}
      />

      <TrialCtaSection utmSource={`border-${crossing.slug}`} />

      <CtaRow backHref="/border-crossings" backLabel="All border crossings" />
    </PageShell>
  );
}
