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
} from "@/components/directory-page";

export const metadata: Metadata = {
  title: "South America Webcams — 89 Live Cameras",
  description:
    "Watch 89 live webcams across South America — Brazil beaches and landmarks, Andean feeds from Peru and Chile, and Argentine coast views — free on WorldEye.",
  alternates: { canonical: `${BASE}/south-america-webcams` },
  openGraph: {
    title: "South America Webcams — 89 Live Cameras",
    description:
      "89 live cameras across 8 South American countries — Brazil, Peru, Chile, Argentina and more. Free on the WorldEye map.",
    url: "/south-america-webcams",
    type: "website",
  },
};

const INTRO = [
  "South America is the smallest regional camera network on WorldEye — 89 live cameras across 8 countries — and this page will not dress that up as anything bigger. What the network lacks in density it partly makes up for in range: Brazilian beaches and landmarks, Andean towns in Peru and Chile, Argentine coast and far-south views, and a Pacific strip in Ecuador.",
  "Brazil is the largest cluster by a wide margin: 36 cameras, more than 40% of the regional total. Balneario Camboriu and Rio de Janeiro lead the Brazilian areas, with the Christ the Redeemer feed overlooking Rio as the standout landmark camera of the whole South American network.",
  "The Andean countries form the second cluster. Peru holds 18 cameras — Lima leads its areas, with feeds scattered from the coast to Cusco — and Chile adds 12, stretched the length of the country from San Pedro de Atacama in the desert north to Punta Arenas at the far south.",
  "Argentina's 11 cameras cover the Southern Cone side: Buenos Aires, coastal towns like Necochea and Monte Hermoso, and Ushuaia and Tolhuin at the end of the world in Tierra del Fuego. The southern feeds are weather cameras as much as anything — the far south performs for a lens.",
  "The long tail is genuinely long: Ecuador's 8 cameras hug the Pacific coast around Santa Elena and Puerto Lopez, Bolivia has 2, and Venezuela and Uruguay have 1 each — Margarita Island and Punta del Este. Single feeds, honestly labeled, in a network that is still growing.",
  "Every South American feed opens free on the WorldEye map — no account, no signup. It is a small, scenic-leaning network today: check a Brazilian beach before a trip, watch the Andes weather roll through, or take in Rio from Corcovado without leaving your desk.",
];

const CATEGORIES = [
  {
    title: "Brazil — the largest cluster",
    body: "Brazil's 36 cameras are over 40% of the regional network. Santa Catarina beaches like Central Beach, Estaleiro and Praia Brava cover the coast, while Rio's feeds include Christ the Redeemer and Manaus adds an Amazon counterpoint. Start here — it is the deepest part of the map.",
  },
  {
    title: "Andean countries — Peru",
    body: "Peru's 18 cameras run from Lima (5) down the coast through Paracas and Trujillo, with highland and gateway feeds at Cusco and Cajamarca. A mix of street views and town cameras that doubles as a weather check across very different altitudes.",
  },
  {
    title: "Andean countries — Chile",
    body: "Chile's 12 cameras stretch the length of a very long country: Algarrobo and San Antonio on the central coast, Valparaiso and Santiago, San Pedro de Atacama in the Atacama Desert, and Punta Arenas at the southern tip. Few networks cover this much latitude.",
  },
  {
    title: "Southern Cone — Argentina",
    body: "Argentina's 11 cameras mix city and coast: a Buenos Aires feed, Atlantic towns like Necochea, Claromeco and Monte Hermoso, and the far-south pair of Ushuaia and Tolhuin in Tierra del Fuego — the southernmost views in the index.",
  },
  {
    title: "Ecuador and the small networks",
    body: "Ecuador's 8 cameras sit on the Pacific around Santa Elena, Salinas, Playas and Puerto Lopez. Bolivia (2), Venezuela (1, Margarita Island) and Uruguay (1, Punta del Este) are single-window countries for now — small, and labeled as such.",
  },
  {
    title: "Scenic and street mix",
    body: "Unlike the highway-heavy networks elsewhere, South America's feeds lean scenic and street-level: beaches, landmarks, town views and resort shores alongside city streets. The best use is looking before you go — surf, weather and the feel of a place, live.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "South America Webcams — 89 Live Cameras",
  description:
    "Directory of 89 live webcams across 8 South American countries: Brazil, Peru, Chile, Argentina, Ecuador, Bolivia, Venezuela and Uruguay.",
  url: `${BASE}/south-america-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "How many live cameras are there in South America?",
    a: "89, across 8 countries: Brazil (36), Peru (18), Chile (12), Argentina (11), Ecuador (8), Bolivia (2), Venezuela (1) and Uruguay (1). It is the smallest regional network on WorldEye.",
  },
  {
    q: "Which South American country has the most cameras?",
    a: "Brazil, with 36 feeds — more than 40% of the regional total. Balneario Camboriu and Rio de Janeiro lead its areas, and the Christ the Redeemer feed is the network's standout landmark camera.",
  },
  {
    q: "Is South America well covered compared to other regions?",
    a: "Honestly, no — 89 cameras makes it the smallest regional network on the site, far thinner than North America or Europe. Coverage is growing, but expect clusters (Brazil, the Andes, the Argentine coast) and gaps elsewhere rather than blanket coverage.",
  },
  {
    q: "Can I see Christ the Redeemer live?",
    a: "Yes — a Rio de Janeiro feed shows Christ the Redeemer live, with real weather over the city. It is one of the standout landmark cameras in the whole WorldEye directory.",
  },
  {
    q: "What do South American cameras usually show?",
    a: "A scenic and street-level mix rather than highway grids: Brazilian beaches, Andean town views, Argentine coastal and far-south feeds, and Ecuadorian Pacific shores, alongside city streets in Lima, Santiago and Buenos Aires.",
  },
  {
    q: "Are there cameras in the far south?",
    a: "Yes — Argentina's Ushuaia and Tolhuin feeds in Tierra del Fuego, and Chile's Punta Arenas camera, are among the southernmost views in the index. They double as weather windows on the far south.",
  },
  {
    q: "Are the feeds free to watch?",
    a: "Yes. Every South American camera opens free on the WorldEye map — no account, no signup, no paywall.",
  },
  {
    q: "Which countries have only one or two cameras?",
    a: "Uruguay (1, at Punta del Este) and Venezuela (1, Margarita Island) have a single feed each, and Bolivia has 2. They are single windows onto those countries for now, and the counts on this page say so plainly.",
  },
  {
    q: "What are South American cameras best used for?",
    a: "Reading the continent's great road systems live: the urban traffic grids of the big metros, the approaches to Andean passes, and coastal conditions in the beach cities. For travelers, the city feeds are the orientation tool — how a neighborhood actually moves before you arrive in it.",
  },
  {
    q: "Why is coverage thinner than North America's?",
    a: "It follows publishing, not population. Fewer South American road authorities stream their camera networks openly, so the index is smaller — the directory grows country by country as public feeds appear and are verified.",
  },
];

export default function SouthAmericaWebcamsPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "South America webcams" },
        ]}
      />
      <Hero
        h1="South America Webcams — 89 Live Cameras"
        sub="Brazil beaches, Andean towns and far-south views — the smallest regional network on WorldEye, live and free."
      />
      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Where the cameras are</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {CATEGORIES.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h3 className="font-semibold text-white/90">{c.title}</h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <HowTo
        title="How to watch South American cameras"
        steps={[
          "Open the free WorldEye map — no account or download needed.",
          "Zoom to South America and look for camera markers along the Brazilian coast, in the Andes, and down the Argentine coast.",
          "Tap a marker to open that camera's live feed.",
          "Start with Brazil for depth — 36 feeds — then work down the Andes through Peru (18) and Chile (12).",
          "Check beach feeds in the morning for the day's surf and weather, and the far-south feeds any time for Tierra del Fuego conditions.",
          "Remember the continent spans several time zones and both seasons at once — summer in the far south is short, and the Atacama barely has weather at all.",
        ]}
      />

      <FaqSection title="South America webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More webcam directories"
        links={[
          { label: "Brazil live cameras", href: "/cameras/countries/brazil" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Cameras overview", href: "/cameras" },
        ]}
      />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
