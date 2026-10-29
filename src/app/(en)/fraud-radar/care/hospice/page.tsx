import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { listHospiceProviders, CARE_COMPARE_VERSION } from "@/lib/fraud-radar/care-neon";
import { formatCount } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — hospice directory (Phase 3). CMS Care Compare's
 * listing of Medicare-certified hospices, republished with its
 * refresh version. Certification is the federal fact Care Compare
 * carries; state license status lives with state regulators and is
 * not asserted here. Name-key screening candidates against the LEIE
 * are a pipeline research artifact, never matches — this directory
 * shows the certification record only.
 */
export const metadata = {
  title: "Fraud Radar — Hospice Directory (Care Compare)",
  description:
    "Search CMS-certified hospice providers from Care Compare: addresses, ownership and Medicare certification dates.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function HospiceDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; page?: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const state = (sp.state ?? "").trim().toUpperCase();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const data = await listHospiceProviders({
    q: q || undefined,
    state: state || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (state) u.set("state", state);
    u.set("page", String(p));
    return `/fraud-radar/care/hospice?${u.toString()}`;
  };

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/care" className="text-sm text-cyan-300 hover:underline">
          ← Care Programs
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Hospice directory</h1>
        <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
          Medicare-certified hospices as published by CMS Care Compare
          (refresh {CARE_COMPARE_VERSION}). Certification dates are the
          federal record; current state licence status is held by state
          regulators and is not asserted here.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {data === null ? (
          <div className="mt-10">
            <NotPublishedYet what="The hospice directory" />
          </div>
        ) : (
          <>
            <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
              <label className="text-sm text-white/60">
                Provider name
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="e.g. Hospice"
                  className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white placeholder:text-white/35"
                />
              </label>
              <label className="text-sm text-white/60">
                State (2-letter)
                <input
                  type="text"
                  name="state"
                  defaultValue={state}
                  maxLength={2}
                  placeholder="UT"
                  className="mt-1 block w-24 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white placeholder:text-white/35"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-cyan-400 px-5 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Search
              </button>
            </form>

            <p className="mt-6 text-sm text-white/50">
              {formatCount(data.total)} hospices · page {page} of {formatCount(totalPages)}
            </p>
            <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
              {data.rows.map((h) => (
                <li key={h.ccn} className="px-5 py-4">
                  <p className="font-semibold">{h.facilityName}</p>
                  <p className="mt-1 text-sm text-white/50">
                    {[h.addressLine1, h.addressLine2, h.city, h.state]
                      .filter(Boolean)
                      .join(", ")}
                    {h.zipCode ? ` ${h.zipCode}` : ""}
                    {h.county ? ` · ${h.county} County` : ""}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    CCN {h.ccn}
                    {h.ownershipType ? ` · ${h.ownershipType}` : ""}
                    {h.certificationDate
                      ? ` · Medicare certified since ${h.certificationDate}`
                      : " · certification date not published"}
                    {h.phone ? ` · ${h.phone}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <nav className="mt-5 flex gap-3 text-sm">
              {page > 1 && (
                <Link href={qs(page - 1)} className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5">
                  ← Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={qs(page + 1)} className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5">
                  Next →
                </Link>
              )}
            </nav>
          </>
        )}
      </div>
    </main>
  );
}
