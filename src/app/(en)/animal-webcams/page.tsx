import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
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
import ViewOnGlobeButton from "@/components/ViewOnGlobeButton";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import { EXPLORE_SCOPES, recordsForDef } from "@/lib/explore-data";
import { ANIMAL_GROUPS, ANIMAL_STARS } from "@/lib/animal-cams";

export const metadata: Metadata = {
  title: "Animal Webcams — Live Zoo, Safari, Nest & Reef Cameras",
  description:
    "The world's genuine animal cameras in one directory: safari lodges, zoo feeds, falcon and stork nest cams, barn owls and underwater reefs — 43 live cameras whose own names name an animal. Free, no signup.",
  alternates: { canonical: `${BASE}/animal-webcams` },
  openGraph: {
    title: "Animal Webcams — Live Zoo, Safari, Nest & Reef Cameras",
    description:
      "Safari lodges, zoos, nest cams and reef cams — the catalogue's real animal cameras, on one map. Free on WorldEye.",
    url: "/animal-webcams",
    type: "website",
  },
};

const INTRO = [
  "Animal cams are the most searched-for cameras on the internet and the easiest to fake a directory for — so this page is built the strict way. A camera belongs here only when its own catalogue record names an animal subject: a zoo, a nest, a safari lodge, a reef. Road cameras at interchanges named after zoos, river gauges named after aquariums, and towns called Eagle or Bear were all audited and all rejected. What survives the audit is 43 cameras — a small, true set.",
  "The shape of the set may surprise you. The heavy English-language zoo-and-nest circuit is barely here; instead the catalogue's strength is Europe's nest-cam culture — Dutch peregrine falcons on church towers, Dutch and Hungarian white storks on rooftops, Polish falcons on power-plant stacks — plus five African safari feeds, a handful of true zoo cameras, and five underwater reef cams that never surface.",
  "And the famous absences deserve their own paragraph, because honesty is the point of this page: the catalogue holds no Brooks Falls bear cam, no eagle nest cam, no panda, osprey, puffin or penguin camera anywhere. The only Katmai record in 76,575 cameras is an FAA weather camera at a lodge airstrip. If a feed isn't in the groups below, it isn't in the directory — and the directory won't pretend otherwise.",
  "Every camera here is free to open. Safari feeds reward dawn and dusk; nest cams are seasonal, full of feathers in the breeding months and architecture the rest of the year; the reef cams keep fish hours, in full daylight, on the far side of the world from wherever you are.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Animal Webcams — Live Zoo, Safari, Nest & Reef Cameras",
  description:
    "Directory of the catalogue's genuine animal cameras: safari lodges, zoo feeds, falcon and stork nest cams, barn owls and underwater reefs, each identified by its own catalogue name.",
  url: `${BASE}/animal-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "How many animal webcams are there?",
    a: "43 in this directory — every camera in the WorldEye catalogue whose own record names an animal subject, counted by a stated rule: the name must carry the animal (zoo, nest, lodge, reef), and the record must not be a road or river-gauge camera named for a nearby landmark. The explorer below serves exactly that set, so the number on this page is the number you get.",
  },
  {
    q: "Can I watch the Brooks Falls bear cam or an eagle nest cam here?",
    a: "No — and this page would rather say so than dress anything up. The catalogue holds no Brooks Falls camera (its only Katmai record is an FAA weather camera at a lodge airstrip), no eagle nest cam, and no panda, osprey, puffin or penguin cams at all. What it holds instead is listed in full above: safari lodges, true zoo feeds, Europe's nest-cam clusters and underwater reefs.",
  },
  {
    q: "Why are so many of the nest cams Dutch and Polish?",
    a: "Because that's where the catalogue's nest cameras actually are. The Netherlands has a deep public nest-cam culture — peregrine falcons (slechtvalken) on churches and storks (ooievaars) on town halls — and Polish falcon nests around Wejherowo, Reda and Tczew are published by a regional portal. The directory reflects the cameras that exist, not the ones a brochure would invent.",
  },
  {
    q: "When is the best time to watch the safari cams?",
    a: "Dawn and dusk in the park's own timezone, when game moves and drinks. The five safari feeds are in South Africa (SAST, UTC+2) and Kenya (EAT, UTC+3). Midday frames are often empty; waterhole and river cameras also reward the dry season, when animals concentrate at permanent water.",
  },
  {
    q: "Are animal webcams free to watch?",
    a: "Yes. Every camera in this directory is a public feed and opens free on WorldEye — no account, no signup. Open any camera from the grids below or find it on the globe.",
  },
];

export default async function AnimalWebcamsPage() {
  const records = await recordsForDef(EXPLORE_SCOPES["animals"]);
  const byIdRec = new Map(records.map((r) => [r.id, r]));
  const fmt = (n: number) => n.toLocaleString("en-US");
  const countries = new Set(records.map((r) => r.country)).size;

  const groupRecords = (ids: string[]) =>
    ids
      .map((id) => byIdRec.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Animal webcams" },
        ]}
      />
      <Hero
        h1="Animal Webcams — Live Zoo, Safari, Nest & Reef Cameras"
        sub="The catalogue's genuine animal cameras — each one named for its animal by its own record. Free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(records.length), label: "genuine animal cameras in the directory" },
          { value: fmt(ANIMAL_STARS.length), label: "feeds with their own page" },
          { value: fmt(countries), label: "countries" },
        ]}
      />
      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Feeds with their own page</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Twelve feeds have a real named identity people search for — a park, a
          zoo, a reserve, a shelter — and get a page of their own. Everything
          else genuine lives in the groups below, in full. A feed earns a page
          the same way it earns its place here: its own record names it.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ANIMAL_STARS.map((s) => (
            <Link
              key={s.slug}
              href={`/animal-webcams/${s.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#00E5FF]/40 transition-colors"
            >
              <span className="font-semibold text-white/90">{s.name}</span>
              <span className="block text-sm text-white/50 mt-1">
                {s.place} · {s.country}
              </span>
              <span className="block text-sm text-[#00E5FF] mt-2">
                Watch {s.short} live →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.05] p-6 md:p-7 max-w-3xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold">
          The famous cameras that aren&apos;t here
        </h2>
        <div className="mt-3 space-y-3 text-sm text-white/65 leading-relaxed">
          <p>
            The most-searched animal cams on the internet — the{" "}
            <strong className="text-white/85">Brooks Falls bear cam</strong> in
            Katmai, the big <strong className="text-white/85">eagle nest
            cams</strong>, panda cams, osprey and puffin cams —{" "}
            <strong className="text-white/85">do not exist in this catalogue</strong>.
            Its only Katmai record is an FAA weather camera at a lodge airstrip
            near Kulak Bay; its only osprey and puffin records are a Texas
            highway junction and a Welsh roundabout. Fat Bear Week, for the
            same reason, has no page here: there is no Brooks Falls camera to
            build one on.
          </p>
          <p>
            What the catalogue holds instead is below, in full — and every
            entry was verified against its own record before it was listed.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">All {fmt(records.length)} animal cameras, live</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          The full rule-served set — every catalogue camera whose own name
          names an animal, that is not a road or river-gauge camera in
          disguise. Search it, group it by country, and open any feed here or
          on the globe.
        </p>
        <DirectoryExplorer
          scopeKey="animals"
          scopeLabel={EXPLORE_SCOPES["animals"].label}
          groupBy="country"
          searchPlaceholder="Search animal cameras…"
          explorerId="animals-hub"
        />
      </section>

      {ANIMAL_GROUPS.map((g) => {
        const recs = groupRecords(g.ids);
        if (recs.length === 0) return null;
        return (
          <section key={g.key} className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-3">
              {g.heading} — {recs.length} camera{recs.length === 1 ? "" : "s"}
            </h2>
            <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
              {g.blurb}
            </p>
            <ul className="grid sm:grid-cols-2 gap-3">
              {recs.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3"
                >
                  <MapPin className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{r.name}</div>
                    {r.city && (
                      <div className="text-xs text-white/45">{r.city}</div>
                    )}
                    <div className="mt-1.5">
                      <ViewOnGlobeButton cameraId={r.id} cameraName={r.name} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <AreaTable
        title="Camera counts — by group"
        rows={ANIMAL_GROUPS.map((g) => ({
          name: g.heading,
          count: g.ids.filter((id) => byIdRec.has(id)).length,
        }))}
        note="Counts are the rule's actual yield over the catalogue, grouped by the audit's clusters. A camera is counted only when its own record names an animal subject — place names, street names and landmark-named gauge cameras are excluded, however animal they sound."
      />

      <HowTo
        title="How to watch animal cameras well"
        steps={[
          "Start with the star pages: Tembe for elephants, the Hula for migration, a reef cam for guaranteed motion in daylight.",
          "Think in the animal's timezone, not yours — safari feeds peak at African dawn and dusk, nest cams in European daylight.",
          "Give a quiet frame time. Wild animals are not programming; the long game is what makes the arrival worth it.",
          "Respect the seasons: nest cams are breeding-season theatres, safari waterholes peak in the dry months, migration at the Hula is a spring and autumn event.",
          "Check the feed's own timestamp before trusting the frame — bush and rooftop cameras pause for weather and power.",
        ]}
      />

      <FaqSection title="Animal webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live Earth"
        links={[
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "National park webcams", href: "/national-park-webcams" },
          { label: "University campus webcams", href: "/university-webcams" },
          { label: "Beach webcams", href: "/beach-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="animal-webcams" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
