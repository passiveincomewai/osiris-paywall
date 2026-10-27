import type { Metadata } from "next";
import Link from "next/link";
import { buildCorridor, CORRIDORS } from "@/lib/corridors";
import { loadCountryChunk } from "@/lib/explore-data";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  PageShell,
  type Faq,
} from "@/components/directory-page";

export const revalidate = 1800;

const title = "Interstate Traffic Cameras — Live Highway Cameras by Corridor";
const description =
  "Live traffic cameras organised along America's great interstates — I-95, I-90, I-80, I-70, I-40, I-35, I-15 and I-5 — in driving order, grouped by state, with live weather and plow counts where the feeds report them.";

export const metadata: Metadata = {
  title: `${title} | WorldEye`,
  description,
  alternates: { canonical: `${BASE}/interstate-cameras` },
  openGraph: { title, description, url: `${BASE}/interstate-cameras` },
};

const fmt = (n: number) => n.toLocaleString("en-US");

export default async function InterstateCamerasIndex() {
  const records = await loadCountryChunk("united-states");
  const builds = CORRIDORS.map((def) => buildCorridor(def, records)).filter((b) => b.qualifies);
  const grandTotal = builds.reduce((s, b) => s + b.total, 0);

  const faqs: Faq[] = [
    {
      q: "How are the cameras on each corridor page ordered?",
      a: "In driving order. Each camera's position is projected onto a reference path for its interstate, and cameras are listed by distance along the route, grouped into state segments. The route miles shown are measured along that path — an ordering aid, not official mileposts.",
    },
    {
      q: "Which interstates have pages?",
      a: `The eight corridors with real public camera density: ${builds
        .map((b) => b.def.short)
        .join(", ")}. A corridor earns a page only with at least 250 cameras near the route and at least three state segments with 10 or more — thinner routes stay off this index rather than getting a padded page.`,
    },
    {
      q: "Do the pages show road conditions?",
      a: "They show live evidence: the DOT camera feeds themselves, a current weather snapshot per state stretch when the weather feed returns one, and snow-plow counts where the live plow layer reports. No condition ratings are invented.",
    },
    {
      q: "Are the cameras free to watch?",
      a: "Yes. Every corridor page and every camera on it opens on the free WorldEye map — no account, no download.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: `${BASE}/interstate-cameras`,
    description,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: builds.length,
      itemListElement: builds.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${b.def.short} Traffic Cameras`,
        url: `${BASE}/interstate-cameras/${b.def.slug}`,
      })),
    },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb trail={[{ label: "Interstate Cameras" }]} />
      <Hero
        h1="Interstate Traffic Cameras"
        sub="America's great highways, watched end to end — cameras in driving order, state by state."
      />
      <StatRow
        stats={[
          { value: fmt(grandTotal), label: "cameras on these corridors" },
          { value: String(builds.length), label: "interstate corridors" },
          { value: "Free", label: "no account needed" },
        ]}
      />
      <Intro
        paragraphs={[
          "Most camera directories organise by city or state. These pages organise by the road itself: pick your interstate and the cameras run past in the order you will drive them, grouped into state segments with route-mile ranges, a live weather snapshot for each stretch, and snow-plow counts wherever the plow layer is reporting.",
          "Only corridors with real public camera density get a page — at least 250 cameras near the route and at least three solid state segments. That is why the plains stretches of otherwise famous highways are described honestly as sparse on their pages instead of padded with off-route cameras.",
        ]}
      />
      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Corridors</h2>
        <ul className="grid sm:grid-cols-2 gap-3">
          {builds.map((b) => (
            <li
              key={b.def.slug}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <Link
                href={`/interstate-cameras/${b.def.slug}`}
                className="font-bold text-lg text-[#00E5FF] hover:underline"
              >
                {b.def.short} Traffic Cameras
              </Link>
              <p className="text-sm text-white/55 mt-1">
                {b.def.from} → {b.def.to}
              </p>
              <p className="text-sm text-white/70 mt-2">
                {fmt(b.total)} cameras · {b.segments.length} state segments ·{" "}
                {b.sources.length} camera networks
              </p>
            </li>
          ))}
        </ul>
      </section>
      <FaqSection title="Interstate cameras — FAQ" faqs={faqs} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Live traffic cameras", href: "/live-traffic-cameras" },
          { label: "US traffic cameras by state", href: "/us-traffic-cameras" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />
    </PageShell>
  );
}
