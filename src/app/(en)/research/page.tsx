import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  Breadcrumb,
  Hero,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";

/**
 * /research — WorldEye's data hub (site-audit R77 designation).
 *
 * The three comparison surfaces are designated, here and on each hub:
 * this page is the DATA hub (the published datasets and the method
 * behind them), /best-live-webcam-sites is the RANKED GUIDE for webcam
 * sites, and /compare is the PAIR pages (head-to-heads). This hub
 * carries no rankings of its own — it links the datasets the rankings
 * are built from, and the two surfaces that rank and compare.
 */

export const metadata: Metadata = {
  title: "WorldEye Research — The Data Behind the Rankings",
  description:
    "WorldEye's research hub: the published camera-catalogue datasets, counts and methodology behind WorldEye's ranked guides and head-to-head comparisons — free to download and cite.",
  alternates: { canonical: `${BASE}/research` },
  openGraph: {
    title: "WorldEye Research — The Data Behind the Rankings",
    description:
      "The datasets and method behind WorldEye's rankings: the Live Camera Index, the camera-network report and the platform comparison study.",
    url: `${BASE}/research`,
    type: "website",
  },
};

export default function ResearchHubPage() {
  return (
    <PageShell>
      <Breadcrumb
        trail={[{ label: "Home", href: "/" }, { label: "Research" }]}
      />
      <Hero
        h1="WorldEye Research — the data behind the rankings"
        sub="This is WorldEye's data hub: the published datasets, counts and method that the rest of the site stands on. The rankings live in the ranked guides and the head-to-heads live in the pair comparisons — everything both of them claim is measured here first."
      />

      <section className="mt-12 max-w-3xl">
        <h2 className="text-xl md:text-2xl font-bold mb-5">How the surfaces fit together</h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            <strong className="text-white">Research (this page) is the data hub.</strong>{" "}
            It publishes the numbers themselves — the dated Live Camera Index
            snapshot, the camera-network report and the platform comparison
            study — with the counting method stated and the dataset free to
            download and cite.
          </p>
          <p>
            <strong className="text-white">The ranked guides do the ranking.</strong>{" "}
            Start with{" "}
            <Link href="/best-live-webcam-sites" className="text-[#00E5FF] hover:underline">
              the best live webcam sites, ranked
            </Link>{" "}
            — every position there rests on the catalogue counts published
            on this hub.
          </p>
          <p>
            <strong className="text-white">Compare holds the pair pages.</strong>{" "}
            The{" "}
            <Link href="/compare" className="text-[#00E5FF] hover:underline">
              head-to-head comparisons
            </Link>{" "}
            put two platforms side by side, feature by feature — the verdict
            surface, fed by the same research.
          </p>
        </div>
      </section>

      <RelatedLinks
        title="The datasets and studies"
        links={[
          { label: "Live Camera Index — the dated catalogue dataset", href: "/live-camera-index" },
          { label: "Camera network report — October 2026", href: "/reports/camera-network-2026-10" },
          { label: "Live camera platforms compared — the study", href: "/research/live-camera-platforms-compared" },
          { label: "Methodology — how WorldEye counts cameras", href: "/methodology" },
          { label: "Best live webcam sites — the ranked guide", href: "/best-live-webcam-sites" },
          { label: "Compare — the head-to-head pair pages", href: "/compare" },
        ]}
      />
      <CtaRow backHref="/" backLabel="Open the live globe" />
    </PageShell>
  );
}
