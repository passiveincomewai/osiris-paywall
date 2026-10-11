import type { Metadata } from "next";
import directory from "@/data/camera-directory.json";
import {
  BASE,
  formatDate,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Updated,
  Intro,
  AreaTable,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";

const TITLE = "Oceania Webcams — 499 Live Cameras | WorldEye";
const BLURB =
  "Watch 499 live webcams across Australia and New Zealand — Sydney motorways, NZ state highways and alpine roads — free on the WorldEye map. No signup needed.";
const CANONICAL = `${BASE}/oceania-webcams`;

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: BLURB, url: "/oceania-webcams", type: "website" },
};

const COUNTRIES = [
  { name: "Australia", count: 250 },
  { name: "New Zealand", count: 249 },
];

export default function OceaniaWebcamsPage() {
  const updated = formatDate(directory.generatedAt);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: BLURB,
    url: CANONICAL,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: COUNTRIES.length,
      itemListElement: COUNTRIES.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${c.name} — ${c.count.toLocaleString("en-US")} cameras`,
        url: BASE,
      })),
    },
  };

  const FAQS = [
          {
            q: "Which country has more cameras, Australia or New Zealand?",
            a: "Australia, by a single feed: 250 cameras to New Zealand's 249, out of 499 total across Oceania.",
          },
          {
            q: "Are these surf or beach cameras?",
            a: "No. Both countries' feeds in this index are road and highway cameras — Sydney motorways, NSW regional highways, and New Zealand state highways. For coastal scenery, browse the scenic cameras on the main WorldEye map.",
          },
          {
            q: "Can I check Sydney traffic before driving?",
            a: "Yes. The Sydney metro feeds cover the M4 Western Motorway, the M1, the Hume Highway, and surrounding arterials — check them before peak-hour drives.",
          },
        ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Countries", href: "/cameras/countries" },
          { label: "Oceania Live Webcams" },
        ]}
      />
      <Hero
        h1="Oceania Live Webcams"
        sub="Watch 499 live cameras across Australia and New Zealand — free on the WorldEye globe."
      />
      <StatRow
        stats={[
          { value: "499", label: "live cameras" },
          { value: "2", label: "countries" },
          { value: "250–249", label: "Australia vs NZ" },
        ]}
      />
      <Updated date={updated} />
      <Intro
        paragraphs={[
          "Oceania's camera index is a near-even split: Australia with 250 feeds and New Zealand with 249, for 499 total. It is the smallest regional collection on WorldEye — and one of the most useful per camera for drivers.",
          "Australia's cameras are New South Wales road feeds: Sydney's motorway network — the M4, the M1 Pacific Motorway, the Hume Highway — plus regional highways up the north coast and down toward the Victorian border, with alpine coverage around Perisher Valley in Kosciuszko National Park.",
          "New Zealand's 249 are state-highway cameras: Auckland's motorway interchanges lead with 98 feeds, followed by Canterbury (78) and Wellington (37). Check the South Island alpine routes before winter driving — conditions change fast over the passes.",
        ]}
      />
      <AreaTable title="Oceania by country" rows={COUNTRIES} />
      <HowTo
        title="How to watch Oceania cameras live"
        steps={[
          "Open the free WorldEye map — no account or download needed.",
          "Zoom to Sydney, Auckland, or anywhere along the highways of either country.",
          "Tap a green camera marker to open that road camera's live feed.",
        ]}
      />
      <FaqSection
        title="Oceania webcams — FAQ"
        faqs={FAQS}
      />
      <RelatedLinks
        title="More regional webcam indexes"
        links={[
          { label: "North America live webcams", href: "/north-america-webcams" },
          { label: "Asia live webcams", href: "/asia-webcams" },
          { label: "Using live cameras to plan travel", href: "/blog/using-live-cameras-to-plan-travel" },
          { label: "All camera countries", href: "/cameras/countries" },
        ]}
      />
      <CtaRow backHref="/cameras/countries" backLabel="All countries" />
    </PageShell>
  );
}
