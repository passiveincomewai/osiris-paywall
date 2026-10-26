import Link from "next/link";
import { Camera, Eye, Globe, MonitorSmartphone, Satellite, Search } from "lucide-react";
import AlternativePage, {
  altMetadata,
  type AltData,
} from "@/components/AlternativePage";

const data: AltData = {
  name: "GodsView AI",
  path: "/alternatives/godsview-ai",
  title: "GodsView AI Alternative — The Hosted Globe That Publishes Its Numbers",
  description:
    "GodsView AI is a hosted live map with unpublished Premium pricing and no published camera count. WorldEye is the alternative: a hosted 3D globe with 74,229 cameras and public prices. Free, no signup.",
  ogTitle: "GodsView AI Alternative — 74,229 Cameras, Published Pricing | WorldEye",
  ogDescription:
    "Compare GodsView AI vs WorldEye: two hosted live globes — one with watchlists and kiosk mode, one with a 74,229-camera network, an OSINT toolkit and prices on the page.",
  kicker: "GODSVIEW AI ALTERNATIVES",
  heroIcon: Eye,
  heroTitle: (
    <>
      A GodsView AI alternative that{" "}
      <span className="text-[#0096FF]">publishes its numbers.</span>
    </>
  ),
  heroLede: (
    <>
      GodsView AI is a perfectly reasonable hosted live map — and the closest
      thing to a direct WorldEye rival there is. Both open free in a browser,
      both draw flights, ships, quakes and fires on a globe. The differences
      are in what each one shows you up front: GodsView AI doesn&apos;t publish
      its Premium prices or the size of its camera network. WorldEye publishes
      both — 74,229 cameras, and every price on the pricing page. Here is the
      honest comparison.
    </>
  ),
  updatedNote:
    "Facts checked October 20, 2026 against godsviewai.com (its map, Premium tier description and search) and WorldEye's live pricing page. GodsView AI does not publish Premium prices or a camera count on its site, so this page quotes neither.",
  aboutIcon: MonitorSmartphone,
  aboutHeading: "What GodsView AI is — and who it's for",
  about: [
    <>
      GodsView AI (godsviewai.com) is a commercial hosted live map with a
      clear pitch: people search for &ldquo;God&apos;s Eye View online,&rdquo;
      the original God&apos;s Eye View is an open-source GitHub project you
      have to install, so GodsView AI offers the experience as a website
      instead. It is{" "}
      <span className="text-white/85 font-semibold">
        not the official God&apos;s Eye View
      </span>{" "}
      and isn&apos;t run by that project&apos;s creators — it&apos;s a
      separate product riding the same search intent, which it more or less
      says itself.
    </>,
    <>
      What you get is a mission-control style map: live ADS-B flights, AIS
      ships, USGS earthquakes and NASA FIRMS fire detections, presented as a{" "}
      <span className="text-white/85 font-semibold">
        2D operations map alongside a 3D globe view
      </span>
      . A unified search box covers flight callsigns, ship MMSIs, cameras and
      cities, so you can jump straight to an object of interest. The map opens
      free with no account. A Premium tier adds watchlists, a kiosk mode for
      always-on displays, and heavier operations layers — at prices its
      landing page doesn&apos;t state.
    </>,
    <>
      Who is it for? Watchers who like the operations-desk aesthetic — dense
      2D panels over a flat map, the globe as a secondary view — and people
      who want a live map running on a wall display. If that&apos;s you, its
      kiosk mode is a genuinely considered feature. This page is for everyone
      weighing the two hosted globes on cameras, tooling and what they&apos;ll
      actually pay.
    </>,
  ],
  strengths: [
    {
      title: "Hosted and instant, like a rival should be",
      body: "No install, no account, no API keys — the map just opens. It understood the assignment the open-source original couldn't: be a website.",
    },
    {
      title: "An operations-desk layout",
      body: "The 2D ops map with the globe as a view suits people who think in panels and lists rather than a spinning planet — a legitimate design preference.",
    },
    {
      title: "Kiosk mode for wall displays",
      body: "Premium's kiosk mode is built for always-on screens in offices and ops rooms. WorldEye doesn't offer an equivalent — credit where due.",
    },
    {
      title: "One search box for every object",
      body: "Callsigns, MMSIs, cameras and cities in a single search makes jumping to a specific flight or ship fast.",
    },
  ],
  gapsIcon: Search,
  gapsHeading: "Where GodsView AI keeps you guessing",
  gaps: [
    <>
      Start with the money. GodsView AI&apos;s Premium tier is real — watchlists,
      kiosk mode, heavier ops layers — but its prices aren&apos;t published on
      its site, so you can&apos;t comparison-shop the subscription before you
      commit to the funnel. WorldEye&apos;s equivalent tiers are printed on a
      public pricing page with trial lengths and a money-back guarantee
      attached. For a product category built on trust, that asymmetry matters
      more than any single feature.
    </>,
    <>
      Then the cameras. GodsView AI includes cameras in its search, but it{" "}
      <span className="text-white/85 font-semibold">
        doesn&apos;t publish how many it has
      </span>
      , and they aren&apos;t presented as a browsable network — there&apos;s
      no country-and-city camera directory to wander. WorldEye&apos;s
      centrepiece is exactly that: 74,229 live public feeds, counted,
      published, and organised into country and city pages. If cameras are
      why you came to a live globe at all, one of these products is built
      around them and the other treats them as a search category.
    </>,
    <>
      Finally, depth of tooling. GodsView AI&apos;s Premium adds more of the
      same map — watchlists, kiosk, heavier layers. WorldEye&apos;s paid
      tiers add different instruments: an OSINT toolkit and AI analyst on
      Pro, cyber and maritime intel feeds and live news on VIP Pro,
      multi-camera recording, camera alerts. Neither is &ldquo;more
      advanced&rdquo; in the abstract — but they are different bets about
      what a live map is for, and only one of them tells you the price of
      the bet up front.
    </>,
  ],
  worldEyeHeading: "WorldEye: the same idea, cameras first, prices public",
  worldEye: [
    <>
      WorldEye is a hosted 3D globe — open{" "}
      <Link href="/" className="text-[#0096FF] hover:underline">
        worldeye.app
      </Link>{" "}
      and it&apos;s live, free, no signup — carrying the same live object
      layers GodsView AI does (flights, ships, earthquakes, fires) plus
      tracked satellites, weather and radar, live transit and wildfire
      perimeters. Its centrepiece is the{" "}
      <span className="text-white/85 font-semibold">
        74,229-camera network
      </span>
      : public feeds from 109 countries, browsable in a{" "}
      <Link href="/cameras" className="text-[#0096FF] hover:underline">
        country and city directory
      </Link>{" "}
      as well as on the globe itself.
    </>,
    <>
      The trade, honestly stated: WorldEye has no kiosk mode and no 2D
      operations-desk layout — it is globe-first, and if your ideal live map
      is a wall of panels, GodsView AI&apos;s shape may suit you better. What
      WorldEye offers instead is depth you can price before you pay: the
      tiers below are the actual tiers, printed in full.
    </>,
  ],
  worldEyePoints: [
    {
      title: "A camera network you can count — and browse",
      body: "74,229 live feeds with a published count and a country/city directory, not a search box over an unknown pool.",
    },
    {
      title: "Published pricing, with trials",
      body: "Weekly $7.99 and monthly $13.99 (10-day trials), VIP Pro $74.99/year (10-day trial), 7-day money-back on first charges — all on the public pricing page.",
    },
    {
      title: "Pro tooling beyond the map",
      body: "Pro adds an OSINT toolkit, satellite map view, traffic and multi-camera recording (20 cams); VIP Pro adds intel layers, timelapse and camera alerts (40 cams).",
    },
    {
      title: "Everything on one globe, free",
      body: "Flights, ships, satellites, weather, quakes, fires and transit share one 3D view on the free tier — no account, no ads.",
    },
  ],
  chips: [
    { icon: Camera, label: "Browse 74,229 cameras", href: "/cameras" },
    { icon: Globe, label: "Open the live globe", href: "/" },
    { icon: Satellite, label: "Satellite tracker", href: "/satellite-tracker" },
  ],
  tableHeading: "GodsView AI vs WorldEye, side by side",
  tableIntro:
    "Two hosted globes with the same starting line. The rows that differ — cameras, tooling, pricing transparency, kiosk mode — are the ones to choose on.",
  rows: [
    { feature: "Runs where", competitor: "Hosted website", worldEye: "Hosted website" },
    { feature: "Map style", competitor: "2D operations map + 3D globe view", worldEye: "3D globe-first, with satellite map view on Pro" },
    { feature: "Public cameras", competitor: "Camera search layer; count not published", worldEye: "74,229 feeds, browsable country/city directory" },
    { feature: "Flights, ships, quakes, fires", competitor: "Live, free", worldEye: "Live, free — plus satellites, weather, transit" },
    { feature: "Premium focus", competitor: "Watchlists, kiosk mode, heavier ops layers", worldEye: "OSINT toolkit + AI analyst (Pro); intel layers, timelapse, camera alerts (VIP Pro)" },
    { feature: "Kiosk / wall-display mode", competitor: "Yes, on Premium", worldEye: "No" },
    { feature: "Pricing", competitor: "Free map; Premium prices not published", worldEye: "Free; $7.99/wk, $13.99/mo, $74.99/yr — published" },
    { feature: "Free trials", competitor: "Not stated (no published pricing)", worldEye: "10-day weekly/monthly, 10-day VIP Pro" },
    { feature: "Account needed", competitor: "No — map opens free", worldEye: "No — map opens free" },
    { feature: "Ads on the free map", competitor: "Not stated on its site", worldEye: "No ads" },
  ],
  pricingHeading: "Pricing: one of these pages has some",
  pricing: [
    <>
      GodsView AI&apos;s map is free to open. Its Premium tier — watchlists,
      kiosk mode, heavier operations layers — is described on its site
      without prices, so the only way to learn what it costs is to go through
      its own checkout flow. That may be fine; it just isn&apos;t
      comparison-shopping.
    </>,
    <>
      WorldEye prints everything. The globe, cameras, flights, satellites,
      weather, quakes and fires are{" "}
      <span className="text-white/85 font-semibold">free with no signup</span>.{" "}
      <span className="text-white/85 font-semibold">
        Pro is $7.99/week or $13.99/month
      </span>{" "}
      (10-day trials) for the OSINT toolkit, satellite view, traffic and
      recording;{" "}
      <span className="text-white/85 font-semibold">
        VIP Pro is $74.99/year
      </span>{" "}
      (10-day trial) for intel layers, timelapse and camera alerts. First
      charges carry a 7-day money-back guarantee — the full grid is on the{" "}
      <Link href="/pricing" className="text-[#0096FF] hover:underline">
        pricing page
      </Link>
      .
    </>,
  ],
  stepsHeading: "Trying the alternative takes a minute",
  steps: [
    {
      title: "Open both globes",
      body: "GodsView AI in one tab, worldeye.app in another. Both are free and live right now — no accounts on either side.",
    },
    {
      title: "Search the same city",
      body: "Pick a place you care about and compare what each shows you: the object layers, then the cameras. Notice which one lets you browse the camera network by country and city.",
    },
    {
      title: "Price the premium tiers",
      body: "Read WorldEye's pricing page end to end. Then try to find GodsView AI's Premium price without starting a checkout. That difference is the point of this page.",
    },
    {
      title: "Keep GodsView for the wall",
      body: "If a kiosk display is your endgame, GodsView AI Premium has the mode for it. Switching isn't exclusive — the free maps coexist fine.",
    },
  ],
  verdictHeading: "Which hosted globe should you use?",
  verdicts: [
    {
      q: "Running a wall display or ops desk?",
      a: "GodsView AI. Kiosk mode and the 2D operations layout are built for exactly that, and WorldEye doesn't match them.",
    },
    {
      q: "Here for the cameras?",
      a: "WorldEye. A counted, browsable 74,229-feed network is the product's centrepiece, not a search category.",
    },
    {
      q: "Want to know the price first?",
      a: "WorldEye. Every tier, trial and guarantee is on a public page before you spend anything.",
    },
  ],
  faqHeading: "GodsView AI alternative questions, answered",
  faqs: [
    {
      q: "Is GodsView AI the official God's Eye View?",
      a: "No. God's Eye View is the open-source project by Bilawal Sidhu and Sameh Khamis, distributed on GitHub — you install and run it yourself. GodsView AI is a separate commercial website hosting a similar live map. WorldEye is independent of both.",
    },
    {
      q: "Is GodsView AI free?",
      a: "Its map opens free with no account. Watchlists, kiosk mode and heavier operations layers sit behind a Premium tier. WorldEye's map is also free with no account, and stays ad-free.",
    },
    {
      q: "How much does GodsView AI Premium cost?",
      a: "GodsView AI doesn't publish Premium prices on its site, so we won't guess. WorldEye's paid tiers are public: Pro at $7.99/week or $13.99/month, VIP Pro at $74.99/year, with free trials and a 7-day money-back guarantee on first charges.",
    },
    {
      q: "Which has more cameras, GodsView AI or WorldEye?",
      a: "WorldEye publishes its count: 74,229 live public feeds, browsable by country and city. GodsView AI includes cameras in its search but doesn't publish a network size, so no honest comparison number exists — be wary of any page that invents one.",
    },
    {
      q: "What is the best GodsView AI alternative?",
      a: "For a hosted globe with a browsable camera network, published pricing and Pro OSINT tooling, WorldEye is the direct alternative. If you want the original project itself — sensor visual modes, voice agent, your own machine — that's the open-source God's Eye View. For weather-first viewing, Zoom Earth and Windy are the specialists.",
    },
    {
      q: "Does either site need an API key?",
      a: "No — that's the point of the hosted products. Both WorldEye and GodsView AI run on their own keys. The open-source God's Eye View starts keyless, but its photorealistic 3D tiles need a Cesium ion token or a Google Maps key, and its voice agent needs an OpenAI key.",
    },
    {
      q: "Does WorldEye have a kiosk mode like GodsView AI?",
      a: "No. GodsView AI's Premium kiosk mode for always-on displays is a genuine feature WorldEye doesn't offer. WorldEye's paid tiers go a different direction: OSINT tooling, intel feeds, recording and camera alerts for active monitoring rather than wall displays.",
    },
  ],
  midCta: {
    heading: "Same live planet. Counted cameras, printed prices.",
    body: "WorldEye's globe is spinning right now — 74,229 cameras, flights, satellites and storms, free with no signup. Open it next to GodsView AI and compare like for like.",
  },
  ctaHeading: (
    <>
      The hosted globe with <span className="text-[#0096FF]">the receipts.</span>
    </>
  ),
  ctaBody: "74,229 cameras, published pricing, one free 3D globe. No signup, no API keys.",
  related: [
    {
      label: "God's Eye View alternatives",
      desc: "The original viral globe: hosted vs self-hosted, compared the same way.",
      href: "/alternatives/gods-eye-view",
    },
    {
      label: "Experience God's Eye View — hosted",
      desc: "The live-Earth experience page: what's on the globe and how to explore it.",
      href: "/gods-eye-view",
    },
    {
      label: "OSIRIS alternatives",
      desc: "The open-source OSINT dashboard WorldEye descends from, compared honestly.",
      href: "/alternatives/osiris",
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
