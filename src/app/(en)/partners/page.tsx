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
import { SOURCE_COUNTS, SOURCES_SNAPSHOT_DATE } from "./sources-data";

/**
 * Partners & Data Sources — two clearly separated tiers:
 *
 * 1. PARTNERS: an invitation section ONLY. No organisation is named as a
 *    WorldEye partner anywhere on this page, because no signed/evidenced
 *    agreement exists to point to (verified by grep of codebase + docs +
 *    notes, 2026-10-27 — see REPORT.md in the build workspace). Organisations
 *    get named here only once an agreement is in place.
 *
 * 2. DATA SOURCES: the public networks whose feeds the camera catalogue
 *    indexes, with per-source counts from ./sources-data.ts (a dated
 *    snapshot of the production catalogue, deduplicated by camera id and
 *    grouped by the catalogue's own source label). Being listed is NOT a
 *    partnership and NOT an endorsement in either direction — the copy
 *    says so explicitly, on the page and in the data file's header.
 *    Every figure below is derived from SOURCE_COUNTS in code, so the
 *    prose cannot drift from the published table.
 */

const fmt = (n: number) => n.toLocaleString("en-US");
const TOTAL = SOURCE_COUNTS.reduce((n, [, c]) => n + c, 0);
const SOURCE_TOTAL = SOURCE_COUNTS.length;
const TOP = SOURCE_COUNTS[0];
const TOP10 = SOURCE_COUNTS.slice(0, 10).reduce((n, [, c]) => n + c, 0);
const pctOf = (n: number, total: number) => Math.round((n / total) * 1000) / 10;

export const metadata: Metadata = {
  title: "Partners & Data Sources — WorldEye",
  description: `WorldEye's globe is assembled from ${SOURCE_TOTAL} public camera networks — transport departments, river and flood agencies, aviation weather services and open-data portals. The full source directory with per-network camera counts (snapshot ${SOURCES_SNAPSHOT_DATE}), and how organisations can partner with WorldEye.`,
  alternates: { canonical: `${BASE}/partners` },
  openGraph: {
    title: "Partners & Data Sources | WorldEye",
    description: `Every public network behind the WorldEye catalogue — ${fmt(TOTAL)} cameras across ${SOURCE_TOTAL} sources, counted and dated — plus how to partner with WorldEye.`,
    url: `${BASE}/partners`,
    type: "website",
  },
};

const FAQS: Faq[] = [
  {
    q: "Is a network listed here a WorldEye partner?",
    a: "No. This page lists the public sources whose feeds the WorldEye catalogue indexes. Indexing a public feed is not a partnership, and it is not an endorsement in either direction — a listed network has not endorsed WorldEye, and WorldEye claims no relationship with it beyond aggregating its public cameras with attribution. Organisations are named as partners only when an actual agreement exists, and none are listed today.",
  },
  {
    q: "How can my organisation partner with WorldEye?",
    a: "Three routes exist today. Camera networks and agencies can work with us on how their public feeds are presented and attributed on the globe. Companies can license the catalogue through WorldEye Enterprise — a key-gated camera-feed API and embed player, limited to the cameras whose source terms allow redistribution. Researchers and educators can ask about access to the catalogue's public metadata. Start any of them from the contact page; partnership listings on this page follow signed agreements, not enquiries.",
  },
  {
    q: "Where do WorldEye's cameras come from?",
    a: `From ${SOURCE_TOTAL} public publishing sources: state and national transport departments, river and flood agencies, aviation weather services, city open-data portals and public webcam directories. WorldEye does not operate the cameras — it assembles the public feeds into one searchable catalogue and one live globe. The largest single source in the ${SOURCES_SNAPSHOT_DATE} snapshot is ${TOP[0]}, with ${fmt(TOP[1])} cameras.`,
  },
  {
    q: "How are the camera counts on this page calculated?",
    a: `They are an index snapshot, counted on ${SOURCES_SNAPSHOT_DATE} from the same production catalogue the globe serves: every regional collection was fetched, camera records were deduplicated by camera ID, and the unique cameras were grouped by the catalogue's own source label — ${fmt(TOTAL)} unique cameras in all. Four regional collections (US Central, Türkiye, NYC DOT and Mississippi) were still loading when the snapshot was taken, so a few networks may be slightly understated. Counts are re-issued as dated snapshots rather than silently rewritten.`,
  },
  {
    q: "We are a listed source. Can our listing be corrected or removed?",
    a: "Yes. If your network's name, count or attribution looks wrong — or you would rather your public feeds were not indexed — contact us and we will correct or remove the listing. The feeds aggregated here are published publicly by their operators; WorldEye's index is a directory of those publications, and source operators' wishes govern.",
  },
  {
    q: "Can other sites redistribute these camera feeds through WorldEye?",
    a: "Only where the source's terms allow it. WorldEye tracks redistribution eligibility per camera in a rights registry: the Enterprise feed API and the free public embed serve only eligible cameras, and some sources — Windy-sourced feeds among them — are excluded from redistribution entirely, however they are labelled in the catalogue. Indexing a feed for the WorldEye globe and redistributing it are different acts, and the registry treats them differently.",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl md:text-2xl font-bold mb-5">{children}</h2>;
}

export default function PartnersPage() {
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Partners & Data Sources — WorldEye",
    description: `Directory of the ${SOURCE_TOTAL} public camera networks whose feeds the WorldEye catalogue indexes, with per-source camera counts from a snapshot dated ${SOURCES_SNAPSHOT_DATE}, and how organisations can partner with WorldEye.`,
    url: `${BASE}/partners`,
    dateModified: "2026-10-27",
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
  };

  return (
    <PageShell>
      <JsonLd data={collectionLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[{ label: "Home", href: "/" }, { label: "Partners & Data Sources" }]}
      />
      <Hero
        h1="Partners & Data Sources"
        sub={`WorldEye operates no cameras. Its globe is assembled from the public feeds of ${SOURCE_TOTAL} networks — transport departments, river and flood agencies, aviation weather services, city open-data portals and webcam directories. This page lists every one of them with its camera count, and explains how an organisation becomes an actual partner.`}
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

      <section className="mt-12">
        <SectionTitle>Partner with WorldEye</SectionTitle>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            <strong className="text-white">This section is an open invitation — deliberately.</strong>{" "}
            WorldEye does not currently list any organisation as a partner, because a partner is
            someone with an agreement in place, and we would rather publish an honest invitation
            than a wall of logos we have not earned. When agreements are signed, the organisations
            will be named here, with the nature of each partnership stated.
          </p>
          <p>Three kinds of partnership exist today:</p>
          <ul className="space-y-3">
            <li>
              <strong className="text-white">Camera networks &amp; agencies.</strong> If you
              publish public cameras — a transport department, a river or flood agency, a city
              open-data portal — partnering means working with us on how your feeds appear on the
              globe: correct naming, attribution and a link back to your own service, in front of
              the globe&apos;s live audience. Start via the{" "}
              <Link href="/contact" className="text-[#00E5FF] hover:underline">
                contact page
              </Link>
              .
            </li>
            <li>
              <strong className="text-white">Enterprise licensing.</strong> WorldEye Enterprise is
              a self-serve tier ($999/year) that licenses the catalogue itself: a key-gated
              camera-feed API and an embed player, restricted to the cameras each source&apos;s
              terms allow to be redistributed. See{" "}
              <Link href="/enterprise" className="text-[#00E5FF] hover:underline">
                WorldEye Enterprise
              </Link>{" "}
              for what the tier includes.
            </li>
            <li>
              <strong className="text-white">Research &amp; education.</strong> Universities,
              educators and researchers can request access to the catalogue&apos;s public metadata
              for teaching and study, subject to the underlying source terms. The{" "}
              <Link href="/research-access" className="text-[#00E5FF] hover:underline">
                research access page
              </Link>{" "}
              sets out what is available and how to ask.
            </li>
          </ul>
          <p>
            To be named on this page as a partner, an organisation needs an agreement — a signed
            licensing, data or distribution arrangement. Enquiries, trials and listings in the
            source directory below are not partnerships and are never presented as such.
          </p>
        </div>
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

      <FaqSection title="Partners & sources — questions" faqs={FAQS} />

      <section className="mt-12">
        <SectionTitle>Partner with WorldEye — the three routes, again</SectionTitle>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <ul className="space-y-3">
            <li>
              <strong className="text-white">Camera networks &amp; agencies.</strong> If you
              publish public cameras — a transport department, a river or flood agency, a city
              open-data portal — partnering means working with us on how your feeds appear on the
              globe: correct naming, attribution and a link back to your own service, in front of
              the globe&apos;s live audience. Start via the{" "}
              <Link href="/contact" className="text-[#00E5FF] hover:underline">
                contact page
              </Link>
              .
            </li>
            <li>
              <strong className="text-white">Enterprise licensing.</strong> WorldEye Enterprise is
              a self-serve tier ($999/year) that licenses the catalogue itself: a key-gated
              camera-feed API and an embed player, restricted to the cameras each source&apos;s
              terms allow to be redistributed. See{" "}
              <Link href="/enterprise" className="text-[#00E5FF] hover:underline">
                WorldEye Enterprise
              </Link>{" "}
              for what the tier includes.
            </li>
            <li>
              <strong className="text-white">Research &amp; education.</strong> Universities,
              educators and researchers can request access to the catalogue&apos;s public metadata
              for teaching and study, subject to the underlying source terms. The{" "}
              <Link href="/research-access" className="text-[#00E5FF] hover:underline">
                research access page
              </Link>{" "}
              sets out what is available and how to ask.
            </li>
          </ul>
        </div>
      </section>

      <RelatedLinks
        title="Related pages"
        links={[
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
