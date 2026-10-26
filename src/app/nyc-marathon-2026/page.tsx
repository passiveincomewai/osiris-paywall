import type { Metadata } from "next";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  AreaTable,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import SkiCameraGrid from "@/components/SkiCameraGrid";
import { loadCountryChunk } from "@/lib/ski-resorts";
import {
  camerasAlongRoute,
  countWithinKm,
  distanceKm,
  type GeoAnchor,
} from "@/lib/event-page-cameras";
export const metadata: Metadata = {
  title: "NYC Marathon 2026 — Live Cameras Along the Course",
  description:
    "Watch the 2026 New York City Marathon's streets live on Sunday, November 1 — public cameras along the course through Staten Island, Brooklyn, Queens, the Bronx and Manhattan, on the WorldEye map. Free, no signup.",
  alternates: { canonical: `${BASE}/nyc-marathon-2026` },
  openGraph: {
    title: "NYC Marathon 2026 — Live Cameras Along the Course",
    description:
      "Public street and traffic cameras along the five-borough marathon course, live on one map. Free on WorldEye.",
    url: "/nyc-marathon-2026",
    type: "website",
  },
};

/* The course, start to finish, as [lng, lat] waypoints: Fort Wadsworth
   and the Verrazzano-Narrows Bridge, Bay Ridge and Fourth Avenue,
   downtown Brooklyn, Williamsburg and Greenpoint, Long Island City and
   the Queensboro Bridge, First Avenue, the Bronx loop, then Fifth
   Avenue and the Central Park finish. */
const COURSE: readonly (readonly [number, number])[] = [
  [-74.057, 40.601], [-74.034, 40.618], [-74.01, 40.64], [-73.995, 40.66],
  [-73.985, 40.678], [-73.972, 40.69], [-73.962, 40.705], [-73.955, 40.725],
  [-73.94, 40.745], [-73.945, 40.758], [-73.945, 40.78], [-73.935, 40.8],
  [-73.925, 40.815], [-73.935, 40.822], [-73.945, 40.808], [-73.952, 40.795],
  [-73.96, 40.782], [-73.972, 40.772],
];

const CORRIDOR_KM = 2.5;
const CITY_CENTER: GeoAnchor = { lat: 40.758, lng: -73.985 };
const CENTRAL_PARK: GeoAnchor = { lat: 40.768, lng: -73.972 };

interface BoroughSection {
  name: string;
  anchor: GeoAnchor;
  body: string;
}

const BOROUGHS: BoroughSection[] = [
  {
    name: "Staten Island — the start",
    anchor: { lat: 40.601, lng: -74.055 },
    body: "The race begins at Fort Wadsworth, in the shadow of the Verrazzano-Narrows Bridge. The cameras here watch the bridge approaches and the Staten Island shore as tens of thousands of runners stage at dawn and pour onto the span — the widest start in marathon running.",
  },
  {
    name: "Brooklyn — Fourth Avenue and downtown",
    anchor: { lat: 40.665, lng: -73.988 },
    body: "Off the bridge into Bay Ridge, then straight up Fourth Avenue through Sunset Park and Park Slope before the course turns through downtown Brooklyn and toward Williamsburg. Brooklyn holds the race's loudest street miles, and it is the densest camera stretch of the five boroughs.",
  },
  {
    name: "Queens — Long Island City",
    anchor: { lat: 40.744, lng: -73.936 },
    body: "The Pulaski Bridge drops the field into Long Island City at the halfway point, and the Queensboro Bridge carries it into Manhattan. The cameras here face the East River crossings and the LIC streets the course threads on its way to the bridge.",
  },
  {
    name: "The Bronx — the short, loud loop",
    anchor: { lat: 40.816, lng: -73.924 },
    body: "The Bronx gets barely a mile and a half of the race — up First Avenue, across the Willis Avenue Bridge, along 138th Street and back over the Madison Avenue Bridge — but it is one of the course's great crowd scenes, and the bridge cameras catch the field at both crossings.",
  },
  {
    name: "Manhattan — Fifth Avenue and the Central Park finish",
    anchor: { lat: 40.79, lng: -73.955 },
    body: "Down Fifth Avenue through Harlem, along the park's edge, and into Central Park for the finish near West 67th Street. Manhattan's park-side finish is, honestly, the thinnest stretch for public cameras — the park itself has few public feeds — so the finish-area wall is the smallest of the five.",
  },
];

const FAQS = [
  {
    q: "When is the 2026 New York City Marathon?",
    a: "Sunday, November 1, 2026. The race starts on Staten Island at Fort Wadsworth, crosses the Verrazzano-Narrows Bridge, and runs through Brooklyn, Queens, the Bronx and Manhattan to the finish in Central Park.",
  },
  {
    q: "Can I watch the marathon itself on these cameras?",
    a: "You can watch the marathon's streets, not its broadcast. These are the city's public street and traffic cameras — the NYSDOT, 511NY and city networks — positioned along and around the course. They show the closed avenues, the crowds, the bridges and runners passing on the open street stretches. For the elite race and full television coverage, use the official broadcast; use this page to be on the course's streets yourself, in real time, from anywhere.",
  },
  {
    q: "Where along the course are cameras densest?",
    a: "In the outer boroughs. Of the public cameras within 2.5 km of the course, Brooklyn holds the most, followed by Queens and the Bronx; the Manhattan finish around Central Park has the fewest public feeds, because the park itself carries almost none. Citywide, WorldEye's directory holds 279 public cameras within 25 km of the course.",
  },
  {
    q: "Will the cameras show the road closures?",
    a: "Yes — that is half their value on race day. The course closes streets across all five boroughs for most of Sunday, and the same traffic cameras that watch the race also show which approaches, bridges and avenues are shut, stacked or flowing. Locals use them to route around the race; everyone else uses them to watch it happen.",
  },
  {
    q: "Are the NYC marathon cameras free to watch?",
    a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup. Tap any card to watch it live.",
  },
];

export default async function NycMarathon2026Page() {
  const records = await loadCountryChunk("united-states");
  const hits = camerasAlongRoute(records, COURSE, CORRIDOR_KM);

  const sections = BOROUGHS.map((b) => {
    const cams = hits
      .filter((h) => {
        let best: GeoAnchor = BOROUGHS[0].anchor;
        let bestD = Infinity;
        for (const s of BOROUGHS) {
          const d = distanceKm(h.cam, s.anchor);
          if (d < bestD) {
            bestD = d;
            best = s.anchor;
          }
        }
        return best === b.anchor;
      })
      .sort((a, z) => a.alongKm - z.alongKm);
    const captions: Record<string, string> = {};
    for (const h of cams) {
      captions[h.cam.id] = `${h.offKm.toFixed(1)} km from the course`;
    }
    return { ...b, cams: cams.map((h) => h.cam), captions };
  });

  const courseTotal = sections.reduce((n, s) => n + s.cams.length, 0);
  const cityTotal = countWithinKm(records, CITY_CENTER, 25);
  const parkTotal = countWithinKm(records, CENTRAL_PARK, 15);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "NYC Marathon 2026 — Live Cameras Along the Course",
    description:
      "Public street and traffic cameras along the 2026 New York City Marathon course, through all five boroughs.",
    url: `${BASE}/nyc-marathon-2026`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "New York City Marathon 2026",
    startDate: "2026-11-01",
    location: { "@type": "City", name: "New York City" },
    description:
      "The 2026 New York City Marathon runs Sunday, November 1, 2026, from Staten Island through all five boroughs to the finish in Central Park.",
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <JsonLd data={eventLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: "NYC Marathon 2026" },
        ]}
      />
      <Hero
        h1="NYC Marathon 2026 — Live Cameras Along the Course"
        sub="Sunday, November 1, 2026: the world's largest marathon takes over all five boroughs. Watch its streets live — free, no signup."
      />
      <StatRow
        stats={[
          { value: String(courseTotal), label: `Public cameras within ${CORRIDOR_KM} km of the course` },
          { value: "5", label: "Boroughs, start to finish" },
          { value: String(cityTotal), label: "Public cameras within 25 km of the course" },
        ]}
      />
      <Intro
        paragraphs={[
          "On Sunday, November 1, 2026, New York hands its streets to the marathon: more than 50,000 runners and a million-plus spectators, from the Verrazzano-Narrows Bridge at dawn to the Central Park finish in the afternoon. WorldEye's directory maps the city's public cameras along the whole route — the same NYSDOT, 511NY and city street feeds that watch these avenues every other day of the year, arranged here in race order so you can follow the day borough by borough.",
          "An honest framing before the walls: these are street and traffic cameras near the course, not the race's broadcast feeds. They will not track the leaders. What they show is the marathon as the city experiences it — avenues emptied and closed, bridges carrying a river of runners instead of cars, crowd walls on Fourth Avenue, and the long human stream still pouring through the Bronx and down Fifth Avenue hours after the winners finish. On race day that is a spectacle in its own right, and it is live.",
          `The selection below is geographic, not editorial: every public camera in the directory within ${CORRIDOR_KM} km of the course line, grouped by the borough it stands in — ${courseTotal} cameras in all, with another ${parkTotal} within 15 km of Central Park alone. Open any card to watch that street live.`,
        ]}
      />

      {sections.map((s) => (
        <section key={s.name} className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-2">{s.name}</h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{s.body}</p>
          <SkiCameraGrid
            cameras={s.cams}
            captions={s.captions}
            initial={12}
            emptyNote="No public cameras in the directory fall within the course corridor in this borough."
          />
        </section>
      ))}

      <AreaTable
        title="Cameras along the course — by borough"
        rows={sections.map((s) => ({ name: s.name.split(" — ")[0], count: s.cams.length }))}
        note={`Counts are public cameras within ${CORRIDOR_KM} km of the course line in the WorldEye directory, each counted once in its nearest borough. Race-day road closures apply across all five boroughs.`}
      />

      <HowTo
        title="How to follow race day on the cameras"
        steps={[
          "Start before the start: open the Staten Island wall in the morning to watch the Verrazzano approaches fill and the field stage at Fort Wadsworth.",
          "Work down the page in race order — Brooklyn's Fourth Avenue cameras catch the densest early crowds, the Queens bridge cameras the halfway crossings.",
          "Use the Bronx wall for the bridge crossings at Willis Avenue and Madison Avenue, where the field is at its most compressed.",
          "Finish in Manhattan: the Fifth Avenue and park-edge cameras follow the stream into Central Park, still flowing hours after the winners.",
          "Driving instead? The same cameras show which avenues and approaches the closures have shut — check before you set out.",
        ]}
      />

      <FaqSection title="NYC Marathon 2026 cameras — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More New York, live"
        links={[
          { label: "Live webcams in New York City", href: "/city-webcams/new-york-city" },
          { label: "Thanksgiving travel rush — live", href: "/thanksgiving-travel-2026" },
          { label: "Macy's Thanksgiving Day Parade 2026", href: "/macys-thanksgiving-parade-2026" },
          { label: "New York traffic cameras", href: "/us-traffic-cameras/new-york" },
          { label: "All live events", href: "/live-events" },
        ]}
      />

      <CtaRow backHref="/live-events" backLabel="All live events" />
    </PageShell>
  );
}
