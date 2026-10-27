import type { Metadata } from "next";
import Link from "next/link";
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
import TrialCtaSection from "@/components/TrialCtaSection";
import { EXPLORE_SCOPES, countForDef } from "@/lib/explore-data";
import { BORDER_CROSSINGS, borderScopeKey, type BorderCrossing } from "@/lib/border/crossings";
import { getBorderWaitTimes, type BorderPort } from "@/lib/border/wait-times";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Border Crossing Wait Times & Live Cameras — US–Mexico & US–Canada",
  description:
    "Live CBP border wait times and camera walls for 25 US border crossings: San Ysidro, El Paso, Laredo, Nogales, Detroit–Windsor, Buffalo, Blaine and more. Free, no signup.",
  alternates: { canonical: `${BASE}/border-crossings` },
  openGraph: {
    title: "Border Crossing Wait Times & Live Cameras",
    description:
      "CBP wait times by lane for the busiest US land crossings, each paired with the live public cameras around its bridges. Free on WorldEye.",
    url: "/border-crossings",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Border Crossing Wait Times & Live Cameras — US–Mexico & US–Canada",
  description:
    "Live CBP border wait times plus catalogue camera walls for 25 US land border crossings on the Mexican and Canadian borders.",
  url: `${BASE}/border-crossings`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS: Faq[] = [
  {
    q: "Where do the wait times on this page come from?",
    a: "U.S. Customs and Border Protection's Border Wait Times feed — the same data behind CBP's own bwt.cbp.gov. Each crossing page shows CBP's delay minutes, lanes open and CBP's own update note for every lane, refreshed every few minutes and stamped with when the feed was read. Nothing here is estimated or scraped from a third party.",
  },
  {
    q: "What does \"Update Pending\" mean on a crossing?",
    a: "It means the port has not published a fresh reading for that lane — overnight and at quiet crossings that can be most of the table. It is shown verbatim rather than converted into a zero, because a lane with no current reading is not the same thing as an empty lane. The cameras on each crossing page are the cross-check: a visible queue needs no estimate.",
  },
  {
    q: "Why are some well-known crossings missing?",
    a: "A crossing gets a page here only when the camera catalogue has real feeds within its stated radius as well as CBP wait data. San Luis, Lukeville, Douglas, Naco, Presidio and Columbus (Mexican border) and Sweetgrass (Canadian border) all publish wait times but have zero catalogue cameras within 25 km — so they are named here as gaps instead of being given pages dressed in unrelated feeds. Their official waits are at bwt.cbp.gov.",
  },
  {
    q: "Are the cameras on these pages the border's own cameras?",
    a: "No. They are the crossing districts' public cameras — bridge approaches, port-area highways and city streets from the same catalogue as the rest of this directory. CBP's inspection-booth cameras are not public, and no page here labels a road camera as one. What the walls show is the approach and the queue's tail, which is the part of a crossing you can actually plan around.",
  },
  {
    q: "Which is the busiest crossing covered?",
    a: "By the measures that get published: Laredo is the busiest inland port in the United States by trade value, the Detroit–Windsor crossing carries one of the largest shares of US–Canada trade, and San Ysidro is among the busiest passenger crossings in the world. Each has a page here with its ports laid out separately, because their waits differ bridge by bridge.",
  },
];

function passengerSummary(port: BorderPort | undefined): string {
  if (!port) return "Feed unavailable";
  const group = port.groups.find((g) => g.key === "passenger");
  const lane = group?.lanes.find((l) => l.key === "standard") ?? group?.lanes[0];
  if (!lane) return "Not reported";
  if (lane.status === "Lanes Closed") return "Passenger lanes closed";
  if (lane.status === "Update Pending") return "No current reading";
  if (lane.status === "N/A") return "Not reported";
  if (lane.delayMinutes != null)
    return lane.delayMinutes === 0 ? "No delay" : `${lane.delayMinutes} min delay`;
  return lane.status;
}

function CrossingTable({
  title,
  rows,
  counts,
  ports,
}: {
  title: string;
  rows: BorderCrossing[];
  counts: Map<string, number>;
  ports: Map<string, BorderPort>;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold mb-4">{title}</h2>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10 bg-white/[0.03]">
              <th className="py-3 px-4 font-medium">Crossing</th>
              <th className="py-3 px-4 font-medium">Passenger wait (CBP)</th>
              <th className="py-3 px-4 font-medium">Ports</th>
              <th className="py-3 px-4 font-medium">Cameras nearby</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.slug} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-3 px-4">
                  <Link
                    href={`/border-crossings/${c.slug}`}
                    className="text-[#00E5FF] hover:underline font-medium"
                  >
                    {c.name}
                  </Link>
                  <span className="text-white/45">
                    {" "}
                    — {c.usCity}, {c.usState} ↔ {c.foreignCity}
                  </span>
                </td>
                <td className="py-3 px-4 text-white/75">
                  {passengerSummary(ports.get(c.portNumbers[0]))}
                </td>
                <td className="py-3 px-4 text-white/60">{c.portNumbers.length}</td>
                <td className="py-3 px-4 text-white/60">
                  {(counts.get(c.slug) ?? 0).toLocaleString("en-US")} within {c.radiusKm} km
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function BorderCrossingsPage() {
  const counts = new Map<string, number>();
  await Promise.all(
    BORDER_CROSSINGS.map(async (c) => {
      counts.set(c.slug, await countForDef(EXPLORE_SCOPES[borderScopeKey(c)]));
    }),
  );
  const waits = await getBorderWaitTimes();
  const totalCams = BORDER_CROSSINGS.reduce((s, c) => s + (counts.get(c.slug) ?? 0), 0);
  const mexican = BORDER_CROSSINGS.filter((c) => c.border === "Mexican Border");
  const canadian = BORDER_CROSSINGS.filter((c) => c.border === "Canadian Border");
  const totalPorts = BORDER_CROSSINGS.reduce((s, c) => s + c.portNumbers.length, 0);

  const intro = [
    `A border wait is two facts, not one: what CBP says the delay is, and what the approach actually looks like. This hub pairs both for ${BORDER_CROSSINGS.length} US land crossings — ${totalPorts} ports of entry across the Mexican and Canadian borders. Every crossing page carries CBP's live Border Wait Times by lane — passenger, commercial and pedestrian, with the agency's own update notes — and a wall of the public cameras around its bridges: ${totalCams.toLocaleString("en-US")} catalogue cameras across the ${BORDER_CROSSINGS.length} stated radii.`,
    "The discipline is the directory's usual one. Wait times are CBP's figures verbatim, stamped with when the feed was read; a lane the port hasn't updated says \"Update Pending\" instead of borrowing a zero. Camera walls are a geographic rule — every catalogue camera within the crossing's stated radius, nearest first — and the cameras are the district's public feeds, never dressed up as CBP's booth cameras, which are not public.",
    "And the gaps are named, as ever: crossings with real wait data but no cameras nearby — San Luis, Lukeville, Douglas, Naco, Presidio, Columbus, Sweetgrass — get no page until the catalogue reaches them. Their official waits live at bwt.cbp.gov.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Border crossings" },
        ]}
      />
      <Hero
        h1="Border Crossing Wait Times & Live Cameras"
        sub="CBP's live wait times for the busiest US land crossings — San Ysidro, El Paso, Laredo, Detroit–Windsor, Blaine and more — each paired with the live cameras around its bridges. Free, no signup."
      />
      <StatRow
        stats={[
          { value: String(BORDER_CROSSINGS.length), label: "crossings with wait times + camera walls" },
          { value: String(totalPorts), label: "CBP ports of entry covered" },
          { value: totalCams.toLocaleString("en-US"), label: "cameras across the crossing walls" },
        ]}
      />
      <Intro paragraphs={intro} />

      <CrossingTable
        title="Mexican border crossings"
        rows={mexican}
        counts={counts}
        ports={waits.byPortNumber}
      />
      <CrossingTable
        title="Canadian border crossings"
        rows={canadian}
        counts={counts}
        ports={waits.byPortNumber}
      />

      <HowTo
        title="How to use a crossing page"
        steps={[
          "Start with the passenger standard lane's delay — then compare the SENTRI / NEXUS and Ready rows at the same port before choosing a lane.",
          "Trust the update note over the number: a 0-minute delay stamped hours ago is older information than a 20-minute delay stamped just now.",
          "Open the camera wall and find the approach highway: the queue you can see is the wait's ground truth.",
          "Cross-check a second port on the same crossing page — at multi-bridge crossings (El Paso, Laredo, Brownsville, Detroit) the bridges rarely back up evenly.",
          "Re-check before you commit to the drive; the panel refreshes itself every two minutes while the page is open.",
        ]}
      />

      <FaqSection title="Border crossing wait times — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Live traffic cameras", href: "/live-traffic-cameras" },
          { label: "US traffic cameras by state", href: "/us-traffic-cameras" },
          { label: "Canada traffic cameras", href: "/canada-traffic-cameras" },
          { label: "Port webcams — live harbours", href: "/port-webcams" },
          { label: "Live ship tracker (AIS)", href: "/ship-tracker" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="border-crossings" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
