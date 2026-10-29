import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { listHomeHealthAgencies, CARE_COMPARE_VERSION } from "@/lib/fraud-radar/care-neon";
import { formatCount } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — home health directory (Phase 3). CMS Care Compare's
 * listing of Medicare-certified home health agencies. The star is
 * CMS's own published quality-of-care rating, labelled as CMS's —
 * never a Fraud Radar score. A missing star means CMS published
 * none for the agency, not a zero rating.
 */
export const metadata = {
  title: "Fraud Radar — Home Health Directory (Care Compare)",
  description:
    "Search CMS-certified home health agencies from Care Compare: services offered, ownership, certification dates and CMS's own quality star ratings.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const SERVICES: [string, string][] = [
  ["offersNursing", "Nursing"],
  ["offersPhysicalTherapy", "Physical therapy"],
  ["offersOccupationalTherapy", "Occupational therapy"],
  ["offersSpeechPathology", "Speech pathology"],
  ["offersMedicalSocial", "Medical social"],
  ["offersHomeHealthAide", "Home health aide"],
];

export default async function HomeHealthDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; page?: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const state = (sp.state ?? "").trim().toUpperCase();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const data = await listHomeHealthAgencies({
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
    return `/fraud-radar/care/home-health?${u.toString()}`;
  };

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/care" className="text-sm text-cyan-300 hover:underline">
          ← Care Programs
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Home health directory</h1>
        <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
          Medicare-certified home health agencies as published by CMS Care
          Compare (refresh {CARE_COMPARE_VERSION}), including the services
          each agency reports offering and CMS&apos;s own quality-of-care
          star rating where CMS publishes one.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {data === null ? (
          <div className="mt-10">
            <NotPublishedYet what="The home health directory" />
          </div>
        ) : (
          <>
            <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
              <label className="text-sm text-white/60">
                Agency name
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="e.g. Home Health"
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
              {formatCount(data.total)} agencies · page {page} of {formatCount(totalPages)}
            </p>
            <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
              {data.rows.map((a) => (
                <li key={a.ccn} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{a.providerName}</p>
                    {a.qualityStarRating !== null ? (
                      <span className="text-sm text-amber-200">
                        CMS quality star: {a.qualityStarRating.toFixed(1)} / 5
                      </span>
                    ) : (
                      <span className="text-sm text-white/40">
                        CMS quality star: not published
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-white/50">
                    {[a.address, a.city, a.state].filter(Boolean).join(", ")}
                    {a.zipCode ? ` ${a.zipCode}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    CCN {a.ccn}
                    {a.ownershipType ? ` · ${a.ownershipType}` : ""}
                    {a.certificationDate
                      ? ` · Medicare certified since ${a.certificationDate}`
                      : " · certification date not published"}
                    {a.phone ? ` · ${a.phone}` : ""}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-2">
                    {SERVICES.map(([key, label]) =>
                      a[key as keyof typeof a] === true ? (
                        <span
                          key={key}
                          className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-white/70"
                        >
                          {label}
                        </span>
                      ) : null,
                    )}
                  </p>
                  {a.qualityStarFootnote ? (
                    <p className="mt-1 text-xs text-white/40">
                      CMS footnote: {a.qualityStarFootnote}
                    </p>
                  ) : null}
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
            <p className="mt-8 max-w-3xl text-sm text-white/50 leading-relaxed">
              The star rating is CMS&apos;s own published quality-of-care
              measure, shown with CMS&apos;s footnote where one exists. It
              is not a Fraud Radar score, and an agency with no published
              star is unrated by CMS — not rated zero.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
