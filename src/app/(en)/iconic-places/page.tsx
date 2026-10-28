import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  AreaTable,
  StatRow,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import { EXPLORE_SCOPES, countForDef } from "@/lib/explore-data";
import { ICONIC_GAPS, ICONIC_PLACES } from "@/lib/iconic-places";

export const metadata: Metadata = {
  title: "Iconic Places — Live Cameras on the World's Famous Streets & Crossings",
  description:
    "Live public cameras that genuinely frame the world's famous crossings and streets — Shibuya Crossing, the Las Vegas Strip, Duval Street, Kalākaua Avenue — and an honest list of the famous places with no camera at all. Free, no signup.",
  alternates: { canonical: `${BASE}/iconic-places` },
  openGraph: {
    title: "Iconic Places — Live Cameras on the World's Famous Streets & Crossings",
    description:
      "The famous streets and crossings the public camera network really watches — counted by a rule, not by proximity. Free on WorldEye.",
    url: "/iconic-places",
    type: "website",
  },
};

const INTRO = [
  "Every famous street has a thousand cameras in its city and, usually, none on itself. This directory keeps a stricter rule than the rest of the site: a place earns a page only where a camera in the catalogue genuinely frames it — the feed whose own name is the crossing, the traffic camera standing on the boulevard itself. A camera merely in the same city never qualifies, however famous the city.",
  "Four places clear that bar today. Shibuya Crossing has two feeds that carry its name, one registered at the crossing itself. The Las Vegas Strip has twenty-six — Nevada DOT's cameras at nearly every corner of the boulevard between Sahara and the Welcome Sign. Duval Street in Key West has exactly one, at its Truman Avenue corner, stated as one. And Kalākaua Avenue, Waikiki's beachfront boulevard, has six at its own intersections.",
  "The absences are printed below with the same care as the presences, because 'is there a live cam of Times Square?' deserves a true answer: not in this catalogue — nor Bourbon Street, nor Abbey Road's crossing, nor Ocean Drive, Pier 39, Lombard Street or Rodeo Drive. Each absence below was measured, not assumed. If a genuine feed for any of them is published openly and enters the catalogue, it gets its page by the same rule that excluded it.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Iconic Places — Live Cameras on the World's Famous Streets & Crossings",
  description:
    "Directory of live public cameras that genuinely frame famous crossings and streets: Shibuya Crossing, the Las Vegas Strip, Duval Street and Kalākaua Avenue — plus the measured list of famous places with no qualifying camera.",
  url: `${BASE}/iconic-places`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "What qualifies a place for this page?",
    a: "A camera that frames the place itself: its own name is the place (a feed called 'Shibuya Scramble Crossing'), or it stands at the place's own intersection (the FDOT camera at Duval and Truman, the NDOT cameras on Las Vegas Boulevard). Proximity is not enough — a camera in the same city, or on a parallel street, never counts. That rule is why this hub has four places instead of forty.",
  },
  {
    q: "Is there a Times Square live cam here?",
    a: "No — and the gap is measured, not an oversight: the catalogue holds no camera within a kilometre of Times Square, and the famous billboard feeds are not published into this directory. The nearest New York cameras are on the West Side Highway, 1.4 km away. The hub prints this in its absences list rather than dressing a distant camera up as Times Square.",
  },
  {
    q: "Why does Duval Street get a page with one camera while Times Square gets none?",
    a: "Because Duval's one camera is real — it stands on Duval Street, at its Truman Avenue corner, and shows the street. Times Square's count of qualifying cameras is zero. One honest camera earns a page; zero earns an honest note. The same arithmetic gives Mount Etna a page elsewhere in this directory (one dedicated volcano camera) and Stromboli none.",
  },
  {
    q: "Are these official or venue-run cameras?",
    a: "No — they are public-agency and public publisher feeds: state and city traffic cameras (NDOT on the Strip, Honolulu's on Kalākaua, FDOT on Duval) and named publisher feeds at Shibuya. The venues themselves — the casinos, the crossing's billboards — are what the cameras watch, not who runs them.",
  },
  {
    q: "Are the iconic place cameras free to watch?",
    a: "Yes. Every camera in this directory is free to open — no account, no signup. Open a place page, or take the place to the 3D globe from the link on its page.",
  },
];

export default async function IconicPlacesPage() {
  const counts = new Map<string, number>();
  for (const p of ICONIC_PLACES) {
    counts.set(p.slug, await countForDef(EXPLORE_SCOPES[p.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const total = ICONIC_PLACES.reduce((a, p) => a + (counts.get(p.slug) ?? 0), 0);

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Iconic places" },
        ]}
      />
      <Hero
        h1="Iconic Places — Live Cameras on Famous Streets & Crossings"
        sub="The crossings and streets the public camera network really frames — counted by a rule, not by proximity. Free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(ICONIC_PLACES.length), label: "places with a qualifying camera" },
          { value: fmt(total), label: "cameras across the four sets" },
          { value: fmt(ICONIC_GAPS.length), label: "famous absences, measured" },
        ]}
      />
      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">The places with pages</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Four places in the world clear this directory's bar today — a camera
          whose own name is the place, or standing on it. Each page states its
          set's rule and count exactly; none borrows a neighbour's cameras to
          look bigger.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {ICONIC_PLACES.map((p) => (
            <Link
              key={p.slug}
              href={`/iconic-places/${p.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#00E5FF]/40 transition-colors"
            >
              <span className="font-semibold text-white/90">{p.name}</span>
              <span className="block text-sm text-white/50 mt-1">
                {p.city}, {p.country} · {fmt(counts.get(p.slug) ?? 0)} camera
                {(counts.get(p.slug) ?? 0) === 1 ? "" : "s"} — {p.setRule}
              </span>
              <span className="block text-sm text-[#00E5FF] mt-2">Watch {p.short} live →</span>
            </Link>
          ))}
        </div>
      </section>

      {ICONIC_PLACES.map((p) => (
        <section key={p.slug} className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">
            {p.name}, {p.city}
          </h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            {fmt(counts.get(p.slug) ?? 0)} camera
            {(counts.get(p.slug) ?? 0) === 1 ? "" : "s"} — {p.setRule}.{" "}
            <Link href={`/iconic-places/${p.slug}`} className="text-[#00E5FF] hover:underline">
              The {p.short} page →
            </Link>
          </p>
          <DirectoryExplorer
            scopeKey={p.scopeKey}
            scopeLabel={EXPLORE_SCOPES[p.scopeKey].label}
            groupBy="none"
            searchPlaceholder={`Search ${p.short} cameras…`}
            explorerId={`ip-${p.slug}`}
          />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          The famous absences — measured, not assumed
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Each of these was checked against the catalogue by name and by
          radius. The true answer today is that no qualifying camera exists;
          the note says what the catalogue holds instead.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {ICONIC_GAPS.map((g) => (
            <div
              key={g.name}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h3 className="font-semibold text-white/90">{g.name}</h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">{g.note}</p>
            </div>
          ))}
        </div>
      </section>

      <AreaTable
        title="Camera counts — per place"
        rows={ICONIC_PLACES.map((p) => ({
          name: `${p.name} (${p.city})`,
          count: counts.get(p.slug) ?? 0,
          href: `/iconic-places/${p.slug}`,
        }))}
        note="Counts are the yield of each place's stated rule over the public camera catalogue — name-matched and place-standing cameras only. A famous place with no qualifying camera is listed in the absences above, never padded with its city's grid."
      />

      <HowTo
        title="How to watch an iconic place on the map"
        steps={[
          "Pick the place — its page holds the exact set, nothing widened.",
          "Open a camera and check its timestamp; famous places run on light and crowds, so the hour matters.",
          "Use the globe link on the place page to see the cameras in their real geography.",
          "Come back at the place's great hour — each page's watch note says when the crossing fills, the boulevard lights, the avenue turns gold.",
        ]}
      />

      <FaqSection title="Iconic places — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live Earth"
        links={[
          { label: "Launch sites — Kennedy & the Cape, live", href: "/launch-sites" },
          { label: "Volcano webcams", href: "/volcano-webcams" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Tokyo cameras — the city page", href: "/city-webcams/tokyo" },
        ]}
      />

      <TrialCtaSection utmSource="iconic-places" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
