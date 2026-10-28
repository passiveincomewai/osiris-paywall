import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import { EXPLORE_SCOPES, recordsForDef } from "@/lib/explore-data";
import { FERRY_SYSTEMS } from "@/lib/ferries";

/* ISR: the walls' counts move only when the catalogue regenerates;
   the per-system live panels poll their own endpoints. */
export const revalidate = 1800;

const TITLE = "Ferry Tracker — Live Ferries & Terminal Cameras";
const DESCRIPTION =
  "Track the ferries of Washington State Ferries, BC Ferries and the Staten Island Ferry live: vessels on AIS matched by their own broadcast names, plus the terminal cameras at their docks. Positions, not timetables.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/ferry-tracker` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/ferry-tracker", type: "website" },
};

/** The primary wall shown on the hub for each system. */
const PRIMARY_WALL: Record<string, string> = {
  "washington-state-ferries": "ferry-wsf-seattle",
  "bc-ferries": "ferry-bcf-departure-bay",
  "staten-island-ferry": "ferry-si-new-york-harbor",
};

const INTRO: [string, string] = [
  "A ferry is the most trackable vessel in any harbour: it runs the same water on a loop, it is big, it is named, and it announces itself. Every ferry on AIS broadcasts its name, position and destination continuously — and the great ferry systems sail from docks that public camera networks already watch. This tracker joins the two: the boats, live by name, and the terminal cameras at the docks they serve.",
  "Three systems qualify on evidence. Washington State Ferries is the flagship — its state DOT publishes a camera at essentially every dock. BC Ferries sails identifiable Queens, Spirits and Salish-class boats past real terminal cameras at Departure Bay and Horseshoe Bay — and its three biggest terminals have no camera at all, which its page states rather than pads. The Staten Island Ferry has no camera inside either terminal, and says so; its page walls the harbour it crosses instead. Systems that failed the evidence rule — a real vessel path and real cameras — are not here.",
];

const FAQS = [
  {
    q: "How are the ferries identified?",
    a: "By the names the vessels themselves broadcast on AIS, matched inside each system's service-area geofence, with any contact whose static data identifies it as a non-passenger vessel excluded. AIS carries no operator field, so name-and-place matching against each fleet's own distinctive vessel names is the honest rule — the same one the big tracking sites use. Only vessels reporting right now are listed; the feed drops reports older than ten minutes.",
  },
  {
    q: "Can I see sailing times or book a ferry here?",
    a: "No. No dataset behind this site carries sailing times, and the tracker prints none rather than scrape or invent them. It shows where the boats are and what the docks look like; for times, fares and bookings, each operator's own site is the source — Washington State Ferries, BC Ferries and NYC DOT respectively.",
  },
  {
    q: "Why only three ferry systems?",
    a: "Because the bar is evidence, not enthusiasm: a system needs a name-identifiable fleet on AIS and real terminal or harbour cameras in the catalogue. Several famous systems fail it honestly today — the catalogue has no cameras at most ferry docks worldwide. As public feeds appear, systems that pass the rule will join this page.",
  },
  {
    q: "Is the ferry tracker free?",
    a: "Yes — the system pages, their live panels and every terminal camera open free, with no account and no signup. The globe's full maritime firehose (every vessel, everywhere) is a VIP layer; the ferry fleets' own panels are public.",
  },
];

export default async function FerryTrackerHub() {
  const fmt = (x: number) => x.toLocaleString("en-US");
  const systems = await Promise.all(
    FERRY_SYSTEMS.map(async (s) => {
      const primaryKey = PRIMARY_WALL[s.slug];
      const primaryDef = EXPLORE_SCOPES[primaryKey];
      const counts = await Promise.all(
        s.walls.map((w) => recordsForDef(EXPLORE_SCOPES[w.scopeKey])),
      );
      const seen = new Set<string>();
      for (const recs of counts) for (const r of recs) seen.add(r.id);
      return { s, primaryKey, primaryDef, total: seen.size };
    }),
  );
  const grandTotal = systems.reduce((acc, x) => acc + x.total, 0);
  const wallTotal = FERRY_SYSTEMS.reduce((acc, s) => acc + s.walls.length, 0);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Live webcams", item: `${BASE}/live-webcams` },
      { "@type": "ListItem", position: 3, name: "Ferry tracker", item: `${BASE}/ferry-tracker` },
    ],
  };

  return (
    <PageShell>
      <JsonLd data={breadcrumbLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        schema={false}
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Ferry tracker" },
        ]}
      />
      <Hero
        h1="Ferry Tracker — Live Ferries & Terminal Cameras"
        sub="Washington State Ferries, BC Ferries and the Staten Island Ferry: the boats live on AIS, the docks on camera. Positions, not timetables — free, no signup."
      />
      <StatRow
        stats={[
          { value: String(FERRY_SYSTEMS.length), label: "ferry systems tracked" },
          { value: fmt(grandTotal), label: "terminal & harbour cameras" },
          { value: String(wallTotal), label: "terminal walls" },
          { value: "2", label: "countries — United States & Canada" },
        ]}
      />
      <Intro paragraphs={[INTRO[0], INTRO[1]]} />

      {systems.map(({ s, primaryKey, primaryDef, total }) => (
        <section key={s.slug} className="mt-14">
          <h2 className="text-xl md:text-2xl font-bold mb-3">
            <Link href={`/ferry-tracker/${s.slug}`} className="hover:underline">
              {s.name}
            </Link>{" "}
            — {fmt(total)} cameras, {s.walls.length} terminal wall
            {s.walls.length === 1 ? "" : "s"}
          </h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            {s.intro[0]}
          </p>
          <DirectoryExplorer
            scopeKey={primaryKey}
            scopeLabel={primaryDef.label}
            groupBy="none"
            searchPlaceholder={`Search ${s.short} cameras…`}
            explorerId={`ft-hub-${s.slug}`}
          />
          <p className="mt-4 text-sm">
            <Link
              href={`/ferry-tracker/${s.slug}`}
              className="text-[#00E5FF] hover:underline"
            >
              Open the {s.name} tracker — live fleet panel & all terminal walls →
            </Link>
          </p>
        </section>
      ))}

      <HowTo
        title="How ferry tracking works here"
        steps={[
          "Each system's page opens with its live panel: the fleet as AIS hears it, vessel by vessel, nothing older than ten minutes admitted.",
          "Below the panel sit the terminal walls — the public cameras at the docks, each wall labelled with its own radius rule.",
          "A filling holding lane plus a boat on the panel slowing for the dock is the closest honest thing to a departure board.",
          "Gaps are printed, not padded: where a system has a terminal with no public camera, the page names it.",
        ]}
      />

      <FaqSection title="Ferry tracker — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More on the water"
        links={[
          { label: "Cruise port boards & port webcams", href: "/port-webcams" },
          { label: "Live ship tracker", href: "/ship-tracker" },
          { label: "Washington State Ferries", href: "/ferry-tracker/washington-state-ferries" },
          { label: "BC Ferries", href: "/ferry-tracker/bc-ferries" },
          { label: "Staten Island Ferry", href: "/ferry-tracker/staten-island-ferry" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="ferry-tracker" />
      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
