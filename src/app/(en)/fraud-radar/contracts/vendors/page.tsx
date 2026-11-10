import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  contractsConfig,
  searchContractVendors,
  MEASURE_NOTE,
} from "@/lib/fraud-radar/contracts-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — contract vendor search (Phase 5). Search by UEI
 * prefix or by vendor-name tokens over the published vendor stubs.
 * Amounts are award-cumulative snapshot totals summed over each
 * vendor's published awards. Absence from results means the vendor
 * does not appear in the published contract award files — never
 * zero activity.
 */
export const metadata = {
  title: "Fraud Radar — Contract Vendor Search",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ContractVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  // Results are pre-awaited so the page's element tree stays
  // synchronously renderable (the Phase 6 B2 pattern).
  const resultsSection =
    contractsConfig() !== null && q.length > 0
      ? await renderVendorResults(q, page)
      : null;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/contracts" className="text-sm text-cyan-300 hover:underline">
          ← Federal Contracts
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Search contract vendors</h1>
        <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
          Search by UEI (or UEI prefix) or by vendor name. {MEASURE_NOTE}
        </p>
        <form method="get" className="mt-6 flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="UEI or vendor name…"
            className="min-w-64 flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-white placeholder:text-white/35"
          />
          <button
            type="submit"
            className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Search
          </button>
        </form>

        {contractsConfig() === null ? (
          <div className="mt-10">
            <NotPublishedYet what="The contracts vendor dataset" />
          </div>
        ) : q.length === 0 ? (
          <p className="mt-8 text-white/50">Enter a UEI or a vendor name to search the published vendor index.</p>
        ) : (
          resultsSection
        )}
      </div>
    </main>
  );
}

async function renderVendorResults(q: string, page: number) {
  const result = await searchContractVendors(q, { page, pageSize: 25 });
  if (result.error === "unavailable") {
    return (
      <div className="mt-10">
        <NotPublishedYet what="The contracts vendor dataset" />
      </div>
    );
  }
  if (result.error === "too_short") {
    return <p className="mt-8 text-white/60">Enter at least 3 characters of a UEI or name.</p>;
  }
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <section className="mt-8">
      <p className="text-sm text-white/50">
        {formatCount(result.total)} vendor{result.total === 1 ? "" : "s"} matched
        ({result.mode === "uei" ? "UEI search" : "name search"}) · page {result.page} of {pages}
      </p>
      <ul className="mt-4 space-y-3">
        {result.results.map((s) => (
          <li key={s.uei} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Link
              href={`/fraud-radar/contracts/vendors/${s.uei}`}
              className="font-semibold text-cyan-200 hover:underline"
            >
              {s.name ?? `UEI ${s.uei}`}
            </Link>
            <p className="mt-1 text-sm text-white/55">
              UEI {s.uei}
              {s.state ? ` · ${s.state}` : ""} · {formatCount(s.awards)} awards ·{" "}
              {formatUsd(s.totalDollarsObligated)} obligated (award-cumulative)
            </p>
          </li>
        ))}
      </ul>
      {result.total === 0 && (
        <p className="mt-4 text-white/60">
          No vendor in the published contract awards matches that search.
          Absence means the vendor does not appear in the published
          files — it is not a statement of zero activity anywhere else.
        </p>
      )}
      <div className="mt-6 flex gap-3 text-sm">
        {page > 1 && (
          <Link
            href={`/fraud-radar/contracts/vendors?q=${encodeURIComponent(q)}&page=${page - 1}`}
            className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
          >
            ← Previous
          </Link>
        )}
        {page < pages && (
          <Link
            href={`/fraud-radar/contracts/vendors?q=${encodeURIComponent(q)}&page=${page + 1}`}
            className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
          >
            Next →
          </Link>
        )}
      </div>
    </section>
  );
}
