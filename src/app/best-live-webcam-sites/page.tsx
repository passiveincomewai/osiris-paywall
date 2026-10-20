import type { Metadata } from "next";
import Link from "next/link";
import {
  Camera,
  Globe,
  Video,
  Eye,
  Wind,
  MapPin,
  MonitorSmartphone,
} from "lucide-react";
import {
  IntentShell,
  IntentBreadcrumbs,
  ReviewedStamp,
  HeroCtas,
  MidCta,
  webPageLd,
  itemListLd,
} from "@/components/SeoIntentLayout";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "7 Best Live Webcam Sites for 2026 (Ranked)",
  description:
    "The best live webcam sites for 2026 compared: WorldEye's free 3D globe, EarthCam, SkylineWebcams, Explore.org, Windy webcams and more.",
  alternates: { canonical: "/best-live-webcam-sites" },
  openGraph: {
    title: "7 Best Live Webcam Sites for 2026 (Ranked) | WorldEye",
    description:
      "Compare the best live webcam sites for 2026 — WorldEye's free 3D globe, EarthCam, SkylineWebcams, Explore.org and more.",
    url: "/best-live-webcam-sites",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "7 Best Live Webcam Sites for 2026 (Ranked) | WorldEye",
    description:
      "The best live webcam sites for 2026 compared — free picks ranked by best-fit.",
  },
};

const TOOLS = [
  {
    icon: Globe,
    name: "WorldEye",
    tag: "Best free all-in-one pick",
    href: "/compare/earthcam",
    body: "Roughly 74,229 public cameras on a free 3D globe — no signup — with the planet attached: live flights, satellites, weather systems, earthquakes and wildfires on the same screen. The pick for exploring cameras where they actually are, instead of picking them from a list. The camera layer is free; Pro adds analyst tools, not more cameras.",
  },
  {
    icon: Video,
    name: "EarthCam",
    tag: "Best for famous landmark cams",
    href: "/compare/earthcam",
    body: "The best-known webcam network: famous landmark and city cameras, plus construction cameras used professionally. Earned its reputation over decades. A polished destination directory — strongest when you already know the famous view you want.",
  },
  {
    icon: Camera,
    name: "SkylineWebcams",
    tag: "Best scenic directory",
    href: "/compare/skylinewebcams",
    body: "A big scenic webcam directory organized by destination and category — beaches, cities, landscapes and landmarks — free with ads. Easy category browsing for trip dreaming and pre-trip view checks; a directory, not a live data platform.",
  },
  {
    icon: Eye,
    name: "Explore.org",
    tag: "Best for wildlife and nature",
    href: "/compare/explore-org",
    body: "A nonprofit live-camera network focused on wildlife and nature — sanctuaries, nests, watering holes and wild landscapes, run with an educational mission. The clear specialist winner for animal watching; not a general city or travel directory.",
  },
  {
    icon: Wind,
    name: "Windy webcams",
    tag: "Best for webcams with weather",
    href: "/compare/windy",
    body: "Windy's webcam layer sits alongside its forecast-model maps, so the camera view and the predicted sky live in the same place. Genuinely useful for checking conditions before you go — a weather platform first, cameras second.",
  },
  {
    icon: MapPin,
    name: "WebcamTaxi",
    tag: "Best simple directory",
    href: "/live-webcams",
    body: "A straightforward directory of live webcams around the world, organized by place and category. No learning curve and no extras — the pick if you simply want to find a camera in a location and watch it.",
  },
  {
    icon: MonitorSmartphone,
    name: "YouTube live webcams",
    tag: "Best for long-running streams",
    href: "/live-webcams",
    body: "Thousands of always-on live streams hosted on YouTube — beaches, cities, wildlife, aquariums and landmarks. Huge, free and familiar, but scattered: search is the only directory, and quality varies stream by stream.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    webPageLd(
      "7 Best Live Webcam Sites for 2026 (Ranked)",
      "The best live webcam sites for 2026 compared: WorldEye's free 3D globe, EarthCam, SkylineWebcams, Explore.org, Windy webcams and more.",
      "/best-live-webcam-sites"
    ),
    itemListLd(
      TOOLS.map((t) => ({
        name: t.name,
        href: t.href,
        description: `${t.tag}. ${t.body}`,
      }))
    ),
  ],
};

export default function BestLiveWebcamSitesPage() {
  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Best tools", href: "/compare" },
          { label: "Best Live Webcam Sites" },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <Camera className="w-3.5 h-3.5" /> RANKED GUIDE
        </p>
        <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
          The best live webcam sites <span className="text-[#0096FF]">for 2026.</span>
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          Seven webcam platforms compared on what actually differs between
          them — discovery, categories, context, and price. WorldEye is our
          pick for free exploring on a 3D globe; EarthCam remains the
          landmark specialist; Explore.org wins on wildlife. Here&apos;s how
          to choose.
        </p>
        <ReviewedStamp />
        <HeroCtas />
      </div>

      {/* What differs */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">What actually differs between webcam sites?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Most webcam sites aggregate publicly accessible cameras rather
            than owning them, so catalogs overlap more than marketing
            suggests. What differs: <strong className="text-white/85">how you
            discover cameras</strong> (category lists, search, or a map),{" "}
            <strong className="text-white/85">specialization</strong> (scenic,
            wildlife, landmarks, weather), <strong className="text-white/85">context</strong>{" "}
            (what else you can see about the place), and{" "}
            <strong className="text-white/85">friction</strong> — ads, signups
            and paywalls between you and the feed.
          </p>
          <p>
            Rank accordingly: pick the site whose discovery style matches how
            you watch. The list below is organized by genuine best-fit, not by
            who has the longest category menu.
          </p>
        </div>
      </section>

      {/* Ranked list */}
      <section className="mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Seven webcam sites, <span className="text-[#0096FF]">ranked by best-fit</span>
        </h2>
        <div className="mt-10 grid gap-5 max-w-4xl mx-auto">
          {TOOLS.map((t, i) => (
            <article
              key={t.name}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-8 hover:border-[#0096FF]/40 transition"
            >
              <div className="flex items-start gap-5">
                <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#0096FF]/10 border border-[#0096FF]/25 text-sm font-bold text-[#0096FF] shrink-0">
                  {i + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold">{t.name}</h3>
                    <span className="text-xs font-semibold text-[#0096FF] bg-[#0096FF]/10 border border-[#0096FF]/25 rounded-full px-3 py-1">
                      {t.tag}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed mt-3">{t.body}</p>
                  <Link
                    href={t.href}
                    className="inline-flex items-center gap-1.5 text-sm text-[#0096FF] hover:underline mt-4 font-medium"
                  >
                    Compare {t.name} vs WorldEye
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MidCta
        heading="74,229 cameras on a globe — free, no signup"
        body="Spin the Earth, open a camera, and see the flights, weather and satellites around it. Exploring beats browsing a list."
      />

      {/* How it works */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">How do live webcam sites actually work?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            The short version: venues, resorts, cities, attractions and
            individuals run cameras and publish the streams publicly — to
            promote a place, share a view, or document conditions. Webcam
            platforms collect and organize those public streams so you can
            find them in one place instead of hunting venue by venue.
          </p>
          <p>
            That shared supply is why the honest differences are about
            organization and context, not exclusivity. A directory organizes
            by category. WorldEye organizes by geography — every camera pinned
            to its real place on a 3D globe, with live data layers around it —
            which changes browsing into exploring.
          </p>
        </div>
      </section>

      {/* Use cases */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Which webcam site for which job?</h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {[
            {
              q: "Exploring the world live",
              a: "WorldEye's free globe — spin the planet and open cameras in place, with weather, flights and satellites around each feed. No account needed.",
            },
            {
              q: "Watching wildlife",
              a: "Explore.org, no contest. Its nature cameras and educational framing are built entirely around animals and wild places.",
            },
            {
              q: "Checking a famous landmark or beach",
              a: "EarthCam or SkylineWebcams — landmark and scenic directories get you to a known view in the fewest clicks.",
            },
            {
              q: "Checking weather at a spot",
              a: "Windy webcams pair the feed with the forecast for the same location — camera truth plus model prediction in one place.",
            },
          ].map((c) => (
            <div key={c.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="font-semibold text-white/90 mb-2">{c.q}</p>
              <p className="text-sm text-white/50 leading-relaxed">{c.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free vs paid */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Free vs. paid webcam sites: what&apos;s actually paywalled?</h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          <p>
            Watching live public cameras is essentially free everywhere,
            because the streams themselves are published openly. What varies
            is the experience around the feed: free directories are usually
            supported by advertising, some platforms reserve extras like
            archives or ad-free viewing for paying users, and specialist
            services (construction cameras, for example) are professional
            products entirely.
          </p>
          <p>
            WorldEye&apos;s model is different: the cameras and the whole live
            map are free with no signup, and the optional Pro tier (weekly
            $7.99, monthly $13.99, annual $74.99) pays for intelligence tooling
            around the map — the OSINT toolkit, maritime and cyber/GDELT
            intel, satellite imagery view, advanced search filters and the AI analyst —
            never for more cameras. Pay for a capability you can name, not
            for access to feeds that are already public.
          </p>
        </div>
      </section>

      {/* Q&A */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Live webcam questions, answered</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white/90">What&apos;s the best free live webcam site?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              For a traditional directory: SkylineWebcams or EarthCam, both
              free. For something different: WorldEye&apos;s free 3D globe —
              roughly 74,229 public cameras in their real places, with live
              flights, satellites and weather on the same screen, no signup.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Are these webcams really live?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              The platforms on this page aggregate publicly published live
              streams. Individual feeds can pause, go offline or switch to
              recorded loops at the source — that is the nature of public
              cameras, and it affects every aggregator equally.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white/90">Which site is best for animal webcams?</h3>
            <p className="text-white/55 leading-relaxed mt-2">
              Explore.org. Wildlife and nature are its entire mission, and its
              sanctuary, nest and wilderness cameras — with educational
              context around them — are deeper than any general directory&apos;s
              animal category.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">
          The world is live. <span className="text-[#0096FF]">Go look.</span>
        </h2>
        <p className="text-white/55 mt-3 mb-8">
          Free live cameras on a 3D globe — no signup, nothing to install.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-2xl bg-[#0096FF] text-white font-bold hover:bg-[#0077d6] transition"
          >
            Explore WorldEye
          </Link>
          <Link
            href="/pricing"
            className="inline-block px-8 py-4 rounded-2xl border border-white/15 text-white/85 font-semibold hover:border-[#0096FF]/50 hover:bg-white/5 transition"
          >
            Unlock WorldEye PRO
          </Link>
        </div>
        <p className="mt-6 text-sm text-white/40">
          Prefer the dedicated camera page?{" "}
          <Link href="/live-webcams" className="text-[#0096FF] hover:underline">
            Open the live webcams
          </Link>
        </p>
      </div>

      <RelatedLinks
        links={[
          {
            label: "WorldEye vs EarthCam",
            desc: "The detailed head-to-head comparison on the compare hub.",
            href: "/compare/earthcam",
          },
          {
            label: "Live webcams",
            desc: "Public cameras around the world — the page this guide is about.",
            href: "/live-webcams",
          },
          {
            label: "SkylineWebcams alternatives",
            desc: "Free alternatives to the scenic webcam directory, compared.",
            href: "/alternatives/skylinewebcams",
          },
          {
            label: "Pricing",
            desc: "Weekly $7.99, monthly $13.99, annual $74.99 — the cameras stay free.",
            href: "/pricing",
          },
        ]}
      />
    </IntentShell>
  );
}
