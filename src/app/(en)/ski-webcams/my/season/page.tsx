import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Snowflake } from "lucide-react";
import { auth } from "@/auth";
import SiteFooter from "@/components/SiteFooter";
import PowderPassPromo from "@/components/PowderPassPromo";
import { powderPassEnabled } from "@/lib/ski/access";
import { resolveSkiAccess } from "@/lib/ski/access-server";
import { listFollowedSlugs } from "@/lib/ski/follows";
import {
  fetchArchiveSnowfall,
  monthlyBreakdown,
  seasonWindow,
} from "@/lib/ski/openmeteo";
import { getSkiResort, type SkiResort } from "@/lib/ski-resorts";

export const metadata: Metadata = {
  title: "Season Snowfall — Your Followed Resorts",
  description:
    "Powder Pass members: modelled season-to-date snowfall and monthly breakdown for the resorts you follow, from Open-Meteo reanalysis.",
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/45 mb-10">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/ski-webcams" className="hover:text-white transition">Ski webcams</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/ski-webcams/my" className="hover:text-white transition">My Powder</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">Season snowfall</span>
        </nav>
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Snowflake className="w-3.5 h-3.5" /> SEASON SNOWFALL
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Season snowfall tracker
          </h1>
          <p className="mt-4 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-5 py-3 text-sm text-white/75">
            Modelled (Open-Meteo reanalysis) — not measured. These totals come
            from the ERA5 weather model at each resort&apos;s coordinates, not
            from a snow stake or the resort&apos;s own report.
          </p>
        </div>
        {children}
      </div>
      <SiteFooter />
    </main>
  );
}

export default async function SeasonSnowfallPage() {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            The season snowfall tracker covers the resorts you follow.
            Sign in to see yours.
          </p>
          <Link
            href="/signin"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  const hasAccess = await resolveSkiAccess(userId).catch(() => false);
  if (!hasAccess) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            The season snowfall tracker is a Powder Pass feature. Powder Pass
            is WorldEye&apos;s ski-only membership, and VIP Pro annual already
            includes it — Weekly and Monthly Pro do not.
          </p>
        </div>
        {powderPassEnabled(process.env) && (
          <div className="max-w-4xl mx-auto">
            <PowderPassPromo />
          </div>
        )}
      </Shell>
    );
  }

  const slugs = await listFollowedSlugs(userId).catch(() => [] as string[]);
  const resorts = slugs
    .map((s) => getSkiResort(s))
    .filter((r): r is SkiResort => !!r);

  if (resorts.length === 0) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            You haven&apos;t followed any resorts yet, so there is no season
            to track. Follow a resort and its modelled season snowfall will
            collect here.
          </p>
          <Link
            href="/ski-webcams"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Browse the ski resort directory
          </Link>
        </div>
      </Shell>
    );
  }

  const fetchedAt = new Date();
  const cards = await Promise.all(
    resorts.map(async (resort) => {
      const win = seasonWindow(resort.lat, fetchedAt);
      const summary = await fetchArchiveSnowfall(
        resort.lat,
        resort.lng,
        win.startDate,
        win.endDate,
      );
      return {
        resort,
        window: win,
        summary,
        months: summary ? monthlyBreakdown(summary.days) : [],
      };
    }),
  );

  return (
    <Shell>
      <p className="mt-4 text-center text-white/55">
        {cards.length} followed {cards.length === 1 ? "resort" : "resorts"} —
        modelled season-to-date totals, fetched{" "}
        {fetchedAt.toISOString().slice(0, 16).replace("T", " ")} UTC.
      </p>
      <div className="mt-12 space-y-14">
        {cards.map(({ resort: r, window: win, summary, months }) => {
          const maxMonth = Math.max(0, ...months.map((m) => m.totalCm ?? 0));
          return (
            <section
              key={r.slug}
              className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    <Link
                      href={`/ski-webcams/${r.slug}`}
                      className="hover:text-[#e8c55a] transition"
                    >
                      {r.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    {r.town}, {r.region} · {r.country} — {win.label},{" "}
                    {win.startDate} to {win.endDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    {summary?.totalCm != null
                      ? `${summary.totalCm.toFixed(1)} cm`
                      : "Unavailable"}
                  </p>
                  <p className="text-xs text-white/45">
                    modelled season total (reanalysis)
                  </p>
                </div>
              </div>

              {summary == null ? (
                <p className="mt-6 text-sm text-white/60">
                  The modelled archive could not be fetched for {r.name} right
                  now — no total is shown rather than a guessed one. Try again
                  later.
                </p>
              ) : (
                <div className="mt-6 space-y-2.5">
                  {months.map((m) => (
                    <div key={m.month} className="flex items-center gap-3 text-sm">
                      <span className="w-20 shrink-0 text-white/60">{m.label}</span>
                      <div className="h-4 flex-1 rounded bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded bg-[#00E5FF]/70"
                          style={{
                            width: `${m.totalCm != null && maxMonth > 0 ? Math.max(2, (m.totalCm / maxMonth) * 100) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right text-white/75">
                        {m.totalCm != null ? `${m.totalCm.toFixed(1)} cm` : "—"}
                      </span>
                    </div>
                  ))}
                  <p className="pt-2 text-xs text-white/40">
                    Monthly breakdown from Open-Meteo ERA5 reanalysis
                    (modelled, not measured), fetched{" "}
                    {fetchedAt.toISOString().slice(11, 16)} UTC. The resort&apos;s
                    own snow report is the official word.
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-10 text-center text-sm text-white/45">
        Back to{" "}
        <Link href="/ski-webcams/my" className="font-semibold text-[#00E5FF] hover:underline">
          My Powder
        </Link>{" "}
        ·{" "}
        <Link
          href="/ski-webcams/storm-watch"
          className="font-semibold text-[#00E5FF] hover:underline"
        >
          Storm watch
        </Link>
      </p>
    </Shell>
  );
}
