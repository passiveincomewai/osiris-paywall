import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import ReportBuilderClient from "./ReportBuilderClient";

/**
 * WorldEye Fraud Radar — report builder (Phase 9, Payload
 * P9-C; PHASE9 §4.1 in its SHV-9 reduced form, §7.2).
 *
 * The reduced builder ships steps 1 (template — locked after
 * the report exists), 2 (pin — choose the exact inputs the
 * version is generated from) and 5 (export — handed to the
 * report home, where generation is queued per version).
 * ARRANGE (reorder/toggle beyond the template defaults) and
 * the live PREVIEW step are deferred by the cut line, and the
 * UI says so where a user would look for them; the version
 * page serves the worker-produced preview after generation,
 * labelled as a post-generation view. A version, once
 * created, is frozen — this page only ever creates NEW
 * versions. Owner-only account surface: not in
 * fraudRadarPublicPaths(), noindex, 404 with the flag off.
 */
export const metadata = {
  title: "Fraud Radar — Build a report version",
  description:
    "Pin the exact inputs for a new version of your Fraud Radar report and check them before you create it.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ReportBuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const { id } = await params;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link
          href={`/fraud-radar/reports/${id}`}
          className="text-sm text-cyan-300 hover:underline"
        >
          ← Back to the report
        </Link>
        <ReportBuilderClient reportId={id} />
      </div>
    </main>
  );
}
