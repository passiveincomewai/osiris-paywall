import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, Compass, Globe, ShieldCheck } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import DirectorySearch from "@/components/DirectorySearch";
import DirectAnswers from "@/components/seo/DirectAnswers";
import {
  CATALOGUE_GENERATED_AT,
  COUNTRY_INDEX,
  EXPLORE_SCOPES,
  areasForDef,
} from "@/lib/explore-data";

/* Data source: the generated camera index (camera-countries.json +
   the per-country records) — the same catalogue the country pages
   and the explorer below serve. The headline total is the owner's
   published served-camera figure; per-country counts are the
   index's own. */
const HEADLINE = 74229;
const EUROPE_COUNT = (EXPLORE_SCOPES.europe.slugs as string[]).length;

export const metadata: Metadata = {
  title: "Live Webcams Worldwide — 74,229 Cams",
  description: `Watch 74,229 live cams and webcams in ${COUNTRY_INDEX.length} countries — traffic, cities, nature and landmarks — on WorldEye's live webcam hub. Free forever, no signup.`,
  alternates: { canonical: "https://worldeye.app/live-webcams" },
  openGraph: {
    title: "Live Webcams Worldwide — 74,229 Cams | WorldEye",
    description: `74,229 live cams and webcams across ${COUNTRY_INDEX.length} countries — traffic, cities, nature, landmarks. Free forever, no signup.`,
    url: "https://worldeye.app/live-webcams",
    type: "website",
  },
};

const fmt = (n: number) => n.toLocaleString("en-US");
const top10 = [...COUNTRY_INDEX].sort((a, b) => b.count - a.count).slice(0, 10);

const FEATURES = [
  {
    icon: Globe,
    title: "One globe, every feed",
    desc: "Instead of hunting through hundreds of agency websites, every public camera is plotted on a 3D earth you can spin, zoom and search.",
  },
  {
    icon: Compass,
    title: "Built for curiosity",
    desc: "Check a typhoon in Taiwan, a ski lift in Austria or rush hour in Houston — the directory turns the planet into a browsable, watchable place.",
  },
  {
    icon: ShieldCheck,
    title: "Honest about sources",
    desc: "These are public streams their operators already publish openly. WorldEye collects and maps them — it doesn't spy, and it doesn't need your account.",
  },
];

const FAQS = [
  {
    q: "How many live webcams does WorldEye have?",
    a: `The directory currently serves ${fmt(HEADLINE)} live public cameras across ${COUNTRY_INDEX.length} countries — from US DOT highway systems to city squares, beaches and mountain resorts. The count grows as new public feeds are found and mapped.`,
  },
  {
    q: "Is it really free to watch?",
    a: "Yes. Cameras will never sit behind a paywall — every feed on the map is free for everyone, forever, with no account and no signup. The optional Pro plan funds the infrastructure that keeps the directory running.",
  },
  {
    q: "Where can I find cameras for a specific country?",
    a: "The camera directory lists every country with its camera count and busiest region, and every country now has a dedicated page with its full city breakdown — start with the country table or search any place on the live map.",
  },
  {
    q: "What kinds of cameras are in the directory?",
    a: "Mostly traffic and highway cameras from transport agencies, plus city street cameras, beach and coastal feeds, ski resort and mountain cameras, harbor views, and plaza webcams. Whatever the world points a public camera at, the directory tries to index.",
  },
  {
    q: "Can I check road conditions before a trip?",
    a: "That is the most practical use. Highway and traffic cameras show congestion, crashes, weather, and road work live — check the route's cameras before leaving rather than discovering the jam from inside it.",
  },
  {
    q: "Do the cameras work on mobile?",
    a: "Yes. The live map and all camera feeds work in mobile browsers — no app download needed. Open the map, zoom to where you want to look, and tap a camera marker.",
  },
  {
    q: "Why do some cameras go offline?",
    a: "Operators maintain, move, or retire their cameras, and network outages happen. The directory re-checks feeds and drops dead ones; with tens of thousands indexed, alternatives are usually nearby.",
  },
  {
    q: "Can I request cameras for my area?",
    a: "The directory grows as public feeds are found and mapped. If your city or agency publishes open cameras, they are candidates for indexing — the fastest-growing regions are the ones publishing openly.",
  },
  {
    q: "How is the directory kept honest?",
    a: "Every feed is checked to make sure it actually plays before it is listed — a camera that doesn't stream doesn't get counted — and the directory re-checks and deduplicates feeds over time. The headline number is the count of cameras the globe actually serves, which is why it is exact rather than a round marketing figure.",
  },
  {
    q: "What is the difference between this page and the map?",
    a: "This page is the directory: the counts, the countries, the structure of the network. The map is the directory alive — every one of these cameras plotted where it stands, with flights, weather and the other live layers around it. Browse here to understand the network; open the map to use it.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  // Single @graph for this page: exactly ONE FAQPage, built from the
  // same FAQS array rendered below so schema matches visible questions.
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "Live Webcams Worldwide — 74,229 Cams",
      description: `Directory of ${fmt(HEADLINE)} live public webcams across ${COUNTRY_INDEX.length} countries.`,
      url: "https://worldeye.app/live-webcams",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
      numberOfItems: HEADLINE,
      dateModified: CATALOGUE_GENERATED_AT,
    },
    {
      "@type": "FAQPage",
      url: "https://worldeye.app/live-webcams",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default async function LiveWebcamsPage() {
  const areas = await areasForDef(EXPLORE_SCOPES.all, 400);
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/cameras" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <Camera className="w-4 h-4" /> Cameras
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> LIVE WEBCAM DIRECTORY
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            {fmt(HEADLINE)} Live Webcams. <span className="text-[#D4AF37]">One World.</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            This is the hub of the WorldEye camera directory: {fmt(HEADLINE)}{" "}
            publicly available live webcams from {COUNTRY_INDEX.length} countries,
            collected and mapped so you can watch the planet in real time. Live cams
            from highways and intersections, city streets and plazas, beaches, ski
            resorts, harbors and wilderness — whatever the world points a public
            camera at.
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            The United States alone contributes {fmt(top10[0].count)} feeds, from
            statewide DOT networks to dense metro corridors. Every camera here is free
            to watch — no account, no signup, ever.
          </p>
          <DirectorySearch
            label="the whole directory"
            options={areas}
            placeholder="Search anywhere — try a city…"
            emptyText={'No places in the directory match "{value}".'}
            targetId="all-explorer"
          />
        </div>

        {/* Why cards */}
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
              <span className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-[#D4AF37]" />
              </span>
              <h2 className="text-lg font-bold mt-5">{f.title}</h2>
              <p className="text-sm text-white/55 leading-relaxed mt-2">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Top 10 mini-table */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">
            Where the cameras are
          </h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            The ten countries with the most live feeds in the directory.{" "}
            <Link href="/cameras/countries" className="text-[#D4AF37] hover:underline">
              See all {COUNTRY_INDEX.length} countries
            </Link>.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/45">
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold">Country</th>
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold text-right">Live cameras</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((c) => (
                  <tr key={c.slug} className="border-t border-white/[0.06] hover:bg-white/[0.03] transition">
                    <td className="px-4 md:px-6 py-3.5 font-medium">
                      <Link href={`/cameras/countries/${c.slug}`} className="text-[#D4AF37] hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 md:px-6 py-3.5 text-right tabular-nums text-white/85">
                      {fmt(c.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full directory, live */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Watch the directory live</h2>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            Every camera in the index, as its real live feed — filter by place,
            search by name, and jump from any card to the same spot on the globe.
          </p>
          <div className="mt-6">
            <DirectoryExplorer
              scopeKey="all"
              scopeLabel="the whole world"
              groupBy="country"
              searchPlaceholder="Search all cameras — a city, a beach, a highway…"
              explorerId="all-explorer"
            />
          </div>
        </div>

        {/* Explore more */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Explore the directory</h2>
          <div className="mt-6 grid sm:grid-cols-2 gap-5">
            <Link
              href="/cameras/countries"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 hover:border-[#D4AF37]/40 transition group"
            >
              <h3 className="font-bold text-lg group-hover:text-[#D4AF37] transition">
                Cameras by country
              </h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">
                All {COUNTRY_INDEX.length} countries ranked by camera count, with each
                nation's busiest region.
              </p>
            </Link>
            <Link
              href="/world-city-webcams"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 hover:border-[#D4AF37]/40 transition group"
            >
              <h3 className="font-bold text-lg group-hover:text-[#D4AF37] transition">
                Top 25 camera regions
              </h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">
                The busiest metro areas, states and highway corridors in the world —
                from Georgia to Madrid.
              </p>
            </Link>
            <Link
              href="/live-traffic-cameras"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 hover:border-[#D4AF37]/40 transition group"
            >
              <h3 className="font-bold text-lg group-hover:text-[#D4AF37] transition">
                US traffic cameras
              </h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">
                {fmt(top10[0].count)} DOT and public road feeds — check your route before
                you drive.
              </p>
            </Link>
            <Link
              href="/europe-live-cameras"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 hover:border-[#D4AF37]/40 transition group"
            >
              <h3 className="font-bold text-lg group-hover:text-[#D4AF37] transition">
                Europe live cameras
              </h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">
                {EUROPE_COUNT} European countries, from Spanish plazas to Icelandic highlands.
              </p>
            </Link>
            <Link
              href="/sunrise-around-the-world"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 hover:border-[#D4AF37]/40 transition group"
            >
              <h3 className="font-bold text-lg group-hover:text-[#D4AF37] transition">
                Sunrise around the world
              </h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">
                A living page that rides the dawn line: live cameras where the sun is rising
                right now, recomputed every minute — with a sunset mode for the dusk line.
              </p>
            </Link>
          </div>
        </div>

        {/* How a feed earns its place */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">How a feed earns its place in the directory</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
            <p>
              The directory is not scraped together and left to rot. A camera
              gets listed when three things check out: the feed is genuinely
              public — published openly by its operator for anyone to watch;
              it actually plays, verified by loading the stream rather than
              trusting a listing; and it isn&rsquo;t already in the directory
              under another name or network, which matters when one agency
              feed surfaces through five different portals.
            </p>
            <p>
              That discipline is why the counts on this page mean something.
              The number is the set of cameras the globe serves today — not
              every webcam ever found, not a scrape of a scrape. Feeds die,
              move and get replaced, and the directory&rsquo;s job is to keep
              the map&rsquo;s promise: if it is plotted, it plays.
            </p>
          </div>
        </div>

        {/* Direct answers (AEO) */}
        <DirectAnswers
          className="mt-16"
          headingClassName="text-xl md:text-2xl font-bold leading-snug"
          items={[
            {
              q: "Can I watch live cameras for free?",
              a: "Yes — live cameras on WorldEye are free to watch in your browser, with no account and no signup. The free plan includes 5 camera opens on the globe; the directory itself is free to browse, and optional paid plans remove the open limit.",
            },
            {
              q: "Where can I watch live webcams from around the world?",
              a: "WorldEye shows 74,229 live public webcams from 109 countries on one free interactive globe you can spin, search and zoom. Browse by country or city in the directory, or open the map and tap any camera marker — traffic, beaches, ski resorts, airports, landmarks and nature.",
            },
            {
              q: "How many live cameras are there in the world?",
              a: "Nobody publishes an exact count of every webcam on Earth, but WorldEye serves 74,229 live cameras. The United States alone accounts for 41,355 of them, largely transportation-department networks. Every feed is checked before it is listed, so the number counts cameras you can actually watch.",
            },
          ]}
        />

        {/* FAQs */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Live webcam FAQs</h2>
          <div className="mt-6 space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 group"
              >
                <summary className="font-semibold cursor-pointer list-none flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  {f.q}
                </summary>
                <p className="text-sm text-white/55 leading-relaxed mt-3 pl-7">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <TrialCtaSection utmSource="live-webcams" />

        {/* CTA */}
        <div className="mt-16 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            The world is <span className="text-[#D4AF37]">live right now.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Spin the globe, pick a continent, and start watching. Free forever — no
            account, no signup.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch live webcams <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Camera overview
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
