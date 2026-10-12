import type { Metadata } from "next";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Faq,
} from "@/components/directory-page";

export const metadata: Metadata = {
  title: "Airport Webcams — Watch Airports Live",
  description:
    "Watch airport-area webcams live: runway views, approach paths and airport weather checks before you fly. Free, no signup, on the WorldEye globe.",
  alternates: { canonical: `${BASE}/airport-webcams` },
  openGraph: {
    title: "Airport Webcams — Watch Airports Live | WorldEye",
    description:
      "Live airport-area webcams: runway views, approach paths and weather checks before you fly. Free, no signup.",
    url: `${BASE}/airport-webcams`,
    type: "website",
  },
};

const INTRO = [
  "Airports are some of the most-watched places on the public camera network. Transport agencies, airport authorities and nearby businesses point live cameras at runways, terminals, approach corridors and the surrounding roads — and WorldEye's camera directory puts them on the globe so you can find the ones near any airport.",
  "People use airport webcams for very practical reasons: checking the weather over the field before a flight, watching departures climb out or arrivals line up on final, seeing whether the roads around the terminal are moving, or just enjoying the rhythm of a busy hub from across the world.",
  "On the live map, airport cameras sit in their real locations — around the airfield and along the routes that serve it — so you can pair what you see on the ground with the live flight layer overhead.",
  "The pre-flight weather check is the standout use. Forecasts describe the airport's weather in words; a camera shows the actual sky over the field — low scud, fog banks, the leading edge of a storm line. Pilots and frequent flyers check the field camera the way sailors check the harbor: it will not replace official aviation weather, but it grounds the forecast in something you can see.",
  "Planespotters get a different value. Approach-corridor and perimeter cameras catch arrivals on final and departures rotating — and paired with the live flight layer, you can match the aircraft overhead to the flight number, origin, and aircraft type in real time. It turns passive watching into something closer to air-traffic awareness.",
  "Then there is the pure logistics use: terminal approach roads, parking structures, and rental-car return loops. Leaving for the airport during rush hour? A camera on the terminal roadway shows whether the departures curb is flowing or gridlocked — more actionable than any traffic app's colored line.",
];

const HOW_TO = [
  "Open the live map and search for the airport or city you're interested in.",
  "Zoom into the airfield — camera markers cluster around airports, terminals and the surrounding highway interchanges.",
  "Click a camera marker to open its live feed and see current conditions at or near the airport.",
  "Turn on the flight layer to watch live aircraft on the same view — departures, arrivals and the traffic the camera is showing.",
  "Check the weather layer alongside to see the systems affecting the airport right now.",
];

const FAQS: Faq[] = [
  {
    q: "Are airport webcams really live?",
    a: "The directory indexes live public feeds. Individual cameras can go offline for maintenance or be replaced by their operators, so a specific feed may occasionally be dark — but airports tend to be well covered, with multiple cameras in the area.",
  },
  {
    q: "Can I see the runways?",
    a: "Many airport-area cameras face the airfield, terminals or approach paths, though exact views depend on each camera's placement and operator. Cameras around the airport — roads, parking, nearby landmarks — are useful even when they don't show the tarmac itself.",
  },
  {
    q: "Can I use these to check weather before flying?",
    a: "They're a great supplement: seeing the actual sky, cloud cover and ground conditions near the airport is genuinely useful. For aviation decisions, always use official aviation weather sources too — cameras show what it looks like, not what it's going to do.",
  },
  {
    q: "Do I need an account to watch?",
    a: "No. Every camera in the WorldEye directory is free to watch with no account and no signup — airport cameras included.",
  },
  {
    q: "Are these cameras operated by WorldEye?",
    a: "No. WorldEye collects and maps public feeds that their operators — transport agencies, airports, municipalities and businesses — already publish openly. It doesn't operate its own camera network.",
  },
  {
    q: "Can I match planes I see on camera to flights?",
    a: "Yes — that's one of the best combinations on the site. Turn on the live flight layer on the same map view: aircraft overhead appear with flight number, origin, destination, and aircraft type, so you can identify what the camera is showing in real time.",
  },
  {
    q: "Which airports have the most camera coverage?",
    a: "Major hubs in regions with dense public camera networks — the US, Europe, Taiwan, Japan — tend to have the most feeds around them. Search the airport on the live map and zoom in to see what's actually there.",
  },
  {
    q: "Can airport cameras help me time my drive to the terminal?",
    a: "Yes. Cameras on terminal approach roads, departures curbs, and parking structures show whether traffic is flowing or gridlocked — check them before leaving during rush hour or bad weather.",
  },
  {
    q: "Do the cameras show delays or cancellations?",
    a: "Not directly — cameras show conditions, not schedules. But a camera showing fog over the field or gridlock at the curb explains the delay board better than any status message. Pair the view with the flight layer for the full picture.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Airport Webcams — Watch Airports Live",
  description:
    "Live public webcams around airports: runway views, approach paths and airport weather checks before you fly.",
  url: `${BASE}/airport-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
};

export default function AirportWebcamsPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Cameras", href: "/cameras" },
          { label: "Airport webcams" },
        ]}
      />
      <Hero
        h1="Airport Webcams, Live"
        sub="Watch airport areas in real time — runway and airfield views, approach corridors, and the roads and weather around the world's airports."
      />
      <Intro paragraphs={INTRO} />
      <HowTo title="How to watch airport cameras" steps={HOW_TO} />
      <FaqSection title="Airport webcam FAQs" faqs={FAQS} />
      <RelatedLinks
        title="More camera directories"
        links={[
          { label: "Live webcams hub", href: "/live-webcams" },
          { label: "Top 25 camera regions", href: "/world-city-webcams" },
          { label: "Camera overview", href: "/cameras" },
        ]}
      />
      <CtaRow backHref="/cameras" backLabel="Camera overview" />
    </PageShell>
  );
}
