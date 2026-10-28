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
import TrialCtaSection from "@/components/TrialCtaSection";
import { UNIVERSITIES, type University } from "@/lib/universities";

export const metadata: Metadata = {
  title: "University Webcams — Live Campus Cameras Worldwide",
  description:
    "Live cameras that genuinely sit on university campuses — named by the cameras' own catalogue records: campus research cameras, a stadium roof, university gates from Seoul to Enschede. 25 universities, 31 cameras. Free, no signup.",
  alternates: { canonical: `${BASE}/university-webcams` },
  openGraph: {
    title: "University Webcams — Live Campus Cameras Worldwide",
    description:
      "Campus cameras whose own records name the university — 25 institutions, 31 cameras, audited one by one. Free on WorldEye.",
    url: "/university-webcams",
    type: "website",
  },
};

const INTRO = [
  "Every university in the world seems to have a live cam — until you audit one. Search a camera catalogue for 'university' and you get hundreds of hits, and almost all of them are road furniture: University Avenue junctions, cameras 'near' a college, a university hospital's intersection, field stations an hour from any campus. This directory applies the strict rule instead: a university gets a page only when a camera's own catalogue record names the institution AND makes the campus its subject — on the campus, on a named campus building, or at the university's named gate.",
  "What survives is modest and real: 25 universities and 31 cameras. The mix is what the catalogue honestly holds. American and European campuses mostly appear through the PhenoCam research network — cameras mounted on campus buildings to photograph vegetation through the seasons — plus four FAA weather cameras on UC Santa Barbara's campus. Korea is the surprise: its municipal networks name cameras for university gates and campuses outright, and eight Korean institutions qualify on their own data.",
  "The rejected list is as much a part of this page as the accepted one. Harvard, Oxford and Stanford have no qualifying camera in the catalogue and get no page. Appalachian State's record names the university but places itself in a different town from its own name — an off-campus site, rejected on the record's own contradiction. Field stations, research farms, distillery fields and hospital junctions: all out, however the institution brands them.",
  "Each page below is the campus's cameras, the institution's name and city exactly as the data gives them, and a link onward to the city page where one exists. Nothing here claims an affiliation the camera's own data doesn't state.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "University Webcams — Live Campus Cameras Worldwide",
  description:
    "Directory of cameras genuinely on university campuses, admitted only when the camera's own catalogue record names the institution and the campus is its subject.",
  url: `${BASE}/university-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "How many universities have live campus cameras here?",
    a: "25 universities, with 31 cameras between them — every institution in the WorldEye catalogue where a camera's own record names the university and the campus is the camera's subject. The count is small because the rule is strict: several hundred catalogue records mention a university or college, and nearly all are road junctions, nearby streets or off-campus research sites.",
  },
  {
    q: "Why doesn't my university have a page?",
    a: "Because no camera in the catalogue passes the rule for it yet: the camera's own data must name the institution, and the campus must be the subject. A camera near a campus, on a street named University Avenue, or at a field station doesn't qualify — and rather than guess affiliations, the directory waits for a camera that names the campus itself.",
  },
  {
    q: "What is a PhenoCam, and why are so many campus cameras PhenoCams?",
    a: "PhenoCam is a research network whose cameras photograph a fixed view of vegetation repeatedly to track the seasons. Universities host many of them on campus buildings and grounds, and their records name the institution precisely — which is exactly the evidence this directory's rule asks for. Each campus page states what kind of camera it serves.",
  },
  {
    q: "Are these official university webcams?",
    a: "They are public cameras carried in the WorldEye catalogue whose own records name the institution — research-network units hosted on campuses, aviation weather cameras filed on a campus, and municipal cameras whose subject is a campus or its gate. WorldEye is a directory, not the universities; each page says which network a camera belongs to.",
  },
  {
    q: "Are campus webcams free to watch?",
    a: "Yes — every camera in this directory is a public feed and opens free on WorldEye, no account and no signup.",
  },
];

const GROUPS: { heading: string; blurb: string; match: (u: University) => boolean }[] = [
  {
    heading: "United States",
    blurb:
      "Twelve institutions, fifteen cameras: four FAA weather cameras on UC Santa Barbara's campus, and PhenoCam research units from Vanderbilt's Peabody campus to a ridge above the University of Hawaiʻi — plus CUNY's research center in Harlem and a tribal university in Crownpoint, New Mexico.",
    match: (u) => u.country === "United States",
  },
  {
    heading: "Europe",
    blurb:
      "Five institutions, six cameras: Twente's pair of building-named PhenoCams in Enschede, Newcastle's Stephenson Building, Bristol's Engineering Building, TU Berlin's urban-vegetation camera, and a rooftop over Bucharest's Piața Romană named for the University of Economic Studies.",
    match: (u) => ["Netherlands", "United Kingdom", "Germany", "Romania"].includes(u.country),
  },
  {
    heading: "South Korea",
    blurb:
      "Eight institutions, ten cameras — the catalogue's campus-camera capital. Korean municipal networks name their cameras for what they watch: Dongeui University's upper and lower hillside in Busan, the north gate at Kyungpook, entrances at Jeonnam and Silla, three Songdo campuses, and Yonsei twice over, in Songdo and Sinchon.",
    match: (u) => u.country === "South Korea",
  },
];

export default function UniversityWebcamsPage() {
  const fmt = (n: number) => n.toLocaleString("en-US");
  const totalCams = UNIVERSITIES.reduce((a, u) => a + u.ids.length, 0);
  const countryCount = new Set(UNIVERSITIES.map((u) => u.country)).size;

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "University webcams" },
        ]}
      />
      <Hero
        h1="University Webcams — Live Campus Cameras"
        sub="Campus cameras whose own records name the university — audited one by one, road junctions excluded. Free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(UNIVERSITIES.length), label: "universities with a campus camera" },
          { value: fmt(totalCams), label: "campus cameras in the directory" },
          { value: fmt(countryCount), label: "countries" },
        ]}
      />
      <Intro paragraphs={INTRO} />

      {GROUPS.map((g) => {
        const list = UNIVERSITIES.filter(g.match);
        if (list.length === 0) return null;
        return (
          <section key={g.heading} className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-3">
              {g.heading} — {list.length} universit{list.length === 1 ? "y" : "ies"}
            </h2>
            <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
              {g.blurb}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((u) => (
                <Link
                  key={u.slug}
                  href={`/university-webcams/${u.slug}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#00E5FF]/40 transition-colors"
                >
                  <span className="font-semibold text-white/90">{u.name}</span>
                  <span className="block text-sm text-white/50 mt-1">
                    {u.place} · {u.ids.length} camera{u.ids.length === 1 ? "" : "s"}
                  </span>
                  <span className="block text-sm text-[#00E5FF] mt-2">
                    Watch the {u.short} campus →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <AreaTable
        title="Camera counts — by country"
        rows={GROUPS.map((g) => ({
          name: g.heading,
          count: UNIVERSITIES.filter(g.match).reduce((a, u) => a + u.ids.length, 0),
        }))}
        note="Counts are the audit's accept side only: cameras whose own catalogue record names the institution, with the campus as subject. Road, station, hospital and field-station cameras that carry a university's name are excluded by the rule, not by oversight."
      />

      <HowTo
        title="How to watch a campus on the map"
        steps={[
          "Pick the university from the directory above — each card states its real camera count before you click.",
          "Open the camera from the campus page, or find its marker on the free WorldEye globe.",
          "Read the page's camera note: a PhenoCam photographs on a research schedule, a gate CCTV is live video, an FAA unit is a weather camera — the page says which.",
          "Follow the city link where one exists: the campus is one frame of its city, and the city page holds the rest.",
          "Check the timestamp before trusting the frame — research cameras especially keep their own cadence.",
        ]}
      />

      <FaqSection title="University webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live webcams"
        links={[
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Animal webcams", href: "/animal-webcams" },
          { label: "Cameras by country — the directory", href: "/cameras/countries" },
        ]}
      />

      <TrialCtaSection utmSource="university-webcams" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
