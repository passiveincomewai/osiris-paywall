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
  title: "Beach Webcams — Live Coastal Cameras Worldwide",
  description:
    "Watch live beach webcams worldwide: surf and swell, sunrises, coastal weather and harbor views — free on the WorldEye map, no signup needed.",
  alternates: { canonical: `${BASE}/beach-webcams` },
  openGraph: {
    title: "Beach Webcams — Live Coastal Cameras Worldwide",
    description:
      "Live beach webcams: surf, sunrises, coastal weather and harbor views. Free on the WorldEye map.",
    url: "/beach-webcams",
    type: "website",
  },
};

const INTRO = [
  "Coastal cameras are some of the most-watched feeds on the planet — and not just by surfers. A live beach camera shows the surf, the crowd, the cloud cover and the mood of the coast as it is right now, which is something no brochure photo or forecast icon can do.",
  "WorldEye's camera directory includes beach, boardwalk, harbor and marina feeds from coastlines around the world. They're plotted on the same globe as the weather layer, so you can watch a sunrise over the Atlantic, check the swell before a surf session, or see whether the coast you're visiting is sunny or socked in — all in one view.",
  "Every coastal feed opens free on the WorldEye map — no account, no signup. Zoom to any coastline, look for the camera markers near the water, and start watching.",
  "For travelers, the beach camera is the antidote to the tourism brochure. That 'pristine stretch of sand' might be packed shoulder-to-shoulder at noon, or the water might be brown after a storm — the camera shows the beach as it is, not as the marketing department wishes it were. Check the day before you go, and the morning of.",
  "For surfers, the value is the swell check. Beach-facing cameras near breaks show wave size, wind texture on the water, and how crowded the lineup is. It won't replace a dedicated surf report with period and direction data, but it answers the only question that matters at 6 AM: is it worth driving there?",
  "And for everyone else, there is the simple pleasure of it. A beach camera at golden hour — pelicans on the pier, the light going flat gold on the water — is one of the most-watched categories on the internet for a reason. Pick a coast in the right timezone and watch the day happen somewhere else.",
  "There is a rhythm to coastal watching that regulars learn: dawn patrol for the surf check, midday for the crowd and weather read, and the storm hours when a front comes ashore and the feeds turn dramatic. Because the cameras sit on the same globe as the weather and hurricane layers, you can watch a system approach a coast on the map and then drop into the beach cameras as it arrives — the forecast and the place it is about to hit, in one session.",
];

const CATEGORIES = [
  {
    title: "Surf and swell",
    body: "Beach-facing cameras near known breaks show wave size, wind texture and crowd levels in real time. Check the swell before you wax up — or watch the sets roll in from your desk when you can't be there.",
  },
  {
    title: "Sunrises and sunsets",
    body: "East-facing coasts catch the sunrise, west-facing coasts the sunset. Coastal cameras pointed at the horizon turn the globe into a perpetual golden-hour machine — pick a timezone and watch the light change.",
  },
  {
    title: "Harbor and marina views",
    body: "Marina and harbor cameras show boat traffic, water conditions and fog rolling in off the sea. They're the practical check for sailors and the relaxing one for everyone else.",
  },
  {
    title: "Beach weather, visually",
    body: "A forecast says 'partly cloudy.' A beach camera shows you exactly how cloudy, whether the beach is packed or empty, and whether that 'chance of rain' is a drizzle or a wall of gray. Pack — or cancel — from live conditions.",
  },
  {
    title: "Boardwalks and piers",
    body: "Boardwalk and pier cameras show the human side of the coast: crowds, street performers, fishing activity, and the evening promenade. They are the best way to feel the energy of a beach town before visiting.",
  },
  {
    title: "Storm watching",
    body: "When hurricanes, typhoons, or winter storms approach a coast, beach cameras become front-row seats — waves building, skies darkening, streets emptying. During storm season these feeds turn genuinely newsworthy.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Beach Webcams — Live Coastal Cameras Worldwide",
  description:
    "Directory of live beach and coastal webcams worldwide: surf, sunrises, coastal weather and harbor views.",
  url: `${BASE}/beach-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Are beach webcams free to watch?",
    a: "Yes. Every coastal camera in the directory is free to watch — no account, no signup, no paywall. Open the WorldEye map, zoom to any coastline, and tap a camera marker near the water.",
  },
  {
    q: "Can I check surf conditions on a beach webcam?",
    a: "Often. Beach-facing cameras near surf breaks show wave size, wind on the water and how crowded the lineup is. They won't replace a dedicated surf report, but they're the fastest visual check before you head out.",
  },
  {
    q: "Do beach cameras show the weather at the coast?",
    a: "Yes — that's one of their best uses. A camera shows cloud cover, fog, rain and light conditions exactly as they are. Check the coast you're visiting before you pack the beach bag.",
  },
  {
    q: "Can I watch sunrises and sunsets on beach cameras?",
    a: "Yes. East-facing beaches catch sunrise, west-facing beaches catch sunset. Pick a coast in the right timezone, find a camera pointed at the horizon, and watch it happen live.",
  },
  {
    q: "How do I find a specific beach?",
    a: "Use the map search to jump to the beach town or coastline by name, then zoom in — camera markers cluster near the water. Boardwalk, pier, and harbor cameras are usually labeled by their location.",
  },
  {
    q: "Can beach cameras help me plan a beach vacation?",
    a: "Absolutely. Check the beach the day before and the morning of: crowds, water color, cloud cover, and whether the beach matches the brochure. It is the most honest travel preview there is.",
  },
  {
    q: "Do beach cameras work during storms?",
    a: "Often they are the most compelling feeds during storms — waves building, skies darkening. But individual cameras can go offline in severe weather when power or connectivity fails, so have a backup feed in mind.",
  },
  {
    q: "Are there marina and harbor cameras too?",
    a: "Yes. Marina and harbor feeds show boat traffic, water conditions, and fog rolling in — practical for sailors checking conditions and relaxing for everyone else.",
  },
  {
    q: "Can beach cameras show rip currents or water safety conditions?",
    a: "Partly. Cameras show surf size, whitewater patterns and how rough the water looks, which are useful signals — but they cannot certify water safety, and flags, patrols and local warnings always win. Treat the camera as a preview, and the lifeguard's call as the decision.",
  },
  {
    q: "Which coasts have the most beach cameras?",
    a: "Coverage follows public camera infrastructure: US coastlines (Florida, California, Hawaii and the Carolinas), European resorts, and parts of Australia and the Caribbean are the densest in the directory. Search any coastline on the map — the markers cluster where the cameras are.",
  },
];

export default function BeachWebcamsPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Beach webcams" },
        ]}
      />
      <Hero
        h1="Beach Webcams — Live Coastal Cameras"
        sub="Surf, sunrises, coastal weather and harbor views — live, free, no signup."
      />
      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">What coastal cameras show</h2>
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
        title="How to watch beach webcams"
        steps={[
          "Open the free WorldEye map — no account or download needed.",
          "Zoom to any coastline and look for camera markers near the water.",
          "Tap a beach, boardwalk or harbor marker to open that coastal camera's live feed.",
        ]}
      />

      <FaqSection title="Beach webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More webcam directories"
        links={[
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Top 25 camera regions", href: "/world-city-webcams" },
          { label: "Cameras overview", href: "/cameras" },
        ]}
      />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
