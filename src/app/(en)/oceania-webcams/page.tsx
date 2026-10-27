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

const TITLE = "Oceania Webcams — 499 Live Cameras";
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
          {
            q: "What is the best use of the New Zealand cameras?",
            a: "Winter driving. Auckland's 98 interchange feeds cover commuting, but the Canterbury (78) and South Island alpine feeds are the trip-savers — check pass conditions before crossing in winter.",
          },
          {
            q: "Do the cameras cover the ski fields?",
            a: "Australia's alpine coverage includes Perisher Valley in Kosciuszko National Park — useful for checking snow conditions on the access roads during ski season.",
          },
          {
            q: "What time zone are the cameras in?",
            a: "Sydney runs UTC+10/11 and New Zealand UTC+12/13 (with daylight saving). Oceania is often the first region on earth with daylight — useful when the rest of the index is dark.",
          },
          {
            q: "Are the feeds free?",
            a: "Yes — all 499 open free on the WorldEye map with no account or signup.",
          },
          {
            q: "Can I see Wellington's motorways?",
            a: "Yes. Wellington contributes 37 state-highway feeds covering its motorway approaches and interchanges — zoom to the city on the live map to find them.",
          },
          {
            q: "Why is Oceania's collection smaller than Asia's or Europe's?",
            a: "It follows the public camera networks, not population. Australia and New Zealand publish dense state and motorway camera systems, but fewer distinct public networks than the US, Europe or Taiwan — so the index holds 499 feeds rather than thousands. What it lacks in size it makes up in usefulness per camera: nearly every feed is a working road camera.",
          },
          {
            q: "Are these the only Oceania cameras on WorldEye?",
            a: "This page indexes the two Oceania countries in the directory — Australia and New Zealand. Island nations in the Pacific don't currently contribute public feeds to the index; as new public networks are found and verified, the directory grows and this page's counts update with it.",
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
          "Sydney is the practical heart of the Australian set. The M4 Western Motorway, the M1, and the Hume Highway feeds let you read the morning build-up before you leave — Sydney's peak runs roughly 7–9 AM and 4–7 PM local time, and the motorway cameras show it forming in real time.",
          "In New Zealand, the value is winter. Auckland's 98 interchange feeds handle the commuter load, but the Canterbury (78) and South Island alpine feeds are the ones that save trips: Lewis Pass, Arthur's Pass, and the Crown Range change character in an hour when a southerly front moves through. Check the pass cameras, not the forecast icon, before crossing.",
          "Both countries sit in UTC+10 to UTC+13 (plus daylight saving), so Oceania is often the first place on the planet with daylight — handy when the rest of the index is dark. Every feed opens free on the WorldEye map, no account needed.",
          "There is a commuter rhythm to the Australian set worth knowing: Sydney's motorway cameras are at their most useful in the peaks, roughly 7–9 AM and 4–7 PM, when the M4 and M1 feeds show the build-up forming interchange by interchange. Outside the peaks the same feeds read as a general conditions check — rain on the road, fog on the north shore approaches, an incident queue forming before it hits the traffic reports.",
          "New Zealand's set rewards a different habit: check it before you commit to a route, not while you are on it. The alpine passes can close or chain-up in the space of a single southerly front, and the state-highway cameras at the approaches show the snow line and the queue before you are inside the decision. In summer the same cameras double as a window on some of the most watched touring roads in the Southern Hemisphere.",
        ]}
      />
      <AreaTable title="Oceania by country" rows={COUNTRIES} />
      <HowTo
        title="How to watch Oceania cameras live"
        steps={[
          "Open the free WorldEye map — no account or download needed.",
          "Zoom to Sydney, Auckland, or anywhere along the highways of either country.",
          "Tap a green camera marker to open that road camera's live feed.",
          "For Sydney commutes, check the M4, M1, or Hume Highway feeds during the 7–9 AM and 4–7 PM peaks.",
          "For South Island winter driving, check the Canterbury and alpine pass cameras before you cross — not after.",
          "Remember daylight saving: New Zealand runs UTC+12/13, Sydney UTC+10/11 — plan your viewing around local daylight.",
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
