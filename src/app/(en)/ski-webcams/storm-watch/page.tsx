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
  fetchForecastSnowfall,
  rankStormRows,
  STORM_WATCH_CAP,
  type SnowfallSummary,
} from "@/lib/ski/openmeteo";
import { SKI_RESORTS, getSkiResort, type SkiResort } from "@/lib/ski-resorts";
import { groupSkiResortsByRegion } from "@/lib/ski-directory";
import { SKI_PASS_NAMES, passesForResort, type SkiPassName } from "@/lib/ski-resort-passes";

export const metadata: Metadata = {
  title: "Storm Watch — Next 5 Days of Snow by Resort Group",
  description:
    "Powder Pass members: compare modelled next-5-days snowfall across a whole pass, your followed resorts, or a region, ranked wettest first.",
  robots: { index: false, follow: false },
};

type View =
  | { kind: "my"; label: string; resorts: SkiResort[] }
  | { kind: "pass"; label: string; resorts: SkiResort[] }
  | { kind: "region"; label: string; resorts: SkiResort[] };

function resolveView(
  params: { view?: string; pass?: string; region?: string },
  followed: SkiResort[],
): View {
  if (params.view === "pass" && (SKI_PASS_NAMES as readonly string[]).includes(params.pass ?? "")) {
    const pass = params.pass as SkiPassName;
    return {
      kind: "pass",
      label: pass,
      resorts: SKI_RESORTS.filter((r) => passesForResort(r.slug).includes(pass)),
    };
  }
  if (params.view === "region" && params.region) {
    const group = groupSkiResortsByRegion(SKI_RESORTS).find((g) => g.key === params.region);
    if (group) return { kind: "region", label: group.label, resorts: group.resorts };
  }
  if (params.view === "my" || !params.view) {
    return { kind: "my", label: "My resorts", resorts: followed };
  }
  return { kind: "my", label: "My resorts", resorts: followed };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/45 mb-10">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/ski-webcams" className="hover:text-white transition">Ski webcams</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">Storm watch</span>
        </nav>
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Snowflake className="w-3.5 h-3.5" /> STORM WATCH
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Where is the next storm headed?
          </h1>
          <p className="mt-4 text-white/55">
            Modelled snowfall for the next 5 days, compared across a whole
            group of resorts and ranked wettest first.
          </p>
        </div>
        {children}
      </div>
      <SiteFooter />
    </main>
  );
}

const chip =
  "px-3.5 py-1.5 rounded-full border text-sm font-semibold transition";
const chipOn = "border-[#D4AF37]/60 bg-[#D4AF37]/10 text-white";
const chipOff = "border-white/15 text-white/65 hover:bg-white/5";

export default async function StormWatchPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; pass?: string; region?: string }>;
}) {
  const params = await searchParams;
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            Storm watch is a Powder Pass feature: pick a pass, your followed
            resorts, or a region and see the next 5 days of modelled snowfall
            ranked across the whole group. Sign in to use it.
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
            Storm watch is a Powder Pass feature. Powder Pass is WorldEye&apos;s
            ski-only membership, and VIP Pro annual already includes it —
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

  const slugs = await listFollowedSlugs(userId).catch(() => [] as string[]);
  const followed = slugs
    .map((s) => getSkiResort(s))
    .filter((r): r is SkiResort => !!r);
  const view = resolveView(params, followed);
  const regions = groupSkiResortsByRegion(SKI_RESORTS);

  const truncated = view.resorts.length > STORM_WATCH_CAP;
  const capped = view.resorts.slice(0, STORM_WATCH_CAP);
  const fetchedAt = new Date();
  const rows = rankStormRows(
    await Promise.all(
      capped.map(async (resort) => ({
        resort,
        summary: (await fetchForecastSnowfall(resort.lat, resort.lng, {
          days: 5,
        })) as SnowfallSummary | null,
      })),
    ),
  );

  return (
    <Shell>
      {/* Group controls */}
      <div className="mt-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <Link
            href="/ski-webcams/storm-watch?view=my"
            className={`${chip} ${view.kind === "my" ? chipOn : chipOff}`}
          >
            My resorts ({followed.length})
          </Link>
          {SKI_PASS_NAMES.map((pass) => (
            <Link
              key={pass}
              href={`/ski-webcams/storm-watch?view=pass&pass=${encodeURIComponent(pass)}`}
              className={`${chip} ${view.kind === "pass" && view.label === pass ? chipOn : chipOff}`}
            >
              {pass}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-center">
          {regions.map((g) => (
            <Link
              key={g.key}
              href={`/ski-webcams/storm-watch?view=region&region=${encodeURIComponent(g.key)}`}
              className={`${chip} ${view.kind === "region" && view.label === g.label ? chipOn : chipOff}`}
            >
              {g.label} ({g.resorts.length})
            </Link>
          ))}
        </div>
      </div>

      <h2 className="mt-10 text-xl font-bold text-center">
        {view.label} — next 5 days
      </h2>
      <p className="mt-2 text-center text-sm text-white/45">
        All figures are modelled (Open-Meteo forecast at each resort&apos;s
        coordinates), fetched {fetchedAt.toISOString().slice(0, 16).replace("T", " ")} UTC
        — a forecast model, not a snow report.
      </p>
      {truncated && (
        <p className="mt-2 text-center text-sm text-white/45">
          This group has {view.resorts.length} resorts; showing the first{" "}
          {STORM_WATCH_CAP} so the page stays fast.
        </p>
      )}

      {view.kind === "my" && followed.length === 0 ? (
        <div className="mt-8 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            You haven&apos;t followed any resorts yet. Open any resort page and
            tap <strong className="text-white">Follow</strong>, or pick a pass
            or region above to compare a whole group right now.
          </p>
          <Link
            href="/ski-webcams"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Browse the ski resort directory
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-white/55">
                <th className="px-5 py-3 font-semibold">Resort</th>
                <th className="px-5 py-3 font-semibold">Modelled 5-day total</th>
                <th className="px-5 py-3 font-semibold">Wettest day</th>
                <th className="px-5 py-3 font-semibold">Resort page</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ resort: r, summary }) => (
                <tr key={r.slug} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3.5 font-semibold">{r.name}</td>
                  <td className="px-5 py-3.5 text-white/80">
                    {summary?.totalCm != null
                      ? `${summary.totalCm.toFixed(1)} cm (modelled)`
                      : "Unavailable — forecast fetch failed"}
                  </td>
                  <td className="px-5 py-3.5 text-white/65">
                    {summary?.wettest
                      ? `${summary.wettest.date}: ${summary.wettest.snowfallCm?.toFixed(1)} cm`
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/ski-webcams/${r.slug}`}
                      className="font-semibold text-[#00E5FF] hover:underline"
                    >
                      View cams
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-8 text-center text-sm text-white/45">
        Your dashboard:{" "}
        <Link href="/ski-webcams/my" className="font-semibold text-[#00E5FF] hover:underline">
          My Powder
        </Link>
      </p>
    </Shell>
  );
}
