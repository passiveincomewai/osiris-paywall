import type { Metadata } from "next";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
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
import { EXPLORE_SCOPES, countForDef, resolveExploreDef } from "@/lib/explore-data";

export const metadata: Metadata = {
  title: "Japan Webcams — 10,472 Live Cameras, Tokyo to Sapporo",
  description:
    "Watch Japan live on 10,472 public cameras — the directory's second-largest country network: Tokyo, Osaka, Sapporo, Mt. Fuji and hundreds of cities and rivers. Free, no signup.",
  alternates: { canonical: `${BASE}/japan-webcams` },
  openGraph: {
    title: "Japan Webcams — 10,472 Live Cameras, Tokyo to Sapporo",
    description:
      "Japan's public cameras on one page: the full national wall, Tokyo, Osaka, Sapporo and Mt. Fuji. Free on WorldEye.",
    url: "/japan-webcams",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Japan Webcams — 10,472 Live Cameras, Tokyo to Sapporo",
  description:
    "Hub for Japan's 10,472 live public cameras in the WorldEye directory — the full national wall plus Tokyo, Osaka, Sapporo and Mt. Fuji walls, with the country's city pages and traffic hub.",
  url: `${BASE}/japan-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Where can I watch live webcams in Japan for free?",
    a: "Here — and on the WorldEye globe. Japan's 10,472 catalogue cameras are collected on this page into a national wall plus Tokyo, Osaka, Sapporo and Mt. Fuji walls, and every feed opens free with no account and no signup. The Japan country page carries the full city-by-city breakdown.",
  },
  {
    q: "Why does Tokyo's wall gather cameras from so many named places?",
    a: "Because Tokyo's public networks name their cameras by ward, district and river rather than by the metropolis. A camera filed under a ward name is still a Tokyo camera, so this page's Tokyo wall uses a stated geographic rule — every catalogue camera within 20 km of Tokyo Station, 168 feeds — instead of trusting any single name. The count is the rule's real yield over the catalogue.",
  },
  {
    q: "Can I watch Mt. Fuji live?",
    a: "Yes — the Fuji wall below collects every catalogue camera within 25 km of the summit, 32 feeds from the Five Lakes district and the towns around the mountain's base. Fuji is famously shy: clear dawns are the best bet, and a clouded-out frame is the mountain's weather, not a broken camera. The nearby city pages for Gotemba and Fujikawa cover the eastern approaches.",
  },
  {
    q: "What kinds of cameras does Japan's directory hold?",
    a: "Mostly municipal and prefectural working networks: road and traffic cameras, river and flood-watch cameras, city street feeds and mountain and coast views. Japan publishes public cameras at a scale few countries match — 10,472 in this directory, second only to the United States — which is why the national wall below is organised by city, 958 named places in all.",
  },
  {
    q: "Where are Japan's traffic cameras?",
    a: "They have their own hub: the Japan traffic cameras page collects the country's road-network feeds. This page is the wider view — cities, rivers, mountains and coasts alongside the roads.",
  },
];

export default async function JapanWebcamsPage() {
  const fmt = (n: number) => n.toLocaleString("en-US");
  const japanDef = EXPLORE_SCOPES["japan"];
  const tokyoDef = EXPLORE_SCOPES["japan-tokyo"];
  const fujiDef = EXPLORE_SCOPES["japan-fuji"];
  const osakaDef = resolveExploreDef({ country: "japan", city: "Osaka" });
  const sapporoDef = resolveExploreDef({ country: "japan", city: "Sapporo" });
  const [japan, tokyo, fuji, osaka, sapporo] = await Promise.all([
    countForDef(japanDef),
    countForDef(tokyoDef),
    countForDef(fujiDef),
    osakaDef ? countForDef(osakaDef) : Promise.resolve(0),
    sapporoDef ? countForDef(sapporoDef) : Promise.resolve(0),
  ]);

  const intro = [
    `Japan is the second-largest camera country in this directory: ${fmt(japan)} live public cameras, behind only the United States and far ahead of every other nation. This hub gathers them the way watchers actually use them — the full national wall below, then the places people come for: Tokyo, Osaka, Sapporo, and the mountain that needs no introduction, Mt. Fuji. Every feed is free to watch, no account, no signup. One clarification, because Japan has three front doors here: this page is the curated view — the wall and the famous places. The complete index, with the full city-by-city breakdown and the network in detail, is the Japan country page; the road networks live on the Japan traffic page. Both are linked at the foot of this page.`,
    "The character of the network is municipal. Japan's cities, prefectures and river authorities publish cameras at a scale the rest of the world rarely matches — road and junction feeds, river and flood-watch cameras, street views and mountain weather, spread across 958 named places in the catalogue. Osaka's city network alone contributes 194 feeds and Sapporo's 184, and the long tail of smaller cities and towns is where this directory gets its depth: Kanazawa, Tsu, Kasukabe, Asahikawa and hundreds more, each with its own city page.",
    "One piece of method, stated openly because it shapes a number on this page: Tokyo's cameras mostly file themselves under ward, district and river names, so a name search undercounts the capital badly. The Tokyo wall therefore uses the same geographic rule as this site's event pages — every catalogue camera within 20 km of Tokyo Station — and quotes that rule's yield, 168 feeds. The Fuji wall works the same way: everything within 25 km of the summit.",
    "From here, the country's own pages go deeper: the Japan country page for the full breakdown, the Japan traffic hub for the road networks, the city pages for Osaka, Sapporo, Kyoto, Nara and Kanazawa, and the volcano page for Sakurajima's live wall. This hub is the front door.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Japan webcams" },
        ]}
      />
      <Hero
        h1="Japan Webcams — 10,472 Live Cameras"
        sub="The directory's second-largest national network: Tokyo, Osaka, Sapporo, Mt. Fuji and 958 named places — free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(japan), label: "live cameras in Japan" },
          { value: "#2", label: "largest country in the directory" },
          { value: "958", label: "named cities and towns" },
        ]}
      />
      <Intro paragraphs={intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Japan — the national wall</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          All {fmt(japan)} of Japan&apos;s catalogue cameras, grouped by city — the
          municipal road, river, street and mountain networks of an entire country on
          one wall. Search it by any place name.
        </p>
        <DirectoryExplorer
          scopeKey="japan"
          scopeLabel={japanDef.label}
          groupBy="city"
          searchPlaceholder="Search Japan cameras — a city, a river, a road…"
          explorerId="japan-all"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Tokyo — within 20 km of Tokyo Station</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(tokyo)} cameras within 20 km of Tokyo Station, nearest first. The
          geographic rule matters here: the capital&apos;s networks file cameras under
          ward, district and river names, so this wall collects the metropolis the
          honest way — by where the cameras stand. Tokyo also has its own city page,
          linked below.
        </p>
        <DirectoryExplorer
          scopeKey="japan-tokyo"
          scopeLabel={tokyoDef.label}
          groupBy="none"
          searchPlaceholder="Search Tokyo cameras…"
          explorerId="japan-tokyo"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Osaka — the city network</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(osaka)} cameras filed under Osaka — the largest single city network in
          Japan&apos;s catalogue: canals, expressways, river gates and the streets of
          the country&apos;s kitchen. Osaka&apos;s own city page is linked below.
        </p>
        <DirectoryExplorer
          country="japan"
          city="Osaka"
          scopeLabel="Osaka"
          groupBy="none"
          searchPlaceholder="Search Osaka cameras…"
          explorerId="japan-osaka"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Sapporo — Hokkaido&apos;s capital</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(sapporo)} cameras filed under Sapporo — the northern capital&apos;s road
          and city network, and the directory&apos;s best seat for Japan&apos;s snow
          season: when a Hokkaido storm lands, this wall shows it street by street.
        </p>
        <DirectoryExplorer
          country="japan"
          city="Sapporo"
          scopeLabel="Sapporo"
          groupBy="none"
          searchPlaceholder="Search Sapporo cameras…"
          explorerId="japan-sapporo"
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Mt. Fuji &amp; the Five Lakes</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(fuji)} cameras within 25 km of the summit, nearest first — the Five
          Lakes district and the towns at the mountain&apos;s base. Go at dawn, local
          time: Fuji shows itself in the morning far more often than the afternoon,
          and a clear frame over Lake Kawaguchi is the postcard, earned honestly.
        </p>
        <DirectoryExplorer
          scopeKey="japan-fuji"
          scopeLabel={fujiDef.label}
          groupBy="none"
          searchPlaceholder="Search Mt. Fuji cameras…"
          explorerId="japan-fuji"
        />
      </section>

      <HowTo
        title="How to watch Japan on these cameras"
        steps={[
          "Mind the clock: Japan is 13–14 hours ahead of US Eastern, so Japan's morning rush and Fuji's dawn window land in the North American evening.",
          "For Fuji, check at dawn local time and more than once — the mountain clears and clouds over within the hour.",
          "Use the national wall's city search for the long tail: Japan's smaller cities and river towns are where this catalogue is deepest.",
          "In winter, the Sapporo wall is the snow desk; in typhoon season, the southern city walls show landfall weather as it happens.",
          "Confirm the timestamp on any feed before reading conditions from it — a still frame is a paused camera, not a calm day.",
        ]}
      />

      <FaqSection title="Japan webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More of Japan, more live WorldEye"
        links={[
          { label: "Japan cameras — the country page", href: "/cameras/countries/japan" },
          { label: "Japan traffic cameras", href: "/japan-traffic-cameras" },
          { label: "Tokyo webcams — the city page", href: "/city-webcams/tokyo" },
          { label: "Osaka webcams — the city page", href: "/city-webcams/osaka" },
          { label: "Sapporo webcams — the city page", href: "/city-webcams/sapporo" },
          { label: "Kyoto webcams — the city page", href: "/city-webcams/kyoto" },
          { label: "Volcano webcams — Sakurajima's wall", href: "/volcano-webcams" },
          { label: "Asia webcams", href: "/asia-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="japan-webcams" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
