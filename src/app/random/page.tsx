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
import RandomCameraRoulette from "@/components/RandomCameraRoulette";
import { loadAllRecords } from "@/lib/explore-data";
import {
  guessCountries,
  playableRouletteCameras,
  sampleRoulettePool,
} from "@/lib/random-camera";

/* Data source: the generated camera catalogue (src/data/countries/*.json
   via lib/explore-data) — the same records the country pages serve. The
   dealer (lib/random-camera) only deals feeds the site's viewer plays
   natively, stratified by country so the game roams the planet instead
   of clustering wherever the catalogue is densest. The headline total
   is the owner's published served-camera figure. */
const HEADLINE = 74229;

export const metadata: Metadata = {
  title: "Random Camera Roulette — Guess Where This Live Webcam Is",
  description:
    "A random live camera drops you somewhere on Earth — study the scene, guess the country, reveal the answer. Play free with real webcams from WorldEye's 74,229-camera network. No signup.",
  alternates: { canonical: `${BASE}/random` },
  openGraph: {
    title: "Random Camera Roulette — Guess the Live Webcam's Location",
    description:
      "One random live webcam, one question: which country is this? Free to play, real cameras, no signup.",
    url: "/random",
    type: "website",
  },
};

const INTRO = [
  "Random Camera Roulette is a guessing game played on real, live cameras. Each round deals you one webcam from WorldEye's network of 74,229 public cameras — a highway in the snow, a harbor at dawn, a plaza you've never heard of — with every label stripped away. Study the scene, name the country, and reveal the answer. Exact country scores 100 points; landing in the right region of the world scores 25.",
  "The cameras are dealt evenly across the map rather than straight off the catalogue pile — the raw network is heavy on US highway cameras, so the dealer works round-robin by country to keep the game honest geography: one round might be a Japanese river gauge, the next a Spanish motorway or a Canadian mountain pass. Only feeds that actually play are dealt, and a camera that fails to load is skipped automatically — a dead feed never costs you a round.",
  "It's built for fans of geography guessing games: the people who can name a country from its road markings, its license plates, the side of the road traffic drives on, or the shape of its mountains. Every clue is real because the scene is real — live, unscripted, and different every time you play. No rounds are pre-recorded and no two sessions deal the same planet twice.",
];

const TILES = [
  {
    title: "Read the scene",
    body: "Road paint, signage scripts, number plates, vegetation, architecture, the sun's angle — a live camera leaks its location in a dozen ways at once. Snapshot cameras refresh while you study them, so weather and light move as you think.",
  },
  {
    title: "Every feed is real",
    body: "No stock photos and no staged rounds: each camera is a public feed from the same catalogue behind WorldEye's country directories, dealt the moment you play. After the reveal you can open the very same camera on the globe and keep watching it.",
  },
  {
    title: "The whole planet is the board",
    body: "Dealt cameras span 100+ countries — traffic systems, beaches, ski slopes, harbors, city squares. The guess list shows each country's region as a standing hint, so even a miss teaches you the map: close counts, and close is scored.",
  },
];

const FAQS = [
  {
    q: "How do you play Random Camera Roulette?",
    a: "A live camera appears with its name and location hidden. Search the country list, pick the country you think the camera is in, and press Reveal. An exact country scores 100 points, the right region of the world (for example, the camera is in Asia and you guessed another Asian country) scores 25. Press Next camera to play another round — your score lasts for the session.",
  },
  {
    q: "Where do the cameras come from?",
    a: "Every round is a real public webcam from WorldEye's live directory — 74,229 cameras across more than 100 countries, the same feeds plotted on the globe and listed on the country pages. The game only deals cameras whose feeds play directly (live streams and refreshing snapshot cameras), and it deals them evenly by country so one big national network can't dominate the game.",
  },
  {
    q: "Is Random Camera Roulette free?",
    a: "Yes — completely free, with no account and no signup, like every camera on WorldEye. Open the page and the first camera is already dealing.",
  },
  {
    q: "Why did a camera skip itself before I could guess?",
    a: "Some public feeds are briefly offline or slow. If a dealt camera produces no picture within a few seconds — or the feed reports an error — the game skips it silently and deals another, so a broken camera never wastes your round or your score. You can also skip any camera yourself with the skip link under the guess box.",
  },
  {
    q: "Can I keep watching a camera after the reveal?",
    a: "Yes. Every reveal links to that exact camera on the WorldEye globe and to its country's camera directory, so a camera that caught your eye becomes a place you can return to — many players end a session by falling down a rabbit hole of harbors, ski lifts and night markets.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Random Camera Roulette — Guess Where This Live Webcam Is",
  description:
    "A geography guessing game played on live webcams: a random camera from WorldEye's 74,229-camera network, one country guess per round, scored reveals.",
  url: `${BASE}/random`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

export default async function RandomCameraPage() {
  const records = await loadAllRecords();
  const playable = playableRouletteCameras(records);
  const initialPool = sampleRoulettePool(playable, 24);
  const countries = guessCountries(playable);

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Random Camera Roulette" },
        ]}
      />
      <Hero
        h1="Random Camera Roulette"
        sub={`We drop you at a random live camera somewhere on Earth — one of ${HEADLINE.toLocaleString("en-US")} real webcams. Guess the country.`}
      />

      <RandomCameraRoulette initialPool={initialPool} countries={countries} />

      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Why geography fans love it</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {TILES.map((t) => (
            <div
              key={t.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h3 className="font-semibold text-white/90">{t.title}</h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      <HowTo
        title="How to play"
        steps={[
          "Watch the camera and read the scene: road markings, signs, plates, landscape, weather, light.",
          "Type in the guess box to search the country list and pick the country you're backing.",
          "Press Reveal the answer — exact country scores 100 points, the right region scores 25.",
          "Open the revealed camera on the globe if it caught your eye, or press Next camera to keep the streak going.",
          "If a feed stalls, the game skips it for you — a dead camera never costs a round.",
        ]}
      />

      <FaqSection title="Random Camera Roulette — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="Keep exploring live Earth"
        links={[
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Kyoto webcams", href: "/city-webcams/kyoto" },
          { label: "Stockholm webcams", href: "/city-webcams/stockholm" },
          { label: "Volcano webcams", href: "/volcano-webcams" },
          { label: "Open the live globe", href: "/" },
        ]}
      />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
