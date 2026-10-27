import Link from "next/link";
import { Camera, Code2, GitBranch, Plane, Satellite } from "lucide-react";
import AlternativePage, {
  altMetadata,
  type AltData,
} from "@/components/AlternativePage";

const data: AltData = {
  name: "OSIRIS",
  path: "/alternatives/osiris",
  title: "OSIRIS Alternative — The Hosted Globe That Grew From It",
  description:
    "OSIRIS is a self-hosted open-source OSINT dashboard. WorldEye — whose codebase descends from OSIRIS — is the hosted alternative: the same spirit, 74,229 cameras and live layers, running in your browser with no deployment.",
  ogTitle: "OSIRIS Alternative — Hosted, No Self-Hosting Required | WorldEye",
  ogDescription:
    "WorldEye's codebase descends from the open-source OSIRIS project. This is the honest comparison: self-hosted OSINT workbench vs hosted live globe — layers, cameras, pricing and who each is for.",
  kicker: "OSIRIS ALTERNATIVES",
  heroIcon: Code2,
  heroTitle: (
    <>
      Love OSIRIS, <span className="text-[#0096FF]">tired of hosting it?</span>
    </>
  ),
  heroLede: (
    <>
      Full disclosure, up front, because this page is different from the
      others:{" "}
      <span className="text-white/85 font-semibold">
        WorldEye&apos;s codebase descends from OSIRIS
      </span>{" "}
      — the open-source intelligence dashboard by simplifaisoul, forked under
      its MIT licence with its copyright notice retained. So this is not a
      rival&apos;s takedown. It is the same lineage answering two different
      needs: OSIRIS the self-hosted analyst workbench, and WorldEye the
      hosted live globe that anyone can open. Here is the honest comparison
      between parent and offspring.
    </>
  ),
  updatedNote:
    "Facts checked October 20, 2026 against the OSIRIS repository (github.com/simplifaisoul/osiris) and WorldEye's live site. The fork relationship is stated on this page because it is true.",
  aboutIcon: GitBranch,
  aboutHeading: "What OSIRIS is",
  about: [
    <>
      OSIRIS — the Open Source Intelligence &amp; Reconnaissance Integrated
      System — is an open-source OSINT dashboard created by simplifaisoul
      (Souleimen Mrad) and released under the MIT licence. It assembles the
      public world onto one map: 15+ data layers including live CCTV cameras
      (its README cites 17,000+), OpenSky aviation, USGS earthquakes, NASA
      FIRMS fire detections, EONET natural events and N2YO satellite data.
      Around the map sits a working analyst&apos;s toolkit: port scanning,
      DNS and WHOIS lookups, SSL inspection, vulnerability scanning, crypto
      wallet tracing, sanctions search and Telegram OSINT — plus an AI
      assistant that runs on your own API key.
    </>,
    <>
      The catch — or the point, depending on who you are — is that OSIRIS is
      software you run. You deploy it yourself (Docker or Node), wire up the
      keys and feeds, and maintain the instance. Some of its layers are
      reference data rather than live feeds: its maritime picture is built
      around 39 ports and 10 chokepoints, and its conflict picture around 13
      defined zones. A hosted demo instance circulates, but the project&apos;s
      real home is your own server.
    </>,
    <>
      Who is it for? Analysts and developers who want the tooling itself —
      the recon utilities, the code, the control — and who are comfortable
      operating what they run. It is a workbench, and a good one; WorldEye
      exists precisely because its foundations were worth building a product
      on.
    </>,
  ],
  strengths: [
    {
      title: "A real recon toolkit, not just a map",
      body: "Port scans, DNS/WHOIS, SSL checks, vuln scanning, wallet tracing and sanctions search — OSIRIS does active OSINT work most globes never attempt.",
    },
    {
      title: "Open source, self-hosted, yours",
      body: "MIT-licensed and deployable on your own infrastructure: your data, your keys, your uptime, no subscription and no landlord.",
    },
    {
      title: "Broad public-data layers",
      body: "Cameras, aviation, satellites, quakes, fires and natural events from USGS, NASA and N2YO feeds — a serious open-data assembly.",
    },
    {
      title: "Bring-your-own-key AI",
      body: "Its assistant runs against your own API key, so the analyst keeps control of the model, the spend and the data path.",
    },
  ],
  gapsIcon: GitBranch,
  gapsHeading: "Why OSIRIS users look for a hosted alternative",
  gaps: [
    <>
      The first reason is operational: somebody has to run it. Self-hosting
      means deployment, keys, feed maintenance, updates and uptime — fine for
      a developer&apos;s side project, friction for everyone who simply wants
      to <em>watch</em>. When the instance is down, or a feed changes shape,
      the monitoring stops until the maintainer (you) fixes it.
    </>,
    <>
      The second reason is depth in the layers people stare at most. OSIRIS&apos;s
      camera count — 17,000+ by its README — was remarkable for an
      open-source project, but a hosted network that does nothing but cameras
      all day serves several times more. Its maritime and conflict layers, as
      noted, are curated reference sets rather than live global feeds. And as
      a desktop-first dashboard, it is not something you glance at on a phone.
    </>,
    <>
      The third reason is product shape: recording, alerts, timelapse,
      subscriptions that simply work. The things that make a monitoring tool
      a daily habit — &ldquo;watch these twenty cameras and tell me when the
      road gets snow&rdquo; — are features a hosted product builds because its
      users pay for outcomes, not for code.
    </>,
  ],
  worldEyeHeading: "WorldEye: the descendant, hosted",
  worldEye: [
    <>
      WorldEye began as a fork of OSIRIS — the code lineage is real, the MIT
      copyright notice is retained, and this page says so because the
      project&apos;s author deserves the credit and readers deserve the fact.
      What WorldEye changed is everything around the code: it became a hosted
      product at worldeye.app, free to open with no signup, carrying{" "}
      <span className="text-white/85 font-semibold">
        74,229 live cameras
      </span>
      , live flights and satellites, weather, quakes, fires, radar and
      transit on a 3D globe — maintained, updated and kept alive by a team
      whose only job is that it works when you open it.
    </>,
    <>
      What WorldEye deliberately did <em>not</em> carry over is the active
      recon toolkit — no port scans, no vulnerability probing; the product is
      a watching globe, not an attack-surface tool. In exchange it added the
      monitoring layer: multi-camera recording (20 on Pro, 40 on VIP Pro),
      timelapse, and camera alerts that check a feed for a condition you
      describe and notify you when it changes. Same spirit, different species:
      OSIRIS is the workshop; WorldEye is the window.
    </>,
  ],
  worldEyePoints: [
    {
      title: "Nothing to deploy or maintain",
      body: "The globe is live at worldeye.app on any device. Updates, feeds and uptime are the product team's problem, not yours.",
    },
    {
      title: "A camera network 4× the README figure",
      body: "74,229 live public feeds served and searchable by country and city, against the 17,000+ cameras OSIRIS's README cites.",
    },
    {
      title: "Live layers where OSIRIS has reference data",
      body: "Maritime, conflicts and events are live global layers on WorldEye; OSIRIS's equivalents are curated port/chokepoint and zone reference sets.",
    },
    {
      title: "Recording, timelapse and alerts built in",
      body: "Pro records 20 cameras at once; VIP Pro records 40, adds timelapse and plain-language camera alerts with photo notifications.",
    },
  ],
  chips: [
    { icon: Camera, label: "74,229 cameras", href: "/cameras" },
    { icon: Plane, label: "Live flights", href: "/live-flight-tracker" },
    { icon: Satellite, label: "Satellites", href: "/satellite-tracker" },
  ],
  tableHeading: "OSIRIS vs WorldEye, side by side",
  tableIntro:
    "Parent project and hosted descendant, compared without embarrassment in either direction.",
  rows: [
    { feature: "How you get it", competitor: "Self-host it (Docker/Node); a demo instance circulates", worldEye: "Open worldeye.app — hosted, nothing to run" },
    { feature: "Price", competitor: "Free and open source (MIT); you pay for hosting and keys", worldEye: "Free tier, no signup; Pro from $7.99/week" },
    { feature: "Live cameras", competitor: "17,000+ (its README)", worldEye: "74,229 served" },
    { feature: "Flights & satellites", competitor: "OpenSky aviation, N2YO satellites", worldEye: "Live flights and satellite tracking, free" },
    { feature: "Maritime & conflict", competitor: "Reference data — 39 ports/10 chokepoints, 13 conflict zones", worldEye: "Live global layers; GDELT events on VIP Pro" },
    { feature: "Active recon toolkit", competitor: "Yes — port scan, DNS, WHOIS, SSL, vuln scan, wallet tracing", worldEye: "No active scanning; OSINT toolkit is viewing/analysis-side" },
    { feature: "Recording & alerts", competitor: "Not a feature of the project", worldEye: "Multi-cam recording, timelapse, camera alerts" },
    { feature: "AI assistant", competitor: "Yes, on your own API key", worldEye: "Built into the Pro toolkit; no key to bring" },
    { feature: "Code access", competitor: "Full source, forkable", worldEye: "Hosted product; no source" },
    { feature: "Maintenance", competitor: "Yours", worldEye: "The WorldEye team's" },
  ],
  pricingHeading: "Pricing: free code, or a free tier",
  pricing: [
    <>
      OSIRIS costs nothing to download and use under MIT — your costs are the
      invisible ones: a server or a machine left running, your own API keys
      (its AI assistant bills yours), and your time keeping feeds and the
      instance healthy. For a developer that trade is often the whole appeal.
    </>,
    <>
      WorldEye&apos;s globe and its core layers are free with no signup; the
      optional tiers are{" "}
      <span className="text-white/85 font-semibold">
        Pro at $7.99/week or $13.99/month
      </span>{" "}
      (3-day trial on Weekly, 10 days on Monthly) and{" "}
      <span className="text-white/85 font-semibold">
        VIP Pro at $74.99/year
      </span>{" "}
      (10-day trial), each first charge covered by a 7-day money-back
      guarantee. The dedicated head-to-head is at{" "}
      <Link href="/compare/worldeye-vs-osiris" className="text-[#0096FF] hover:underline">
        WorldEye vs OSIRIS
      </Link>
      , and full pricing at{" "}
      <Link href="/pricing" className="text-[#0096FF] hover:underline">
        /pricing
      </Link>
      .
    </>,
  ],
  stepsHeading: "Moving from self-hosted to hosted",
  steps: [
    {
      title: "Open the globe",
      body: "worldeye.app in any browser — the layers you ran in OSIRIS (cameras, flights, quakes, fires, satellites) are live immediately, no deployment.",
    },
    {
      title: "Rebuild your watchlist",
      body: "Find your cameras among 74,229 feeds by country or city, and set the globe to the layers you actually used.",
    },
    {
      title: "Add the product layer",
      body: "If you outgrew the dashboard, Pro/VIP add recording, timelapse, alerts and intel layers the project doesn't ship.",
    },
    {
      title: "Keep OSIRIS for the toolkit",
      body: "Nothing is exclusive: the recon utilities remain a reason to keep your instance. Many switchers run WorldEye for watching and OSIRIS for work.",
    },
  ],
  verdictHeading: "Which one should you use?",
  verdicts: [
    {
      q: "Want the toolkit and the code?",
      a: "OSIRIS. Self-host it, extend it, run your own keys — it's an excellent workbench and it's free.",
    },
    {
      q: "Want to watch, on any device, tonight?",
      a: "WorldEye. No deployment, a bigger camera network, live layers and a team keeping it up.",
    },
    {
      q: "Curious about the lineage?",
      a: "Read both. WorldEye descends from OSIRIS under MIT; this page exists because we think that's a credit, not a secret.",
    },
  ],
  faqHeading: "OSIRIS alternative questions, answered",
  faqs: [
    {
      q: "Is WorldEye based on OSIRIS?",
      a: "Yes. WorldEye's codebase descends from the open-source OSIRIS project by simplifaisoul, forked under its MIT licence with the copyright notice retained. WorldEye then became a hosted, commercially maintained product with a much larger camera network and a monitoring feature set (recording, alerts, timelapse).",
    },
    {
      q: "Is OSIRIS free?",
      a: "Yes — OSIRIS is free and open source under the MIT licence. Your real costs are operational: hosting or a machine to run it, your own API keys for some features (its AI assistant uses yours), and your time maintaining the instance.",
    },
    {
      q: "Does OSIRIS have a hosted version?",
      a: "A demo instance circulates (osirisai.live), but OSIRIS is fundamentally a self-host project — you deploy and maintain it. WorldEye is the hosted descendant: same spirit, running at worldeye.app with nothing to install.",
    },
    {
      q: "OSIRIS vs WorldEye — which has more cameras?",
      a: "WorldEye: 74,229 live public cameras served. OSIRIS's README cites 17,000+ cameras, which was a remarkable figure for an open-source project; WorldEye's hosted catalogue has grown well past it.",
    },
    {
      q: "Does WorldEye have OSIRIS's recon tools?",
      a: "No. OSIRIS ships active OSINT utilities — port scanning, DNS/WHOIS, SSL and vulnerability checks, crypto wallet tracing, sanctions search. WorldEye's Pro OSINT toolkit is analysis- and viewing-side; it does not perform active scanning. Keep OSIRIS if that toolkit is your work.",
    },
    {
      q: "What is the best OSIRIS alternative?",
      a: "For a hosted globe, WorldEye — fittingly, since it descends from OSIRIS. For other self-hosted dashboards, God's Eye View and World Monitor are the names in this space. The right answer depends on whether you want to run software or open a website.",
    },
  ],
  midCta: {
    heading: "The descendant is live right now",
    body: "Same open-data spirit, no server to babysit: 74,229 cameras, flights, satellites and storms on one hosted globe. Open it and compare for yourself.",
  },
  ctaHeading: (
    <>
      From workbench to window. <span className="text-[#0096FF]">It&apos;s live.</span>
    </>
  ),
  ctaBody: "The hosted globe that grew out of OSIRIS — free, no signup, no deployment.",
  related: [
    {
      label: "WorldEye vs OSIRIS, head to head",
      desc: "The dedicated comparison of parent project and hosted descendant.",
      href: "/compare/worldeye-vs-osiris",
    },
    {
      label: "God's Eye View alternatives",
      desc: "The other great open-source globe — and the hosted route to the same view.",
      href: "/alternatives/gods-eye-view",
    },
    {
      label: "World Monitor alternatives",
      desc: "Another open-source dashboard, compared fairly.",
      href: "/alternatives/world-monitor",
    },
    {
      label: "Best global intelligence dashboards",
      desc: "The ranked field of world-watching dashboards.",
      href: "/best-global-intelligence-dashboards",
    },
  ],
};

export const metadata = altMetadata(data);

export default function Page() {
  return <AlternativePage data={data} />;
}
