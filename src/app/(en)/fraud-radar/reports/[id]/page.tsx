import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import ReportDetailClient from "./ReportDetailClient";

/**
 * WorldEye Fraud Radar — report home (Phase 9, Payload P9-C;
 * PHASE9 §5.1). The version list for one of the caller's
 * reports: each version's pin-diff summary, validation
 * verdict, content hash and per-format downloads, plus the
 * "new version from current data" path into the builder —
 * a refresh is a decision that creates a new version, never
 * a side effect of opening the report (§2.3.2). Owner-only
 * account surface: not in fraudRadarPublicPaths(), noindex,
 * and 404 with the flag off, like every Fraud Radar page.
 */
export const metadata = {
  title: "Fraud Radar — Report",
  description:
    "One of your Fraud Radar reports: its frozen versions, validation verdicts, reproducibility hashes and downloads.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();
  const { id } = await params;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link
          href="/fraud-radar/reports"
          className="text-sm text-cyan-300 hover:underline"
        >
          ← Report Studio
        </Link>
        <ReportDetailClient reportId={id} />
      </div>
    </main>
  );
}
