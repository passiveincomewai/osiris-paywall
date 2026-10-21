import Link from "next/link";
import { Camera, Globe2, History, Plane, Satellite, Telescope } from "lucide-react";
import AlternativePage, {
  altMetadata,
  type AltData,
} from "@/components/AlternativePage";

const data: AltData = {
  name: "Google Earth",
  path: "/alternatives/google-earth",
  title: "Google Earth Alternative — The Same Planet, But Live",
  description:
    "Google Earth shows you the world as it was — archived imagery, 3D cities, Timelapse. WorldEye is the alternative for the world as it is: a live globe with 74,229 cameras, flights, satellites and weather, free in your browser.",
  ogTitle: "Google Earth Alternative — When You Want the Planet Live | WorldEye",
  ogDescription:
    "Google Earth is the definitive archive of Earth. WorldEye is its live twin: real-time cameras, flights, satellites, weather and quakes on a 3D globe. Compare them honestly.",
  kicker: "GOOGLE EARTH ALTERNATIVES",
  heroIcon: Globe2,
  heroTitle: (
    <>
      Google Earth shows the world as it was.{" "}
      <span className="text-[#0096FF]">WorldEye shows it now.</span>
    </>
  ),
  heroLede: (
    <>
      Google Earth is one of the wonders of the internet — a photorealistic
      planet you can spin, dive into and rewind through forty years of
      imagery. What it has never been is live: its Earth is a archive of
      photographs taken on other days. WorldEye is the alternative for the
      present tense — a 3D globe carrying 74,229 live cameras, real-time
      flights and satellites, moving weather, earthquakes and fires. This
      page compares a time machine with a window.
    </>
  ),
  updatedNote:
    "Facts checked October 20, 2026 against Google Earth's public product pages and coverage of its Timelapse feature (24 million satellite images, 1984–2020). Google Earth and Earth Pro are free; no pricing is in dispute here.",
  aboutIcon: Telescope,
  aboutHeading: "What Google Earth is",
  about: [
    <>
      Google Earth is Google&apos;s virtual globe, available on the web at
      earth.google.com, as iOS/Android apps, and as the free Earth Pro
      desktop application. It stitches satellite and aerial photography into
      a seamless, photorealistic 3D planet — terrain, and in major cities,
      full 3D buildings — layered with Street View at ground level. Its
      Voyager programme offers guided tours and stories, its measurement and
      KML tools serve professionals, and its search knows every address and
      landmark on Earth.
    </>,
    <>
      Its crown jewel is{" "}
      <span className="text-white/85 font-semibold">Timelapse</span>: an
      animation of the planet changing, built from 24 million satellite
      images spanning 1984 to 2020 — watch cities sprawl, forests fall,
      glaciers retreat and the Aral Sea vanish. Nothing else on the consumer
      web does planetary memory like this. And the whole product, Earth Pro
      included, is free.
    </>,
    <>
      Who is it for? Everyone, honestly — explorers, students, travellers
      scouting a trip, teachers, researchers, the nostalgic looking for their
      childhood street. It is the default answer to &ldquo;show me the
      Earth&rdquo;, and it has earned that default a hundred times over. The
      only question it cannot answer is the one this page is about:{" "}
      <em>what is happening there right now?</em>
    </>,
  ],
  strengths: [
    {
      title: "Photorealistic 3D like nothing else",
      body: "Textured 3D cities and terrain from Google's imagery pipeline — diving into Manhattan or the Alps is still unmatched as pure spectacle.",
    },
    {
      title: "Timelapse: forty years of change",
      body: "24 million images animated into planetary memory — the single best tool for seeing how a place has transformed.",
    },
    {
      title: "Street View, integrated",
      body: "Drop from orbit to street level into the largest ground-level photo library on Earth, seamlessly.",
    },
    {
      title: "Completely free, everywhere",
      body: "Web, mobile and the full Earth Pro desktop — no tiers, no trials, no catch.",
    },
  ],
  gapsIcon: History,
  gapsHeading: "The one thing Google Earth can't do: now",
  gaps: [
    <>
      Every image in Google Earth is a photograph from the past. The mosaic
      is stitched from aerial and satellite captures taken on different days
      — months or years apart from place to place — and Google does not
      claim otherwise. The car in &ldquo;your&rdquo; driveway is a stranger&apos;s
      from a Tuesday in 2022. There is no live mode, no camera layer, no way
      to see the weather over a city with your own eyes or watch its airport
      work. When the question is present-tense, the archive is silent.
    </>,
    <>
      The same is true above the ground. Google Earth has no live flights,
      no tracked satellites moving overhead, no ships — the sky in Google
      Earth is empty and frozen. Its weather is a static backdrop rather than
      a system; its planet does not burn, shake or flood in real time. As a
      result, the world&apos;s most beautiful globe is a museum: perfect,
      motionless, and always slightly out of date.
    </>,
    <>
      People searching for a Google Earth alternative usually aren&apos;t
      disappointed with it — they&apos;ve hit that one wall. They want the
      spin-and-dive joy aimed at the living world: live cameras in the
      streets below, flights arcing overhead, storms actually moving. That
      specific product is WorldEye&apos;s entire reason to exist.
    </>,
  ],
  worldEyeHeading: "WorldEye: the present-tense globe",
  worldEye: [
    <>
      WorldEye is a 3D globe built backwards from Google Earth&apos;s gap:
      everything on it is happening now.{" "}
      <span className="text-white/85 font-semibold">
        74,229 live public cameras
      </span>{" "}
      — streets, beaches, volcanoes, ski slopes, harbours — searchable by{" "}
      <Link href="/cameras" className="text-[#0096FF] hover:underline">
        country and city
      </Link>
      ; live flights and tracked satellites in motion; weather, radar,
      hurricanes, earthquakes and wildfires updating as sensors report them.
      It is free with no signup, in the browser, phone or desktop.
    </>,
    <>
      The honest trades, both directions: WorldEye&apos;s globe is not
      photorealistic — no textured 3D cities, no Street View, no forty-year
      Timelapse of its own (its timelapse feature builds living sequences
      from camera feeds, a different and smaller thing). If your joy is
      exploring the archive or swooping through a 3D Venice, Google Earth
      remains the masterpiece. If your joy is watching the actual day unfold
      on the actual planet — the fog on the Golden Gate right now, the
      eruption starting, the storm making landfall — that&apos;s the window
      WorldEye opens. Pro adds satellite map view and flight-path following;
      VIP Pro adds intel layers, recording and camera alerts.
    </>,
  ],
  worldEyePoints: [
    {
      title: "Live cameras instead of archived photos",
      body: "Zoom to a city and open its streets as they are this minute — traffic moving, weather visible, life happening.",
    },
    {
      title: "A sky that's actually populated",
      body: "Thousands of live flights and tracked satellites cross the globe continuously — the present tense, rendered.",
    },
    {
      title: "Weather you can watch",
      body: "Radar, satellite view (Pro), hurricanes, quakes and fires update live — and cameras underneath confirm what the layers claim.",
    },
    {
      title: "Alerts and recording",
      body: "Watch a place over time: multi-camera recording and VIP Pro alerts that notify you, with a photo, when a feed changes.",
    },
  ],
  chips: [
    { icon: Camera, label: "74,229 live cameras", href: "/cameras" },
    { icon: Plane, label: "Live flights", href: "/live-flight-tracker" },
    { icon: Satellite, label: "Satellite tracker", href: "/satellite-tracker" },
  ],
  tableHeading: "Google Earth vs WorldEye, side by side",
  tableIntro:
    "A time machine vs a window. Neither is a lesser product — they are opposite answers to 'show me the Earth'.",
  rows: [
    { feature: "Imagery", competitor: "Archived satellite/aerial photography, stitched from many dates", worldEye: "Live camera feeds and live data layers, updated continuously" },
    { feature: "3D", competitor: "Photorealistic 3D terrain and buildings in major cities", worldEye: "Interactive 3D globe; satellite view on Pro — not photoreal 3D cities" },
    { feature: "Live cameras", competitor: "None — no live video anywhere in the product", worldEye: "74,229 live public cameras" },
    { feature: "Live flights & satellites", competitor: "None — the sky is static", worldEye: "Yes — live flights and tracked satellites, free" },
    { feature: "Weather, quakes, fires", competitor: "Static backdrop; no live hazard layers", worldEye: "Live weather, radar, hurricanes, USGS quakes, FIRMS fires" },
    { feature: "History", competitor: "Timelapse 1984–today plus historical imagery — best in class", worldEye: "Present-focused; camera timelapse on VIP Pro" },
    { feature: "Street-level", competitor: "Street View — the world's largest street photo library", worldEye: "Street-level imagery panel via public photo sources; live cameras are the real street view" },
    { feature: "Price", competitor: "Free, including Earth Pro", worldEye: "Free core; Pro $7.99/wk or $13.99/mo; VIP Pro $74.99/yr" },
    { feature: "Recording & alerts", competitor: "No", worldEye: "Multi-cam recording; camera alerts on VIP Pro" },
  ],
  pricingHeading: "Pricing: free vs free — with an optional upgrade",
  pricing: [
    <>
      Google Earth costs nothing — web, apps and Earth Pro are all free, and
      that will not change; it is one of Google&apos;s goodwill cathedrals.
      There is nothing to compare on price, and any page implying otherwise
      is inventing a contest.
    </>,
    <>
      WorldEye&apos;s live globe is likewise{" "}
      <span className="text-white/85 font-semibold">
        free with no signup
      </span>
      . Its paid tiers buy monitoring capability Google Earth doesn&apos;t
      sell at any price:{" "}
      <span className="text-white/85 font-semibold">
        Pro ($7.99/week or $13.99/month, 1-day trials)
      </span>{" "}
      for satellite view, flight-path follow, the OSINT toolkit and
      20-camera recording;{" "}
      <span className="text-white/85 font-semibold">
        VIP Pro ($74.99/year, 3-day trial)
      </span>{" "}
      for intel layers, timelapse and camera alerts — first charges covered
      by a 7-day money-back guarantee. Full detail on the{" "}
      <Link href="/pricing" className="text-[#0096FF] hover:underline">
        pricing page
      </Link>{" "}
      and the{" "}
      <Link href="/compare/google-earth" className="text-[#0096FF] hover:underline">
        head-to-head
      </Link>
      .
    </>,
  ],
  stepsHeading: "From the archive to the live planet",
  steps: [
    {
      title: "Open WorldEye",
      body: "worldeye.app — the globe loads live in your browser, no install, no account.",
    },
    {
      title: "Go somewhere you know from Google Earth",
      body: "Search your city or a famous place. The difference lands immediately: the streets below are moving.",
    },
    {
      title: "Open a camera",
      body: "Pick a feed — a beach, a volcano, a downtown crossing — and watch the present tense for a while.",
    },
    {
      title: "Layer the sky",
      body: "Turn on flights, satellites, weather and fires. Keep Google Earth for memory lane; this is your daily window.",
    },
  ],
  verdictHeading: "Which one should you use?",
  verdicts: [
    {
      q: "Exploring places, past and present?",
      a: "Google Earth. Photoreal 3D, Street View and Timelapse make it the greatest atlas ever given away.",
    },
    {
      q: "Watching the world as it happens?",
      a: "WorldEye. Live cameras, live sky, live weather — the planet in the present tense.",
    },
    {
      q: "Teaching or storytelling?",
      a: "Both, in sequence: Timelapse for how a place changed, WorldEye for what it's doing today.",
    },
  ],
  faqHeading: "Google Earth alternative questions, answered",
  faqs: [
    {
      q: "Is Google Earth live?",
      a: "No. Google Earth's imagery is archival — satellite and aerial photographs captured on different dates (often months or years old, varying by location) and stitched into a mosaic. It has no live cameras, live flights or real-time weather. For a live globe, WorldEye is the alternative: 74,229 live cameras and real-time data layers.",
    },
    {
      q: "Can I see my house live on Google Earth?",
      a: "No — what you see is a photograph from a past capture date, not a live feed, and Google Earth offers no live view of any address. WorldEye can't show private property either, but its 74,229 public cameras show streets, landmarks and neighbourhoods in many cities as they are right now.",
    },
    {
      q: "What is the best Google Earth alternative?",
      a: "For exploring and 3D, Google Earth itself is still the benchmark, with NASA Worldview a strong pick for scientific satellite imagery. For a live globe — cameras, flights, satellites, weather in real time — WorldEye is the alternative built for exactly that.",
    },
    {
      q: "Is Google Earth free?",
      a: "Yes — completely, including the Earth Pro desktop application, which has been free since 2015. WorldEye's live globe is also free (no signup); its optional Pro tiers add satellite view, recording, alerts and intel layers.",
    },
    {
      q: "Google Earth vs WorldEye — what's the difference?",
      a: "Time. Google Earth is the planet's archive: photorealistic imagery, 3D cities, Street View and a 40-year Timelapse, all frozen at capture dates. WorldEye is the planet's present: a 3D globe of live cameras, flights, satellites, weather, quakes and fires, updated continuously.",
    },
    {
      q: "Does WorldEye have 3D buildings like Google Earth?",
      a: "No. WorldEye's globe is a data globe — its realism is liveness, not textured 3D architecture. Google Earth's photorealistic 3D cities remain unmatched, and this page won't pretend otherwise. WorldEye's Pro satellite view gives you the orbital look; the cameras give you the street.",
    },
    {
      q: "What happened to Google Earth Pro?",
      a: "Nothing bad — Google made Earth Pro free in 2015 (it previously cost $399/year) and it remains available as a desktop application with measurement, GIS and printing tools, alongside the web and mobile versions of Google Earth.",
    },
  ],
  midCta: {
    heading: "You've seen the archive. Now see today.",
    body: "The same spinning-planet joy, aimed at the present: live cameras, flights, satellites and storms — free in your browser.",
  },
  ctaHeading: (
    <>
      The world, <span className="text-[#0096FF]">as it is right now.</span>
    </>
  ),
  ctaBody: "One globe, live — no install, no signup.",
  related: [
    {
      label: "Google Earth vs WorldEye, head to head",
      desc: "The dedicated comparison page.",
      href: "/compare/google-earth",
    },
    {
      label: "Best interactive 3D globes",
      desc: "The full ranked guide — archives, live globes and everything between.",
      href: "/best-interactive-3d-globes",
    },
    {
      label: "God's Eye View alternatives",
      desc: "The cinematic open-source globe — and its hosted alternative.",
      href: "/alternatives/gods-eye-view",
    },
    {
      label: "Live webcams",
      desc: "Start with the cameras: 74,229 feeds, organised.",
      href: "/live-webcams",
    },
  ],
};

export const metadata = altMetadata(data);

export default function Page() {
  return <AlternativePage data={data} />;
}
