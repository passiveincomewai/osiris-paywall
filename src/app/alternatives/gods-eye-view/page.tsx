import Link from "next/link";
import { Camera, Eye, GitBranch, Plane, Satellite, Unlock } from "lucide-react";
import AlternativePage, {
  altMetadata,
  type AltData,
} from "@/components/AlternativePage";

const data: AltData = {
  name: "God's Eye View",
  path: "/alternatives/gods-eye-view",
  title: "God's Eye View Alternative — The Same Live Globe, Already Running",
  description:
    "Looking for a God's Eye View alternative you don't have to install? WorldEye runs the same live-globe idea — 74,229 cameras, flights, satellites, weather — hosted in your browser, free with no signup.",
  ogTitle: "God's Eye View Alternative — Hosted Live Globe, No Install | WorldEye",
  ogDescription:
    "God's Eye View is open-source software you install yourself. WorldEye is the hosted alternative: a live 3D globe with 74,229 cameras, flights and satellites — free, no setup, no API keys.",
  kicker: "GOD'S EYE VIEW ALTERNATIVES",
  heroIcon: Eye,
  heroTitle: (
    <>
      The God&apos;s Eye View alternative that&apos;s{" "}
      <span className="text-[#0096FF]">already running.</span>
    </>
  ),
  heroLede: (
    <>
      God&apos;s Eye View is a brilliant open-source project — and a project is
      exactly what it is: software you download, install and run yourself.
      WorldEye is the same live-planet idea delivered as a website: one 3D
      globe carrying 74,229 live cameras, flights, satellites, weather,
      earthquakes and fires, open in your browser right now. This page
      compares the two honestly.
    </>
  ),
  updatedNote:
    "Facts checked October 20, 2026 against the God's Eye View README on GitHub and WorldEye's live pricing page. Camera counts are each project's own published figures.",
  aboutIcon: GitBranch,
  aboutHeading: "What God's Eye View actually is",
  about: [
    <>
      God&apos;s Eye View is an open-source spatial-intelligence globe created
      by Bilawal Sidhu (with Sameh Khamis, at Halfpixel) and released on
      GitHub in August 2026 after a viral YouTube series. It renders a
      photorealistic Cesium 3D Earth and layers live public data over it:
      aircraft, ships, satellites, earthquakes, wildfires, traffic, live
      transit in a growing list of cities, geolocated radio, and a CCTV mesh
      of roughly 4,000 public cameras projected into the 3D scene. On top sits
      its signature feature — a voice-controlled AI agent, built on
      OpenAI&apos;s Realtime API with 28 tools, that can fly the globe, query
      layers and annotate the world while you talk to it.
    </>,
    <>
      It starts keyless: Esri satellite imagery and keyless terrain carry the
      base experience, and most data layers need no account at all. The
      upgrades are where keys come in — photorealistic 3D tiles need a Cesium
      ion token or your own Google Maps API key, and the voice agent runs on
      your OpenAI key, billed to you. You install it with a one-click Pinokio
      installer, Docker, or a manual clone, and you keep it updated yourself.
      There is no official hosted version; the project ships as software,
      deliberately.
    </>,
    <>
      Who is it for? Builders, tinkerers and privacy-minded watchers who want
      the code in their hands — every layer is a module you can inspect,
      extend or replace. Its cinematic touches (a cockpit view that rides
      inside a tracked flight, GLSL sensor looks like FLIR and night vision, a
      scene director for capturing tours) are things no hosted site in this
      category offers. If that sounds like your evening, you should download
      it — it is genuinely excellent, and it is free under the MIT licence.
    </>,
  ],
  strengths: [
    {
      title: "Open source and yours to modify",
      body: "MIT-licensed code you can fork, extend with your own layers and run entirely on your own machine — no account, no landlord.",
    },
    {
      title: "The voice agent is unique",
      body: "Twenty-eight tools driven by natural speech — 'fly to Tokyo', 'how many flights over Texas?', sensor modes on command. Nobody else in this space ships that.",
    },
    {
      title: "Cinematic sensor aesthetics",
      body: "Cockpit view, FLIR/NVG/CRT shader looks, detection overlays and a military-style HUD give it a spy-thriller feel hosted sites don't imitate.",
    },
    {
      title: "Honest data labelling",
      body: "The project carefully marks layers as live, delayed, partial, simulated or reconstructed — a standard of candour the whole niche should copy.",
    },
  ],
  gapsIcon: Unlock,
  gapsHeading: "Why people look for an alternative anyway",
  gaps: [
    <>
      The gap is not quality — it is friction. Every session with God&apos;s
      Eye View starts with your own infrastructure: install the app, keep it
      updated, and supply your own keys for its best features. The
      photorealistic tiles that make its screenshots famous run on a Cesium
      ion token or a Google Maps key on your account, and the voice agent
      bills your OpenAI account per conversation. None of that is hidden — the
      README is admirably plain about it — but it means the distance between
      &ldquo;I saw the video&rdquo; and &ldquo;I am watching the planet&rdquo;
      is an installation, not a click.
    </>,
    <>
      The second gap is scale where it matters most to casual watchers:
      cameras. The project&apos;s CCTV mesh lists roughly 4,000 public cameras
      (a shared cap, mostly transport-agency feeds in North America and
      Europe). That is a respectable mesh, but it is a fraction of what a
      dedicated hosted camera network serves — and because you run the
      software yourself, its coverage grows only when the project ships new
      packs and you update.
    </>,
    <>
      The third gap is the device in your pocket. A self-installed desktop
      project is not something you open on your phone on a train. For a lot of
      people the honest summary is: God&apos;s Eye View is the better{" "}
      <em>software</em>; they are looking for the better <em>website</em>. That
      is the exact shape of the alternative below.
    </>,
  ],
  worldEyeHeading: "WorldEye: the same idea, hosted",
  worldEye: [
    <>
      WorldEye takes the same concept — one live globe, many layers of public
      data — and runs it as a hosted product at worldeye.app. There is nothing
      to install, no keys to bring and no account needed to start: open the
      page and the globe is already live with{" "}
      <span className="text-white/85 font-semibold">
        74,229 public cameras
      </span>{" "}
      (a catalogue of 76,625), live flights, tracked satellites, weather,
      earthquakes, wildfires, radar and transit. To be plain about lineage:
      WorldEye is an independent product from a separate team, not affiliated
      with the God&apos;s Eye View project — the two share an idea, not code.
    </>,
    <>
      Where the emphasis differs is depth of watching rather than depth of
      tinkering. The camera network is the headline — searchable by{" "}
      <Link href="/cameras" className="text-[#0096FF] hover:underline">
        country and city
      </Link>
      , with categories from ski slopes to volcanoes — and around it sit the
      tools of a monitoring product: multi-camera recording, timelapse and
      (on VIP Pro) camera alerts that watch a feed for a condition you
      describe and tell you when it changes. If God&apos;s Eye View is a
      workbench, WorldEye is a window.
    </>,
  ],
  worldEyePoints: [
    {
      title: "Zero setup, on any device",
      body: "The globe runs in a phone or desktop browser. No installer, no Docker, no keys for the core experience — the distance from this page to the live planet is one tap.",
    },
    {
      title: "A camera network ~18× larger",
      body: "74,229 live public feeds served against roughly 4,000 in the open-source mesh — including 118 cameras in Thailand alone and country directories across 109 countries.",
    },
    {
      title: "Recording, timelapse and alerts",
      body: "Pro records up to 20 cameras at once; VIP Pro raises that to 40 and adds timelapse plus camera alerts that check feeds on an interval and notify you on change.",
    },
    {
      title: "Intel layers for the analyst streak",
      body: "Pro unlocks the OSINT toolkit and satellite view; VIP Pro adds cyber, maritime and GDELT event layers with live news — the dashboard side of the god's-eye idea.",
    },
  ],
  chips: [
    { icon: Camera, label: "74,229 cameras", href: "/cameras" },
    { icon: Plane, label: "Live flights", href: "/live-flight-tracker" },
    { icon: Satellite, label: "Satellites", href: "/satellite-tracker" },
  ],
  tableHeading: "God's Eye View vs WorldEye, side by side",
  tableIntro:
    "Both products deserve a fair table. Figures are each project's own published numbers, checked October 2026.",
  rows: [
    { feature: "How you get it", competitor: "Download and install it yourself (Pinokio, Docker or clone)", worldEye: "Open worldeye.app in any browser — nothing to install" },
    { feature: "Price of the core", competitor: "Free and open source (MIT); premium layers bill your own API keys", worldEye: "Free with no signup; optional Pro from $7.99/week" },
    { feature: "Live cameras", competitor: "~4,000 public cameras (project's own figure)", worldEye: "74,229 live public cameras served" },
    { feature: "Flights & satellites", competitor: "Yes — live layers, keyless", worldEye: "Yes — live layers, free" },
    { feature: "Weather, quakes, fires", competitor: "Yes — GFS/ECMWF, radar, cyclone tracks, keyless", worldEye: "Yes — weather, radar, quakes and fires, free" },
    { feature: "Photorealistic 3D tiles", competitor: "Yes, with a Cesium ion token or your Google Maps key", worldEye: "3D globe with satellite view on Pro; no key needed" },
    { feature: "Voice AI agent", competitor: "Yes — 28 tools, on your OpenAI key", worldEye: "No voice agent; an on-screen AI assistant is part of the Pro toolkit" },
    { feature: "Recording & alerts", competitor: "Scene director for cinematic captures; no camera recording or alerts", worldEye: "Multi-camera recording (20 Pro / 40 VIP), timelapse and camera alerts on VIP Pro" },
    { feature: "Modify the code", competitor: "Yes — that's the point of it", worldEye: "No — hosted product" },
    { feature: "Works on your phone", competitor: "Not practically — it's a desktop install", worldEye: "Yes — the full globe in a mobile browser" },
  ],
  pricingHeading: "What each route actually costs",
  pricing: [
    <>
      God&apos;s Eye View the software costs nothing, forever — it is
      MIT-licensed. The honest asterisk is metered keys: photorealistic 3D
      tiles draw on a Cesium ion plan or your Google Maps billing, and the
      voice agent draws on your OpenAI balance. Light use can stay within
      free allowances; heavy use is pay-as-you-go on your own accounts, plus
      the electricity and attention of running it yourself.
    </>,
    <>
      WorldEye&apos;s core globe — cameras, flights, satellites, weather,
      quakes, fires, transit — is free with no signup and no keys. Paid tiers
      are for the monitoring toolkit:{" "}
      <span className="text-white/85 font-semibold">
        $7.99/week or $13.99/month
      </span>{" "}
      for Pro (each with a 10-day free trial), and{" "}
      <span className="text-white/85 font-semibold">
        VIP Pro at $74.99/year
      </span>{" "}
      (10-day trial) for timelapse, intel layers, camera alerts and 40-camera
      recording. Every first charge carries a 7-day money-back guarantee. Full
      detail lives on the{" "}
      <Link href="/pricing" className="text-[#0096FF] hover:underline">
        pricing page
      </Link>
      .
    </>,
  ],
  stepsHeading: "Switching over takes about thirty seconds",
  steps: [
    {
      title: "Open the globe",
      body: "Go to worldeye.app. No download, no installer, no account — the live planet loads in the browser, on desktop or phone.",
    },
    {
      title: "Turn on your layers",
      body: "Cameras, flights, satellites, weather, quakes and fires are all free layers on the same globe — toggle the set you used to watch in God's Eye View.",
    },
    {
      title: "Dive into cameras",
      body: "Search 74,229 feeds by place or browse the country and city directories. Your first camera opens are free, no signup asked.",
    },
    {
      title: "Keep the original too, if you tinker",
      body: "Nothing about switching is exclusive — plenty of people keep the open-source install for building and use WorldEye for watching. Both can be true.",
    },
  ],
  verdictHeading: "Which one should you use?",
  verdicts: [
    {
      q: "Just want to watch the world live?",
      a: "WorldEye. It's already running — free, no signup, no keys, on any device with a browser.",
    },
    {
      q: "Want to build on it or self-host?",
      a: "The original God's Eye View. MIT-licensed, modular, documented, and made to be extended with your own layers.",
    },
    {
      q: "Want the voice agent and sensor looks?",
      a: "God's Eye View, honestly — its 28-tool voice agent and FLIR-style modes have no hosted equivalent yet.",
    },
  ],
  faqHeading: "God's Eye View alternative questions, answered",
  faqs: [
    {
      q: "Is there a hosted version of God's Eye View?",
      a: "No official one — God's Eye View ships as software you install and run yourself, and its creators don't operate a hosted service. WorldEye is an independent hosted alternative built on the same live-globe concept: open worldeye.app and the globe is already running, with a much larger camera network (74,229 feeds vs roughly 4,000).",
    },
    {
      q: "Is God's Eye View free?",
      a: "The code is free and open source (MIT), and the base globe starts with no keys at all. The full experience isn't entirely free in practice: photorealistic 3D tiles use a Cesium ion token or your own Google Maps API key (metered by Google), and the voice agent uses your OpenAI key. WorldEye's core globe is free with no keys at all.",
    },
    {
      q: "Can I use God's Eye View online without downloading it?",
      a: "Not the original — it's a desktop install (Pinokio one-click, Docker, or a manual clone). If you want the same kind of live globe in a browser tab, including on your phone, a hosted alternative like WorldEye is the route.",
    },
    {
      q: "Which has more cameras, God's Eye View or WorldEye?",
      a: "WorldEye, by a wide margin: 74,229 live public cameras served, versus roughly 4,000 in God's Eye View's CCTV mesh (the figure in its own README). Both draw on public feeds — WorldEye's directory is simply much larger, spanning 109 countries.",
    },
    {
      q: "Does WorldEye have the voice agent?",
      a: "No. God's Eye View's 28-tool voice agent — flying the globe and querying layers by speech, on your OpenAI key — is genuinely unique to it. WorldEye's Pro tier includes an on-screen AI assistant within its OSINT toolkit, but it doesn't pretend to be the same thing.",
    },
    {
      q: "Is WorldEye affiliated with God's Eye View?",
      a: "No. WorldEye is a separate product from a separate team with no affiliation with Bilawal Sidhu or the God's Eye View project. The pages compare the two because they answer the same desire — seeing the whole live planet on one screen — in different ways.",
    },
    {
      q: "God's Eye View vs WorldEye for watching a specific place?",
      a: "For watching, WorldEye usually wins on friction and cameras: search a city, open a live feed in seconds, on your phone. For studying a place with custom layers, drawn annotations and cockpit flyovers, the open-source project's workbench is richer.",
    },
  ],
  midCta: {
    heading: "The view, without the setup",
    body: "WorldEye's globe is live right now — 74,229 cameras, flights, satellites and weather on one screen. Open it and decide in thirty seconds.",
  },
  ctaHeading: (
    <>
      Skip the setup. <span className="text-[#0096FF]">See the planet.</span>
    </>
  ),
  ctaBody: "One click, no signup, no API keys. The globe is already spinning.",
  related: [
    {
      label: "God's eye view of Earth, live",
      desc: "The concept explained — and the live globe that delivers it, free in your browser.",
      href: "/gods-eye-view",
    },
    {
      label: "GodsView AI alternatives",
      desc: "Another hosted take on the god's-eye globe — and how it compares.",
      href: "/alternatives/godsview-ai",
    },
    {
      label: "Best interactive 3D globes",
      desc: "The full ranked guide to spinning the planet in 2026.",
      href: "/best-interactive-3d-globes",
    },
    {
      label: "Pricing",
      desc: "Weekly $7.99, monthly $13.99, VIP Pro $74.99/yr — the core globe stays free.",
      href: "/pricing",
    },
  ],
};

export const metadata = altMetadata(data);

export default function Page() {
  return <AlternativePage data={data} />;
}
