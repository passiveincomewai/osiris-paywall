import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
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
import { getPassValueState } from "@/lib/ski/pass-value";
import {
  biggestMonth,
  snowiestResort,
  summariseLoggedDays,
  type ResortSeasonSnow,
} from "@/lib/ski/season-review";
import { getSkiResort, type SkiResort } from "@/lib/ski-resorts";

export const metadata: Metadata = {
  title: "Season in Review — Your Ski Season by the Numbers",
  description:
    "Powder Pass members: your logged ski days, your pass, and modelled season snowfall for the resorts you follow — your season in review.",
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
          <span className="text-white/80">Season in review</span>
        </nav>
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Trophy className="w-3.5 h-3.5" /> SEASON IN REVIEW
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Your season in review
          </h1>
          <p className="mt-4 text-white/55 leading-relaxed">
            Your logged days and your pass, alongside the modelled season
            snowfall at the resorts you follow.
          </p>
          <p className="mt-4 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-5 py-3 text-sm text-white/75">
            Snow figures are modelled (Open-Meteo reanalysis) — not measured.
            They come from the ERA5 weather model at each resort&apos;s
            coordinates, not from a snow stake or the resort&apos;s own report.
          </p>
        </div>
        {children}
      </div>
      <SiteFooter />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-white/55">{label}</p>
    </div>
  );
}

export default async function SeasonReviewPage() {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            Your season in review brings together the ski days you log and
            the modelled snowfall at the resorts you follow. Sign in to see
            yours.
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
            Season in review is a Powder Pass feature. Powder Pass is
            WorldEye&apos;s ski-only membership, and VIP includes it —
            Weekly and Monthly Pro do not.
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

  const [slugs, passState] = await Promise.all([
    listFollowedSlugs(userId).catch(() => [] as string[]),
    getPassValueState(userId).catch(() => null),
  ]);
  const resorts = slugs
    .map((s) => getSkiResort(s))
    .filter((r): r is SkiResort => !!r);

  const logged = summariseLoggedDays(passState?.days ?? []);
  const season = passState?.season ?? null;
  const summary = passState?.summary ?? null;

  const fetchedAt = new Date();
  const snowEntries: (ResortSeasonSnow & {
    windowLabel: string;
    windowRange: string;
  })[] = await Promise.all(
    resorts.map(async (resort) => {
      const win = seasonWindow(resort.lat, fetchedAt);
      const s = await fetchArchiveSnowfall(
        resort.lat,
        resort.lng,
        win.startDate,
        win.endDate,
      );
      return {
        slug: resort.slug,
        name: resort.name,
        totalCm: s?.totalCm ?? null,
        months: s ? monthlyBreakdown(s.days) : [],
        windowLabel: win.label,
        windowRange: `${win.startDate} to ${win.endDate}`,
      };
    }),
  );
  const snowiest = snowiestResort(snowEntries);
  const biggest = biggestMonth(snowEntries);

  return (
    <Shell>
      {/* (a) Their season by the numbers — their own logged data only. */}
      <section aria-label="Your season by the numbers" className="mt-12">
        <h2 className="text-xl font-bold text-center">Your season by the numbers</h2>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <Stat label="days skied (logged by you)" value={String(logged.daysLogged)} />
          <Stat
            label="different resorts in your logged days"
            value={String(logged.distinctResorts)}
          />
          <Stat label="resorts you follow" value={String(resorts.length)} />
          {season ? (
            <Stat label="your tracked pass" value={season.label} />
          ) : (
            <Stat label="your tracked pass" value="Not set up" />
          )}
        </div>
        {summary?.paidForItselfOnDay != null && (
          <p className="mt-6 text-center text-white/75">
            Based on your numbers, your {season?.label} pass paid for itself
            on day {summary.paidForItselfOnDay} — the day your logged days
            reached the break-even point from the pass cost and day-ticket
            price you entered.
          </p>
        )}
        {logged.daysLogged === 0 && (
          <div className="mt-6 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-white/70 leading-relaxed">
              You haven&apos;t logged any ski days yet, so this part of your
              review is still empty. Log your ski days in the pass-value
              tracker and they will count here.
            </p>
            <Link
              href="/ski-webcams/my/pass-value"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
            >
              Log your ski days
            </Link>
          </div>
        )}
        {!season && logged.daysLogged > 0 && (
          <p className="mt-6 text-center text-sm text-white/55">
            Add the pass you skied on in the{" "}
            <Link href="/ski-webcams/my/pass-value" className="font-semibold text-[#00E5FF] hover:underline">
              pass-value tracker
            </Link>{" "}
            to see it named here.
          </p>
        )}
      </section>

      {/* Zero follows → honest prompt, no snow sections to show. */}
      {resorts.length === 0 ? (
        <div className="mt-12 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            You haven&apos;t followed any resorts yet, so there is no
            snowfall to review. Follow a resort and its modelled season
            snowfall will appear here.
          </p>
          <Link
            href="/ski-webcams"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Browse the ski resort directory
          </Link>
        </div>
      ) : (
        <>
          {/* (c) Highlights — computed from (b), labelled modelled. */}
          {(snowiest || biggest) && (
            <section aria-label="Snow highlights" className="mt-14">
              <h2 className="text-xl font-bold text-center">
                Snow highlights <span className="text-sm font-normal text-white/45">(modelled)</span>
              </h2>
              <div className="mt-6 grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {snowiest && (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
                    <p className="text-3xl font-bold">
                      {snowiest.totalCm != null ? `${snowiest.totalCm.toFixed(1)} cm` : "—"}
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      Your snowiest followed resort: {snowiest.name} —
                      modelled season total (Open-Meteo reanalysis)
                    </p>
                  </div>
                )}
                {biggest && (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
                    <p className="text-3xl font-bold">{biggest.totalCm.toFixed(1)} cm</p>
                    <p className="mt-1 text-sm text-white/55">
                      Biggest single month: {biggest.label} at {biggest.name} —
                      modelled (Open-Meteo reanalysis)
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* (b) Per followed resort — modelled season totals. */}
          <section aria-label="Season snowfall by followed resort" className="mt-14">
            <h2 className="text-xl font-bold text-center">Season snowfall at your resorts</h2>
            <p className="mt-2 text-center text-sm text-white/55">
              Modelled (Open-Meteo reanalysis) — not measured. Fetched{" "}
              {fetchedAt.toISOString().slice(0, 16).replace("T", " ")} UTC.
            </p>
            <div className="mt-6 space-y-4 max-w-4xl mx-auto">
              {snowEntries.map((e) => (
                <div
                  key={e.slug}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-5"
                >
                  <div>
                    <p className="font-bold">
                      <Link href={`/ski-webcams/${e.slug}`} className="hover:text-[#e8c55a] transition">
                        {e.name}
                      </Link>
                    </p>
                    <p className="text-sm text-white/55">
                      {e.windowLabel}, {e.windowRange}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {e.totalCm != null ? `${e.totalCm.toFixed(1)} cm` : "Unavailable"}
                    </p>
                    <p className="text-xs text-white/45">modelled season total</p>
                  </div>
                </div>
              ))}
            </div>
            {snowEntries.every((e) => e.totalCm == null) && (
              <p className="mt-4 text-center text-sm text-white/60">
                The modelled archive could not be fetched for your resorts
                right now — no totals are shown rather than guessed ones.
                Try again later.
              </p>
            )}
          </section>
        </>
      )}

      <p className="mt-10 text-center text-sm text-white/45">
        Back to{" "}
        <Link href="/ski-webcams/my" className="font-semibold text-[#00E5FF] hover:underline">
          My Powder
        </Link>{" "}
        ·{" "}
        <Link href="/ski-webcams/my/season" className="font-semibold text-[#00E5FF] hover:underline">
          Season snowfall tracker
        </Link>{" "}
        ·{" "}
        <Link href="/ski-webcams/my/pass-value" className="font-semibold text-[#00E5FF] hover:underline">
          Pass-value tracker
        </Link>
      </p>
    </Shell>
  );
}
