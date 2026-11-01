// /camera-sources — the camera source directory: every publishing source
// behind the WorldEye globe, with per-source camera counts, attribution
// framing and the full counting methodology.
//
// PRESERVED CONTENT: this page is the directory that lived at /partners
// until 2026-11-01, relocated intact when /partners became the strategic
// partnerships page (Jameson's order). The source table, the snapshot
// figures, the attribution copy and the methodology are unchanged; the
// old page's partnership-invitation sections became pointers to
// /partners, where the partnership programme now lives. Being listed
// here is NOT a partnership and never has been.
import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  FaqJsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  FaqSection,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Faq,
} from "@/components/directory-page";
import {
  SOURCE_COUNTS,
  SOURCES_SNAPSHOT_DATE,
  TOTAL_UNIQUE_CAMERAS as TOTAL,
} from "./sources-data";

const fmt = (n: number) => n.toLocaleString("en-US");
const SOURCE_TOTAL = SOURCE_COUNTS.length;
const TOP = [...SOURCE_COUNTS].sort((a, b) => b[1] - a[1])[0];
const TOP10 = [...SOURCE_COUNTS]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .reduce((s, [, c]) => s + c, 0);
const pctOf = (n: number, d: number) => ((n / d) * 100).toFixed(1);

export const metadata: Metadata = {
  title: "Camera Sources & Data Directory — WorldEye",
  description:
    "Every publishing source behind the WorldEye globe: per-source camera counts, attribution and the counting methodology — transport departments, agencies, city portals and webcam networks.",
  alternates: { canonical: `${BASE}/camera-sources` },
  openGraph: {
    title: "WorldEye Camera Sources & Data Directory",
    description:
      "The complete directory of sources behind the WorldEye live camera globe — counts, attribution and method, from a dated catalogue snapshot.",
    url: `${BASE}/camera-sources`,
    siteName: "WorldEye",
    type: "website",
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: "WorldEye — the live camera globe" }],
  },
};

const FAQS: Faq[] = [
  {
    q: "A source is listed here. Is it a WorldEye partner?",
    a: "No. This directory lists the publishers whose public feeds the catalogue indexes; a listing records where a camera comes from, nothing more. It is not a partnership, not an endorsement in either direction, and not a claim that the source has any relationship with WorldEye. Partners — organisations with an actual agreement — are handled on the partnerships page, and none are named there until an agreement exists.",
  },
  {
    q: "How does an organisation partner with WorldEye?",
    a: "Partnerships now start on the strategic partnerships page (/partners): sixteen categories of collaboration, a directory of the opportunities WorldEye is actively seeking, and an application form the team reviews. Camera networks and agencies can also start via the contact page; commercial catalogue licensing is the Enterprise tier; universities and researchers use the research access page. To be named as a partner, an organisation needs an agreement — a signed licensing, data or distribution arrangement. Enquiries, trials and directory listings are not partnerships.",
  },
  {
    q: "Where do the cameras on WorldEye actually come from?",
    a: `From the ${SOURCE_TOTAL} publishing sources in the table on this page: state and national transport departments, river and flood agencies, aviation weather services, city open-data portals, webcam directories and individual operators. WorldEye operates no cameras of its own; it aggregates feeds the operators publish publicly and displays each with its attribution intact.`,
  },
  {
    q: "How are the counts on this page calculated?",
    a: `They are a dated snapshot (${SOURCES_SNAPSHOT_DATE}) of the production catalogue: 90,700 records fetched in full, deduplicated by camera ID to ${fmt(TOTAL)} unique cameras, grouped by the catalogue's own source label. Four regional collections were still loading when the snapshot was taken, so a few networks may be slightly understated. The figures stay published as that snapshot instead of being silently replaced.`,
  },
  {
    q: "Can a source have its listing corrected or removed?",
    a: "Yes. Operators who want a name, link or attribution corrected — or their feeds removed from the catalogue — can reach WorldEye through the contact page, and corrections are made without argument. Sources also control redistribution through their terms: feeds whose terms do not allow it are never served through the Enterprise feed or the public embed.",
  },
  {
    q: "May I republish these cameras myself?",
    a: "Only where the source's own terms allow it — WorldEye's aggregation does not change the underlying rights, and Windy-sourced feeds are excluded from redistribution entirely. WorldEye's Enterprise tier and public embed only ever serve the cameras each source's terms clear for redistribution. For anything else, ask the source.",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl md:text-2xl font-bold mb-5">{children}</h2>;
}

export default function CameraSourcesPage() {
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "WorldEye camera sources & data directory",
    url: `${BASE}/camera-sources`,
    description:
      "Every publishing source behind the WorldEye globe, with per-source camera counts and the counting methodology.",
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
  };
  return (
    <PageShell>
      <JsonLd data={collectionLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[{ label: "Home", href: "/" }, { label: "Camera Sources" }]}
      />
      <Hero
        h1="Camera Sources & Data Directory"
        sub={`WorldEye operates no cameras. Its globe is assembled from the public feeds of ${SOURCE_TOTAL} networks — transport departments, river and flood agencies, aviation weather services, city open-data portals and webcam directories. This page lists every one of them with its camera count.`}
      />
      <StatRow
        stats={[
          { value: fmt(SOURCE_TOTAL), label: "publishing sources indexed" },
          { value: fmt(TOTAL), label: `cameras in the ${SOURCES_SNAPSHOT_DATE} snapshot` },
          { value: fmt(TOP[1]), label: `largest source — ${TOP[0]}` },
        ]}
      />
      <p className="text-center text-xs text-white/30 mt-4">
        Source counts are a dated catalogue snapshot: {SOURCES_SNAPSHOT_DATE}.{" "}
        <Link href="/live-camera-index" className="underline hover:text-white/60">
          How WorldEye counts cameras
        </Link>
      </p>

      <section className="mt-12 rounded-3xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] p-6">
        <h2 className="font-semibold text-white/90">This directory moved here from /partners</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Until November 2026 this page lived at /partners. That URL is now WorldEye&apos;s{" "}
          <Link href="/partners" className="text-[#D4AF37] hover:underline">
            strategic partnerships page
          </Link>{" "}
          — who we build with, the opportunities we&apos;re actively seeking, and the application
          form. Nothing about this directory changed in the move: same snapshot, same counts, same
          methodology. And the standing rule is unchanged on both pages: a listing here is not a
          partnership, and no organisation is named as a partner anywhere on WorldEye without an
          agreement in place.
        </p>
      </section>

      <section className="mt-12">
        <SectionTitle>The networks behind the map</SectionTitle>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            The table below is the complete source directory for the {SOURCES_SNAPSHOT_DATE}{" "}
            snapshot: every source label in the production catalogue, with the number of unique
            cameras indexed under it. The labels are the catalogue&apos;s own — most name the
            publishing agency or network directly; labels beginning “OpenCCTV /” name a collection
            assembled by the OpenCCTV open-data project from the publisher named after the slash.
          </p>
          <p>
            The concentration is worth seeing plainly: the ten largest sources account for{" "}
            {fmt(TOP10)} cameras — {pctOf(TOP10, TOTAL)}% of the snapshot — and almost all of them
            are public infrastructure agencies. The long tail runs to single-camera sources: a zoo,
            an observatory, a canal. Every source is displayed on the globe with its attribution
            intact, under its own terms.
          </p>
          <p>
            <strong className="text-white">What listing means — and does not.</strong> WorldEye
            aggregates these feeds because their operators publish them publicly. A listing is not
            a partnership, not an endorsement by the source, and not a claim by WorldEye to own or
            operate anything. Where a source&apos;s terms allow redistribution, eligible cameras
            can also appear in the Enterprise feed and the free public embed; where they do not —
            Windy-sourced feeds are excluded from redistribution entirely — the cameras stay
            view-only on the globe. Operators who want a listing corrected or removed can reach us
            through the{" "}
            <Link href="/contact" className="text-[#00E5FF] hover:underline">
              contact page
            </Link>
            .
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 overflow-hidden mt-6">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wider text-white/40 border-b border-white/10 bg-[#0a0e18]">
                  <th className="px-5 py-3 font-semibold">Publishing source (catalogue label)</th>
                  <th className="px-5 py-3 font-semibold text-right">Cameras indexed</th>
                  <th className="px-5 py-3 font-semibold text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {SOURCE_COUNTS.map(([name, count]) => (
                  <tr key={name} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-2.5">{name}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-[#D4AF37]">{fmt(count)}</td>
                    <td className="px-5 py-2.5 text-right text-white/45">{pctOf(count, TOTAL)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-white/35 mt-3">
          All {SOURCE_TOTAL} source labels in the production catalogue, snapshot{" "}
          {SOURCES_SNAPSHOT_DATE}. Full method below.
        </p>
      </section>

      <section className="mt-12">
        <SectionTitle>How these counts are counted</SectionTitle>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            On {SOURCES_SNAPSHOT_DATE} the production catalogue — the same data path the globe
            itself reads — was fetched in full: 90,700 camera records across its regional
            collections. Records were deduplicated by camera ID, leaving {fmt(TOTAL)} unique
            cameras, then grouped by the catalogue&apos;s source label. Four regional collections
            (US Central, Türkiye, NYC DOT and Mississippi) were still loading when the snapshot was
            taken, so a handful of networks may be slightly understated; the figures are published
            as this dated snapshot rather than silently replaced.
          </p>
          <p>
            These are catalogue index counts — what WorldEye has assembled and can serve — and
            they are a different measure from the live globe&apos;s public camera headline, which
            is defined on the{" "}
            <Link href="/methodology" className="text-[#00E5FF] hover:underline">
              methodology page
            </Link>
            . The{" "}
            <Link href="/live-camera-index" className="text-[#00E5FF] hover:underline">
              Live Camera Index
            </Link>{" "}
            breaks the same catalogue down by country, city and US state network, with a
            downloadable dataset.
          </p>
        </div>
      </section>

      <FaqSection title="Sources — questions" faqs={FAQS} />

      <section className="mt-12">
        <SectionTitle>Operate cameras? Work with WorldEye</SectionTitle>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            If you publish public cameras — a transport department, a river or flood agency, a
            city open-data portal, any network or venue — the{" "}
            <Link href="/partners" className="text-[#00E5FF] hover:underline">
              partnerships page
            </Link>{" "}
            sets out how a closer collaboration works: governed listing under your terms, correct
            naming and attribution, and your redistribution rules enforced. Commercial catalogue
            licensing is the{" "}
            <Link href="/enterprise" className="text-[#00E5FF] hover:underline">
              Enterprise tier
            </Link>
            ; universities and researchers use{" "}
            <Link href="/research-access" className="text-[#00E5FF] hover:underline">
              research access
            </Link>
            .
          </p>
        </div>
      </section>

      <RelatedLinks
        title="Related pages"
        links={[
          { label: "Strategic Partnerships", href: "/partners" },
          { label: "Live Camera Index", href: "/live-camera-index" },
          { label: "Methodology", href: "/methodology" },
          { label: "WorldEye Enterprise", href: "/enterprise" },
          { label: "Research access", href: "/research-access" },
          { label: "About WorldEye", href: "/about" },
          { label: "Contact", href: "/contact" },
        ]}
      />
      <CtaRow backHref="/about" backLabel="About WorldEye" />
    </PageShell>
  );
}
